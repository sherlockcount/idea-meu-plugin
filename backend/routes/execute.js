const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { aiRateLimit, executionRateLimit } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const aiService = require('../services/aiService');
const dockerService = require('../services/dockerService');
const databaseManager = require('../config/database');
const fs = require('fs').promises;
const path = require('path');

// 应用执行速率限制
router.use(executionRateLimit);

// 存储执行结果的内存缓存（生产环境应使用Redis）
const executionCache = new Map();

// AI代码生成（使用真实的AI服务）
const generateCode = async (idea, language = 'python') => {
  return await aiService.generateCode(idea, language);
};

// Docker容器中执行代码
const executeCode = async (code, language, executionId, projectId, stepId) => {
  const startTime = Date.now();
  let containerName = null;
  
  try {
    // 创建项目目录
    const projectDir = process.env.DOCKER_EXECUTION === 'true'
      ? path.join('/app', 'projects', projectId)
      : path.join(__dirname, '../projects', projectId);
    
    logger.info('创建项目目录', { projectDir, projectId, stepId });
    await fs.mkdir(projectDir, { recursive: true });
    
    // 写入代码文件
    const fileExtension = getFileExtension(language);
    const codeFileName = `step_${stepId}.${fileExtension}`;
    const codeFilePath = path.join(projectDir, codeFileName);
    await fs.writeFile(codeFilePath, code, 'utf8');
    
    logger.info('代码文件已写入', { codeFilePath, codeFileName });
    
    // 创建执行容器
    containerName = await dockerService.createExecutionContainer(projectId, stepId);
    
    // 在容器中执行代码
    const result = await dockerService.executeInContainer(
      containerName,
      language,
      projectId,
      stepId,
      codeFileName
    );
    
    const executionTime = Date.now() - startTime;
    
    return {
      success: result.success,
      output: result.output || (result.success ? '代码执行完成，但无输出' : ''),
      error: result.error || null,
      executionTime,
      status: result.status,
      containerName
    };
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    logger.error('Docker执行失败', {
      executionId,
      projectId,
      stepId,
      error: error.message,
      executionTime
    });
    
    return {
      success: false,
      output: '',
      error: `执行失败: ${error.message}`,
      executionTime
    };
  } finally {
    // 清理容器
    if (containerName) {
      setTimeout(() => {
        dockerService.stopContainer(containerName).catch(err => {
          logger.warn('容器清理失败', { containerName, error: err.message });
        });
      }, 5000); // 5秒后清理容器
    }
  }
};

// 获取文件扩展名
const getFileExtension = (language) => {
  const extensions = {
    python: 'py',
    javascript: 'js',
    java: 'java',
    go: 'go',
    cpp: 'cpp',
    c: 'c'
  };
  return extensions[language] || 'txt';
};

// 兼容旧版本的模拟执行（作为备用）
const simulateExecution = async (code, language) => {
  return new Promise((resolve) => {
    const executionTime = Math.random() * 1000 + 200;
    
    setTimeout(() => {
      let output = '';
      
      if (code.includes('print') || code.includes('console.log') || code.includes('echo')) {
        if (code.includes('Hello')) {
          output = 'Hello, World!';
        } else if (code.includes('时间') || code.includes('date') || code.includes('Date')) {
          output = new Date().toLocaleString('zh-CN');
        } else {
          output = '代码执行成功';
        }
      } else {
        output = '代码执行完成';
      }
      
      // 模拟成功和失败的情况
      const shouldSucceed = Math.random() > 0.1; // 90%成功率
      
      if (shouldSucceed) {
        resolve({
          success: true,
          output,
          error: null,
          exitCode: 0,
          executionTime: Math.round(executionTime),
          resourceUsage: {
            cpu: `${Math.floor(Math.random() * 50 + 10)}%`,
            memory: `${Math.floor(Math.random() * 100 + 50)}MB`,
            duration: `${Math.round(executionTime)}ms`
          }
        });
      } else {
        // 模拟各种失败情况
        const errorTypes = [
          '语法错误: 代码存在语法问题',
          '运行时错误: 变量未定义',
          '内存错误: 内存不足',
          '超时错误: 执行时间过长',
          '权限错误: 访问被拒绝'
        ];
        const randomError = errorTypes[Math.floor(Math.random() * errorTypes.length)];
        
        resolve({
          success: false,
          output: '',
          error: `执行失败: ${randomError}`,
          exitCode: Math.floor(Math.random() * 3) + 1, // 1-3的错误码
          executionTime: Math.round(executionTime),
          resourceUsage: {
            cpu: `${Math.floor(Math.random() * 20 + 5)}%`,
            memory: `${Math.floor(Math.random() * 50 + 20)}MB`,
            duration: `${Math.round(executionTime)}ms`
          }
        });
      }
    }, executionTime);
  });
};

