const { RateLimiterMemory } = require('rate-limiter-flexible');
const logger = require('../utils/logger');

// 通用速率限制器 - 每分钟60次请求
const generalLimiter = new RateLimiterMemory({
  keyGenerator: (req) => getClientId(req),
  points: 60, // 请求次数
  duration: 60, // 时间窗口（秒）
  blockDuration: 60, // 阻塞时间（秒）
});

// 执行API速率限制器 - 每分钟10次请求
const executionLimiter = new RateLimiterMemory({
  keyGenerator: (req) => getClientId(req),
  points: 10,
  duration: 60,
  blockDuration: 300, // 5分钟阻塞
});

// AI API速率限制器 - 每分钟20次请求
const aiLimiter = new RateLimiterMemory({
  keyGenerator: (req) => getClientId(req),
  points: 20,
  duration: 60,
  blockDuration: 180, // 3分钟阻塞
});

// 获取客户端标识
function getClientId(req) {
  // 优先使用用户ID，其次使用IP地址
  return req.user?.id || req.ip || req.connection.remoteAddress || 'unknown';
}

// 通用速率限制中间件
const rateLimitMiddleware = (limiter, name = '通用') => {
  return async (req, res, next) => {
    try {
      const clientId = getClientId(req);
      await limiter.consume(clientId);
      
      // 添加速率限制头信息
      const resRateLimiter = await limiter.get(clientId);
      if (resRateLimiter) {
        res.set({
          'X-RateLimit-Limit': limiter.points,
          'X-RateLimit-Remaining': resRateLimiter.remainingPoints || 0,
          'X-RateLimit-Reset': new Date(Date.now() + resRateLimiter.msBeforeNext)
        });
      }
      
      next();
    } catch (rejRes) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      
      logger.logSecurity('速率限制触发', {
        limiter: name,
        clientId: getClientId(req),
        url: req.originalUrl,
        method: req.method,
        retryAfter: secs
      });
      
      res.set({
        'Retry-After': secs,
        'X-RateLimit-Limit': limiter.points,
        'X-RateLimit-Remaining': 0,
        'X-RateLimit-Reset': new Date(Date.now() + rejRes.msBeforeNext)
      });
      
      res.status(429).json({
        success: false,
        error: {
          message: `请求过于频繁，请在 ${secs} 秒后重试`,
          statusCode: 429,
          retryAfter: secs
        },
        timestamp: new Date().toISOString()
      });
    }
  };
};

// 具体的限制中间件
const generalRateLimit = rateLimitMiddleware(generalLimiter, '通用API');
const executionRateLimit = rateLimitMiddleware(executionLimiter, '执行API');
const aiRateLimit = rateLimitMiddleware(aiLimiter, 'AI API');

// 重置速率限制
const resetRateLimit = async (clientId, limiterType = 'general') => {
  try {
    let limiter;
    switch (limiterType) {
      case 'execution':
        limiter = executionLimiter;
        break;
      case 'ai':
        limiter = aiLimiter;
        break;
      default:
        limiter = generalLimiter;
    }
    
    await limiter.delete(clientId);
    logger.info('速率限制已重置', { clientId, limiterType });
    return true;
  } catch (error) {
    logger.error('重置速率限制失败', { clientId, limiterType, error: error.message });
    return false;
  }
};

// 获取速率限制状态
const getRateLimitStatus = async (clientId, limiterType = 'general') => {
  try {
    let limiter;
    switch (limiterType) {
      case 'execution':
        limiter = executionLimiter;
        break;
      case 'ai':
        limiter = aiLimiter;
        break;
      default:
        limiter = generalLimiter;
    }
    
    const res = await limiter.get(clientId);
    if (!res) {
      return {
        limit: limiter.points,
        remaining: limiter.points,
        reset: null,
        blocked: false
      };
    }
    
    return {
      limit: limiter.points,
      remaining: res.remainingPoints || 0,
      reset: new Date(Date.now() + res.msBeforeNext),
      blocked: res.remainingPoints <= 0
    };
  } catch (error) {
    logger.error('获取速率限制状态失败', { clientId, limiterType, error: error.message });
    return null;
  }
};

// 白名单中间件（跳过速率限制）
const whitelist = (ips = []) => {
  const whitelistIps = new Set([
    '127.0.0.1',
    '::1',
    'localhost',
    ...ips
  ]);
  
  return (req, res, next) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    if (whitelistIps.has(clientIp)) {
      logger.debug('白名单IP跳过速率限制', { ip: clientIp });
      return next();
    }
    next();
  };
};

// 动态速率限制（根据用户等级调整）
const dynamicRateLimit = (getUserLevel) => {
  return async (req, res, next) => {
    try {
      const userLevel = await getUserLevel(req);
      let points = 60; // 默认限制
      
      switch (userLevel) {
        case 'premium':
          points = 200;
          break;
        case 'pro':
          points = 120;
          break;
        case 'basic':
          points = 60;
          break;
        default:
          points = 30; // 未认证用户
      }
      
      const dynamicLimiter = new RateLimiterMemory({
        keyGenerator: (req) => getClientId(req),
        points,
        duration: 60,
        blockDuration: 60,
      });
      
      await dynamicLimiter.consume(getClientId(req));
      next();
    } catch (rejRes) {
      const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
      res.status(429).json({
        success: false,
        error: {
          message: `请求过于频繁，请在 ${secs} 秒后重试`,
          statusCode: 429,
          retryAfter: secs
        }
      });
    }
  };
};

module.exports = {
  generalRateLimit,
  executionRateLimit,
  aiRateLimit,
  resetRateLimit,
  getRateLimitStatus,
  whitelist,
  dynamicRateLimit,
  rateLimitMiddleware
};