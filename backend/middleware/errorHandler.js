const logger = require('../utils/logger');

// 错误处理中间件
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // 记录错误日志
  logger.error('API错误', {
    error: error.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Mongoose错误处理
  if (err.name === 'CastError') {
    const message = '资源未找到';
    error = createError(404, message);
  }

  // Mongoose重复键错误
  if (err.code === 11000) {
    const message = '资源已存在';
    error = createError(400, message);
  }

  // Mongoose验证错误
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = createError(400, message);
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    const message = '无效的访问令牌';
    error = createError(401, message);
  }

  // JWT过期错误
  if (err.name === 'TokenExpiredError') {
    const message = '访问令牌已过期';
    error = createError(401, message);
  }

  // 文件上传错误
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = '文件大小超出限制';
    error = createError(400, message);
  }

  // OpenAI API错误
  if (err.response && err.response.data) {
    const message = 'AI服务暂时不可用';
    error = createError(503, message);
  }

  // Docker执行错误
  if (err.code === 'DOCKER_ERROR') {
    const message = '代码执行环境错误';
    error = createError(500, message);
  }

  // 速率限制错误
  if (err.statusCode === 429) {
    const message = '请求过于频繁，请稍后再试';
    error = createError(429, message);
  }

  res.status(error.statusCode || 500).json({
    success: false,
    error: {
      message: error.message || '服务器内部错误',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
};

// 404错误处理
const notFound = (req, res, next) => {
  const message = `路径 ${req.originalUrl} 未找到`;
  logger.warn('404错误', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip
  });
  
  res.status(404).json({
    success: false,
    error: {
      message,
      statusCode: 404
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
};

// 异步错误包装器
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// 创建自定义错误
const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

// 验证错误
const createValidationError = (message) => {
  return createError(400, message);
};

// 认证错误
const createAuthError = (message = '未授权访问') => {
  return createError(401, message);
};

// 权限错误
const createForbiddenError = (message = '权限不足') => {
  return createError(403, message);
};

// 未找到错误
const createNotFoundError = (message = '资源未找到') => {
  return createError(404, message);
};

// 冲突错误
const createConflictError = (message = '资源冲突') => {
  return createError(409, message);
};

// 服务器错误
const createServerError = (message = '服务器内部错误') => {
  return createError(500, message);
};

// 服务不可用错误
const createServiceUnavailableError = (message = '服务暂时不可用') => {
  return createError(503, message);
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler,
  createError,
  createValidationError,
  createAuthError,
  createForbiddenError,
  createNotFoundError,
  createConflictError,
  createServerError,
  createServiceUnavailableError
};