const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 确保日志目录存在
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// 控制台格式
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta, null, 2)}`;
    }
    return msg;
  })
);

// 创建logger实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'idea-to-meu-backend' },
  transports: [
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // 组合日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    })
  ],
  
  // 处理未捕获的异常
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log')
    })
  ],
  
  // 处理未处理的Promise拒绝
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log')
    })
  ]
});

// 非生产环境添加控制台输出
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// 扩展logger功能
class ExtendedLogger {
  constructor(winstonLogger) {
    this.logger = winstonLogger;
  }

  // 基础日志方法
  error(message, meta = {}) {
    this.logger.error(message, meta);
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  // HTTP请求日志
  logRequest(req, res, responseTime) {
    const logData = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('Content-Length') || 0
    };

    if (res.statusCode >= 400) {
      this.warn('HTTP请求错误', logData);
    } else {
      this.info('HTTP请求', logData);
    }
  }

  // 执行日志
  logExecution(executionData) {
    this.info('代码执行', {
      executionId: executionData.id,
      language: executionData.language,
      status: executionData.status,
      duration: executionData.duration,
      exitCode: executionData.exitCode
    });
  }

  // AI操作日志
  logAIOperation(operation, data) {
    this.info(`AI操作: ${operation}`, {
      operation,
      tokens: data.tokens,
      model: data.model,
      duration: data.duration,
      cost: data.cost
    });
  }

  // 数据库操作日志
  logDatabase(operation, collection, data = {}) {
    this.debug(`数据库操作: ${operation}`, {
      operation,
      collection,
      ...data
    });
  }

  // 安全事件日志
  logSecurity(event, details) {
    this.warn(`安全事件: ${event}`, {
      event,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  // 性能日志
  logPerformance(operation, metrics) {
    this.info(`性能指标: ${operation}`, {
      operation,
      ...metrics
    });
  }
}

// 日志轮转和清理
const cleanupLogs = () => {
  const maxAge = 30 * 24 * 60 * 60 * 1000; // 30天
  const now = Date.now();

  try {
    const files = fs.readdirSync(logDir);
    files.forEach(file => {
      const filePath = path.join(logDir, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`已删除过期日志文件: ${file}`);
      }
    });
  } catch (error) {
    console.error('清理日志文件时出错:', error);
  }
};

// 每天清理一次过期日志
setInterval(cleanupLogs, 24 * 60 * 60 * 1000);

// 导出扩展的logger实例
module.exports = new ExtendedLogger(logger);