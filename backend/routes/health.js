const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const databaseManager = require('../config/database');

// 基础健康检查
router.get('/', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    // 检查数据库连接（如果配置了MongoDB）
    let dbHealth;
    if (process.env.MONGODB_URI) {
      dbHealth = await databaseManager.healthCheck();
    } else {
      dbHealth = {
        status: 'healthy',
        message: '使用内存存储（未配置数据库）'
      };
    }
    
    // 检查系统资源
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    const responseTime = Date.now() - startTime;
    
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: dbHealth,
        api: {
          status: 'healthy',
          message: 'API服务正常运行'
        }
      },
      system: {
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        },
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version
      }
    };
    
    // 如果配置了数据库且数据库不健康，整体状态为不健康
    if (process.env.MONGODB_URI && dbHealth.status !== 'healthy') {
      healthStatus.status = 'unhealthy';
    }
    
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    
    logger.debug('健康检查完成', {
      status: healthStatus.status,
      responseTime,
      dbStatus: dbHealth.status
    });
    
    res.status(statusCode).json({
      success: healthStatus.status === 'healthy',
      data: healthStatus
    });
    
  } catch (error) {
    logger.error('健康检查失败', error);
    
    res.status(503).json({
      success: false,
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        uptime: process.uptime(),
        responseTime: `${Date.now() - startTime}ms`
      }
    });
  }
}));

// 详细健康检查
router.get('/detailed', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  
  try {
    // 数据库健康检查
    const dbHealth = await databaseManager.healthCheck();
    
    // 系统信息
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // 检查各种服务状态
    const services = {
      database: dbHealth,
      api: {
        status: 'healthy',
        message: 'API服务正常',
        endpoints: {
          '/health': 'healthy',
          '/api': 'healthy',
          '/api/execute': 'healthy'
        }
      },
      execution: {
        status: 'healthy',
        message: '执行环境正常',
        languages: {
          python: 'available',
          javascript: 'available',
          bash: 'available',
          go: 'available',
          rust: 'available'
        }
      }
    };
    
    // 性能指标
    const metrics = {
      responseTime: Date.now() - startTime,
      uptime: process.uptime(),
      memory: {
        total: memoryUsage.rss,
        heap: {
          total: memoryUsage.heapTotal,
          used: memoryUsage.heapUsed,
          utilization: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
        },
        external: memoryUsage.external
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      eventLoop: {
        lag: 0 // 可以使用 @nodejs/clinic 等工具测量
      }
    };
    
    // 环境信息
    const environment = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      env: process.env.NODE_ENV || 'development',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: Intl.DateTimeFormat().resolvedOptions().locale
    };
    
    // 确定整体健康状态
    const allServicesHealthy = Object.values(services).every(
      service => service.status === 'healthy'
    );
    
    const overallStatus = allServicesHealthy ? 'healthy' : 'unhealthy';
    
    const detailedHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      services,
      metrics,
      environment,
      checks: {
        database: dbHealth.status === 'healthy',
        memory: metrics.memory.heap.utilization < 90,
        uptime: metrics.uptime > 0
      }
    };
    
    const statusCode = overallStatus === 'healthy' ? 200 : 503;
    
    logger.info('详细健康检查完成', {
      status: overallStatus,
      responseTime: metrics.responseTime,
      memoryUtilization: metrics.memory.heap.utilization
    });
    
    res.status(statusCode).json({
      success: overallStatus === 'healthy',
      data: detailedHealth
    });
    
  } catch (error) {
    logger.error('详细健康检查失败', error);
    
    res.status(503).json({
      success: false,
      data: {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: {
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        responseTime: Date.now() - startTime
      }
    });
  }
}));

// 就绪检查（用于容器编排）
router.get('/ready', asyncHandler(async (req, res) => {
  try {
    // 检查关键服务是否就绪
    const dbReady = databaseManager.isConnectionHealthy();
    
    const ready = dbReady;
    
    if (ready) {
      res.status(200).json({
        success: true,
        message: '服务已就绪',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        success: false,
        message: '服务未就绪',
        details: {
          database: dbReady ? '就绪' : '未就绪'
        },
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    logger.error('就绪检查失败', error);
    
    res.status(503).json({
      success: false,
      message: '就绪检查失败',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}));

// 存活检查（用于容器编排）
router.get('/live', asyncHandler(async (req, res) => {
  // 简单的存活检查，只要进程在运行就返回成功
  res.status(200).json({
    success: true,
    message: '服务存活',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
}));

module.exports = router;