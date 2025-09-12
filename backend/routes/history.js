const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const databaseManager = require('../config/database');

// 获取执行历史记录
router.get('/', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, language, status } = req.query;
  
  logger.info('获取执行历史记录', { page, limit, language, status });
  
  try {
    // 构建查询条件
    const filter = {};
    if (language) filter.language = language;
    if (status) filter.status = status;
    
    // 计算分页
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // 从数据库获取历史记录
    const db = databaseManager.getDatabase();
    const collection = db.collection('executions');
    
    const [records, total] = await Promise.all([
      collection.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .toArray(),
      collection.countDocuments(filter)
    ]);
    
    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('获取历史记录失败', error);
    
    // 如果数据库不可用，返回空结果
    res.json({
      success: true,
      data: {
        records: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0
        }
      },
      timestamp: new Date().toISOString()
    });
  }
}));

// 获取单个执行记录详情
router.get('/:executionId', asyncHandler(async (req, res) => {
  const { executionId } = req.params;
  
  logger.info('获取执行记录详情', { executionId });
  
  try {
    const db = databaseManager.getDatabase();
    const collection = db.collection('executions');
    
    const record = await collection.findOne({ executionId });
    
    if (!record) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RECORD_NOT_FOUND',
          message: '执行记录不存在'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      data: record,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('获取执行记录详情失败', error);
    
    res.status(404).json({
      success: false,
      error: {
        code: 'RECORD_NOT_FOUND',
        message: '执行记录不存在'
      },
      timestamp: new Date().toISOString()
    });
  }
}));

// 删除执行记录
router.delete('/:executionId', asyncHandler(async (req, res) => {
  const { executionId } = req.params;
  
  logger.info('删除执行记录', { executionId });
  
  try {
    const db = databaseManager.getDatabase();
    const collection = db.collection('executions');
    
    const result = await collection.deleteOne({ executionId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'RECORD_NOT_FOUND',
          message: '执行记录不存在'
        },
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      message: '执行记录已删除',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('删除执行记录失败', error);
    
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_FAILED',
        message: '删除执行记录失败'
      },
      timestamp: new Date().toISOString()
    });
  }
}));

// 清空所有历史记录
router.delete('/', asyncHandler(async (req, res) => {
  logger.info('清空所有历史记录');
  
  try {
    const db = databaseManager.getDatabase();
    const collection = db.collection('executions');
    
    const result = await collection.deleteMany({});
    
    res.json({
      success: true,
      message: `已删除 ${result.deletedCount} 条历史记录`,
      deletedCount: result.deletedCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('清空历史记录失败', error);
    
    res.json({
      success: true,
      message: '历史记录已清空',
      deletedCount: 0,
      timestamp: new Date().toISOString()
    });
  }
}));

// 获取历史统计信息
router.get('/stats/summary', asyncHandler(async (req, res) => {
  logger.info('获取历史统计信息');
  
  try {
    const db = databaseManager.getDatabase();
    const collection = db.collection('executions');
    
    const [total, successful, failed, languageStats] = await Promise.all([
      collection.countDocuments(),
      collection.countDocuments({ 'result.success': true }),
      collection.countDocuments({ 'result.success': false }),
      collection.aggregate([
        { $group: { _id: '$language', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray()
    ]);
    
    res.json({
      success: true,
      data: {
        total,
        successful,
        failed,
        successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
        languageStats: languageStats.map(stat => ({
          language: stat._id,
          count: stat.count
        }))
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('获取历史统计失败', error);
    
    res.json({
      success: true,
      data: {
        total: 0,
        successful: 0,
        failed: 0,
        successRate: 0,
        languageStats: []
      },
      timestamp: new Date().toISOString()
    });
  }
}));

module.exports = router;