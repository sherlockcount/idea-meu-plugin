const express = require('express');
const router = express.Router();
const meuService = require('../services/meuService');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * @route POST /api/meu/analyze
 * @desc 分析想法并生成MEU计划
 * @access Public
 */
router.post('/analyze', asyncHandler(async (req, res) => {
  const { idea, language = 'python' } = req.body;

  if (!idea || idea.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: '请提供想法描述'
    });
  }

  logger.info('收到MEU分析请求', { idea, language });

  const result = await meuService.analyzeMEU(idea, language);

  res.json({
    success: true,
    message: 'MEU计划生成成功',
    data: result
  });
}));

/**
 * @route POST /api/meu/execute/:projectId/:stepId
 * @desc 执行MEU步骤
 * @access Public
 */
router.post('/execute/:projectId/:stepId', asyncHandler(async (req, res) => {
  const { projectId, stepId } = req.params;
  const stepIdNum = parseInt(stepId);

  if (!projectId || isNaN(stepIdNum)) {
    return res.status(400).json({
      success: false,
      message: '无效的项目ID或步骤ID'
    });
  }

  logger.info('收到MEU步骤执行请求', { projectId, stepId: stepIdNum });

  const result = await meuService.executeMEUStep(projectId, stepIdNum);

  res.json({
    success: true,
    message: 'MEU步骤执行成功',
    data: result
  });
}));

/**
 * @route GET /api/meu/status/:projectId
 * @desc 获取MEU项目状态
 * @access Public
 */
router.get('/status/:projectId', asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  if (!projectId) {
    return res.status(400).json({
      success: false,
      message: '请提供项目ID'
    });
  }

  logger.info('收到MEU状态查询请求', { projectId });

  const status = await meuService.getMEUStatus(projectId);

  res.json({
    success: true,
    message: 'MEU状态获取成功',
    data: status
  });
}));

/**
 * @route GET /api/meu/projects
 * @desc 获取所有MEU项目列表
 * @access Public
 */
router.get('/projects', asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  
  logger.info('收到MEU项目列表请求', { page, limit });

  // 这里应该实现项目列表获取逻辑
  // 暂时返回空列表
  res.json({
    success: true,
    message: 'MEU项目列表获取成功',
    data: {
      projects: [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: 0,
        pages: 0
      }
    }
  });
}));

/**
 * @route DELETE /api/meu/project/:projectId
 * @desc 删除MEU项目
 * @access Public
 */
router.delete('/project/:projectId', asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  if (!projectId) {
    return res.status(400).json({
      success: false,
      message: '请提供项目ID'
    });
  }

  logger.info('收到MEU项目删除请求', { projectId });

  // 这里应该实现项目删除逻辑
  // 暂时返回成功响应
  res.json({
    success: true,
    message: 'MEU项目删除成功'
  });
}));

/**
 * @route POST /api/meu/continue/:projectId
 * @desc 继续执行MEU项目的下一步
 * @access Public
 */
router.post('/continue/:projectId', asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { autoExecute = false } = req.body;

  if (!projectId) {
    return res.status(400).json({
      success: false,
      message: '请提供项目ID'
    });
  }

  logger.info('收到MEU项目继续请求', { projectId, autoExecute });

  // 获取项目状态
  const status = await meuService.getMEUStatus(projectId);
  
  // 找到下一个未完成的步骤
  const nextStep = status.steps.find(step => !step.completed);
  
  if (!nextStep) {
    return res.json({
      success: true,
      message: 'MEU项目已完成',
      data: {
        projectId,
        status: 'completed',
        allStepsCompleted: true
      }
    });
  }

  let result = {
    projectId,
    nextStep,
    status: 'ready'
  };

  // 如果设置了自动执行，则执行下一步
  if (autoExecute) {
    const executionResult = await meuService.executeMEUStep(projectId, nextStep.id);
    result = {
      ...result,
      execution: executionResult,
      status: 'executed'
    };
  }

  res.json({
    success: true,
    message: autoExecute ? 'MEU步骤执行成功' : '获取下一步成功',
    data: result
  });
}));

/**
 * @route POST /api/meu/modify/:projectId/:stepId
 * @desc 修改MEU步骤
 * @access Public
 */
router.post('/modify/:projectId/:stepId', asyncHandler(async (req, res) => {
  const { projectId, stepId } = req.params;
  const { modification } = req.body;
  const stepIdNum = parseInt(stepId);

  if (!projectId || isNaN(stepIdNum) || !modification) {
    return res.status(400).json({
      success: false,
      message: '请提供有效的项目ID、步骤ID和修改内容'
    });
  }

  logger.info('收到MEU步骤修改请求', { projectId, stepId: stepIdNum, modification });

  // 这里应该实现步骤修改逻辑
  // 暂时返回成功响应
  res.json({
    success: true,
    message: 'MEU步骤修改成功',
    data: {
      projectId,
      stepId: stepIdNum,
      modification,
      status: 'modified'
    }
  });
}));

/**
 * @route GET /api/meu/files/:projectId
 * @desc 获取MEU项目生成的文件列表
 * @access Public
 */
router.get('/files/:projectId', asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  if (!projectId) {
    return res.status(400).json({
      success: false,
      message: '请提供项目ID'
    });
  }

  logger.info('收到MEU文件列表请求', { projectId });

  // 这里应该实现文件列表获取逻辑
  // 暂时返回空列表
  res.json({
    success: true,
    message: 'MEU文件列表获取成功',
    data: {
      projectId,
      files: []
    }
  });
}));

/**
 * @route GET /api/meu/download/:projectId
 * @desc 下载MEU项目文件
 * @access Public
 */
router.get('/download/:projectId', asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { format = 'zip' } = req.query;

  if (!projectId) {
    return res.status(400).json({
      success: false,
      message: '请提供项目ID'
    });
  }

  logger.info('收到MEU项目下载请求', { projectId, format });

  // 这里应该实现项目文件打包下载逻辑
  // 暂时返回提示信息
  res.json({
    success: false,
    message: '下载功能正在开发中',
    data: {
      projectId,
      format,
      status: 'not_implemented'
    }
  });
}));

module.exports = router;