/**
 * @swagger
 * /api/execute:
 *   post:
 *     tags: [Code Execution]
 *     summary: 执行想法代码
 *     description: 根据用户提供的想法生成代码并执行，返回执行结果
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExecutionRequest'
 *     responses:
 *       200:
 *         description: 执行成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ExecutionResult'
 *       400:
 *         description: 请求参数错误或想法无效
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: 请求频率过高
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// 执行想法
router.post('/', executionRateLimit, asyncHandler(async (req, res) => {
  const { idea, language = 'python', options = {} } = req.body;
  
  if (!idea || !idea.trim()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_IDEA',
        message: '请提供想法描述'
      }
    });
  }
  
  const executionId = uuidv4();
  const projectId = options.projectId || uuidv4();
  const stepId = options.stepId || '1';
  const startTime = Date.now();
  
  logger.info('开始执行想法', {
    executionId,
    idea: idea.substring(0, 100),
    language,
    options,
    projectId,
    stepId
  });
  
  try {
    // 验证想法
    const validation = await aiService.validateIdea(idea, language);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_IDEA',
          message: validation.message,
          suggestions: validation.suggestions
        }
      });
    }
    
    // 1. AI生成代码
    const codeGeneration = await generateCode(idea, language);
    
    // 2. 检查Docker服务是否可用并执行代码
    let dockerAvailable = true;
    try {
      await dockerService.checkDockerAvailability();
    } catch (error) {
      dockerAvailable = false;
      logger.warn('Docker不可用', { error: error.message });
    }
    let executionResult;
    
    if (dockerAvailable) {
      // 使用Docker容器执行
      executionResult = await executeCode(codeGeneration.code, language, executionId, projectId, stepId);
      logger.info('Docker容器执行完成', {
        executionId,
        success: executionResult.success,
        containerName: executionResult.containerName
      });
    } else {
      // 降级到模拟执行
      logger.warn('Docker不可用，使用模拟执行', { executionId });
      executionResult = await simulateExecution(codeGeneration.code, language);
      executionResult.fallback = true;
    }
    
    const totalTime = Date.now() - startTime;
    
    // 3. 保存执行记录
    const executionRecord = {
      id: executionId,
      idea,
      language,
      code: codeGeneration.code,
      explanation: codeGeneration.explanation,
      confidence: codeGeneration.confidence,
      result: executionResult,
      timestamp: new Date().toISOString(),
      totalTime,
      status: executionResult.success ? 'completed' : 'failed',
      aiMetadata: codeGeneration.metadata
    };
    
    // 存储到缓存
    executionCache.set(executionId, executionRecord);
    
    // 保存到数据库
    try {
      const db = databaseManager.getDatabase();
      const collection = db.collection('executions');
      await collection.insertOne({
        ...executionRecord,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      logger.info('执行记录已保存到数据库', { executionId });
    } catch (dbError) {
      logger.warn('保存执行记录到数据库失败', { executionId, error: dbError.message });
    }
    
    logger.logExecution({
      id: executionId,
      language,
      status: executionRecord.status,
      duration: totalTime,
      exitCode: executionResult.exitCode,
      aiModel: codeGeneration.model
    });
    
    res.json({
      success: true,
      data: {
        executionId,
        idea,
        language,
        code: codeGeneration.code,
        explanation: codeGeneration.explanation,
        confidence: codeGeneration.confidence,
        result: executionResult,
        totalTime,
        status: executionRecord.status,
        aiMetadata: codeGeneration.metadata
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('执行想法失败', {
      executionId,
      idea: idea.substring(0, 100),
      language,
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: {
        code: 'EXECUTION_FAILED',
        message: '执行失败',
        details: error.message
      },
      data: {
        executionId,
        idea,
        language,
        status: 'failed',
        totalTime: Date.now() - startTime
      },
      timestamp: new Date().toISOString()
    });
  }
}));

/**
 * @swagger
 * /api/execute/{executionId}:
 *   get:
 *     tags: [Code Execution]
 *     summary: 获取执行结果
 *     description: 根据执行ID获取特定的执行结果详情
 *     parameters:
 *       - in: path
 *         name: executionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 执行任务的唯一标识符
 *         example: '123e4567-e89b-12d3-a456-426614174000'
 *     responses:
 *       200:
 *         description: 成功获取执行结果
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ExecutionResult'
 *       404:
 *         description: 执行记录不存在
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// 获取执行结果
router.get('/:executionId', asyncHandler(async (req, res) => {
  const { executionId } = req.params;
  
  const executionRecord = executionCache.get(executionId);
  
  if (!executionRecord) {
    return res.status(404).json({
      success: false,
      error: {
        message: '执行记录未找到',
        statusCode: 404
      }
    });
  }
  
  logger.info('获取执行结果', { executionId });
  
  res.json({
    success: true,
    data: executionRecord,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/execute:
 *   get:
 *     tags: [Code Execution]
 *     summary: 获取执行历史列表
 *     description: 获取用户的执行历史记录，支持分页和筛选
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: 每页记录数
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *         description: 按编程语言筛选
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [success, error, pending]
 *         description: 按执行状态筛选
 *     responses:
 *       200:
 *         description: 成功获取执行历史
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ExecutionResult'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */
// 获取执行历史
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, language, status } = req.query;
  
  logger.info('获取执行历史', { page, limit, language, status });
  
  // 从缓存获取所有记录（生产环境应从数据库分页查询）
  let records = Array.from(executionCache.values());
  
  // 过滤
  if (language) {
    records = records.filter(record => record.language === language);
  }
  
  if (status) {
    records = records.filter(record => record.status === status);
  }
  
  // 排序（最新的在前）
  records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  // 分页
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedRecords = records.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: paginatedRecords,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: records.length,
      pages: Math.ceil(records.length / limit)
    },
    timestamp: new Date().toISOString()
  });
}));

// 删除执行记录
router.delete('/:executionId', asyncHandler(async (req, res) => {
  const { executionId } = req.params;
  
  const deleted = executionCache.delete(executionId);
  
  if (!deleted) {
    return res.status(404).json({
      success: false,
      error: {
        message: '执行记录未找到',
        statusCode: 404
      }
    });
  }
  
  logger.info('删除执行记录', { executionId });
  
  res.json({
    success: true,
    message: '执行记录已删除',
    timestamp: new Date().toISOString()
  });
}));

// 清空执行历史
router.delete('/', asyncHandler(async (req, res) => {
  const count = executionCache.size;
  executionCache.clear();
  
  logger.info('清空执行历史', { deletedCount: count });
  
  res.json({
    success: true,
    message: `已清空 ${count} 条执行记录`,
    deletedCount: count,
    timestamp: new Date().toISOString()
  });
}));

module.exports = router;