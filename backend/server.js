const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const logger = require('./utils/logger');
const databaseManager = require('./config/database');
const { initializeDatabase } = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { generalRateLimit } = require('./middleware/rateLimiter');

// 导入路由
const apiRoutes = require('./routes/api');
const executeRoutes = require('./routes/execute');
const healthRoutes = require('./routes/health');
const historyRoutes = require('./routes/history');

const app = express();
const PORT = process.env.PORT || 3000;

// 安全中间件
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS配置
app.use(cors({
  origin: [
    'chrome-extension://*',
    'moz-extension://*',
    'http://localhost:8080',
    'http://localhost:3000',
    'http://localhost:3001',
    'https://localhost:8080',
    'https://localhost:3000',
    'https://localhost:3001'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 基础中间件
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 速率限制
app.use(generalRateLimit);

// 健康检查路由（不需要认证）
app.use('/health', healthRoutes);

// API路由
app.use('/api', apiRoutes);
app.use('/api/execute', executeRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/meu', require('./routes/meu'));

// 根路由
app.get('/', (req, res) => {
  res.json({
    name: 'Idea → MEU Backend',
    version: '1.0.0',
    description: '将想法转化为最小可执行单元的后端服务',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      api: '/api',
      execute: '/api/execute',
      history: '/api/history'
    }
  });
});

// 404处理
app.use(notFound);

// 错误处理中间件
app.use(errorHandler);

// 优雅关闭处理
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown(signal) {
  logger.info(`收到 ${signal} 信号，开始优雅关闭...`);
  
  server.close(() => {
    logger.info('HTTP服务器已关闭');
    
    // 关闭数据库连接
    if (global.dbConnection) {
      global.dbConnection.close(() => {
        logger.info('数据库连接已关闭');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
  
  // 强制退出（如果10秒内没有正常关闭）
  setTimeout(() => {
    logger.error('强制退出进程');
    process.exit(1);
  }, 10000);
}

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  logger.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('未处理的Promise拒绝:', reason);
  logger.error('Promise:', promise);
  process.exit(1);
});

// 启动服务器
async function startServer() {
  try {
    // 初始化数据库
    const dbResult = await initializeDatabase();
    
    // 启动HTTP服务器
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Idea → MEU 后端服务已启动`);
      logger.info(`📡 服务地址: http://localhost:${PORT}`);
      logger.info(`🌍 环境: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📊 健康检查: http://localhost:${PORT}/health`);
      
      // 显示数据库状态
      if (dbResult.type === 'mongodb') {
        logger.info('🗄️  数据库: MongoDB (持久化存储)');
      } else {
        logger.warn('⚠️  数据库: 内存存储 (重启后数据丢失)');
        if (dbResult.error) {
          logger.info('💡 MongoDB连接失败原因:', dbResult.error);
        }
        logger.info('💡 请配置 MONGODB_URI 以启用持久化存储');
      }
      
      // 检查AI服务配置
      if (!process.env.DEEPSEEK_API_KEY) {
        logger.warn('⚠️  DeepSeek API密钥未配置，将使用模拟模式');
        logger.info('💡 请在 .env 文件中设置 DEEPSEEK_API_KEY 以启用真实AI功能');
      } else {
        logger.info('🤖 DeepSeek AI服务已初始化');
      }
      
      if (process.env.NODE_ENV === 'development') {
        logger.info('🔧 开发模式已启用');
        logger.info('📝 API文档: http://localhost:' + PORT + '/api');
      }
    });
    
    // 保存服务器实例到全局变量
    global.server = server;
    
    return server;
    
  } catch (error) {
    logger.error('启动服务器失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件，则启动服务器
if (require.main === module) {
  startServer();
}

module.exports = app;