const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { aiRateLimit, executionRateLimit } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const aiService = require('../services/aiService');

// 应用执行速率限制
router.use(executionRateLimit);

// 存储执行结果的内存缓存（生产环境应使用Redis）
const executionCache = new Map();

// AI代码生成（使用真实的AI服务）
const generateCode = async (idea, language = 'python') => {
  return await aiService.generateCode(idea, language);
};

// 模拟代码执行
const executeCode = async (code, language, executionId) => {
  return new Promise((resolve) => {
    // 模拟执行时间
    const executionTime = Math.random() * 2000 + 500;
    
    setTimeout(() => {
      const success = Math.random() > 0.1; // 90%成功率
      
      if (success) {
        let output = '';
        
        // 根据代码内容生成模拟输出
        if (code.includes('print') || code.includes('console.log') || code.includes('echo')) {
          if (code.includes('Hello')) {
            output = 'Hello, World!';
          } else if (code.includes('时间') || code.includes('date') || code.includes('Date')) {
            output = new Date().toLocaleString('zh-CN');
          } else if (code.includes('随机') || code.includes('random') || code.includes('Random')) {
            output = `随机数: ${Math.floor(Math.random() * 100) + 1}`;
          } else if (code.includes('计算') || code.includes('result')) {
            output = '结果: 4';
          } else if (code.includes('文件') || code.includes('file')) {
            output = '文件已创建';
          } else {
            output = '代码执行成功';
          }
        } else {
          output = '代码执行完成';
        }
        
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
        resolve({
          success: false,
          output: '',
          error: '执行错误: 模拟的执行失败',
          exitCode: 1,
          executionTime: Math.round(executionTime),
          resourceUsage: {
            cpu: '5%',
            memory: '20MB',
            duration: `${Math.round(executionTime)}ms`
          }
        });
      }
    }, executionTime);
  });
};

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
  const startTime = Date.now();
  
  logger.info('开始执行想法', {
    executionId,
    idea: idea.substring(0, 100),
    language,
    options
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
    
    // 2. 执行代码
    const executionResult = await executeCode(codeGeneration.code, language, executionId);
    
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
    
    // 存储到缓存（生产环境应存储到数据库）
    executionCache.set(executionId, executionRecord);
    
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