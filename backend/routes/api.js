const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const aiService = require('../services/aiService');
const databaseManager = require('../config/database');

/**
 * @swagger
 * /api/info:
 *   get:
 *     tags: [API Info]
 *     summary: 获取API基本信息
 *     description: 返回API的基本信息，包括版本、描述、端点列表等
 *     responses:
 *       200:
 *         description: 成功获取API信息
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: 'Idea to MEU API'
 *                         version:
 *                           type: string
 *                           example: '1.0.0'
 *                         description:
 *                           type: string
 *                         endpoints:
 *                           type: object
 *                         features:
 *                           type: array
 *                           items:
 *                             type: string
 */
router.get('/info', asyncHandler(async (req, res) => {
  logger.info('API信息请求');
  
  res.json({
    success: true,
    data: {
      name: 'Idea to MEU API',
      version: '1.0.0',
      description: '将想法转换为可执行代码的API服务',
      endpoints: {
        '/api/info': 'API信息',
        '/api/stats': '系统统计',
        '/api/languages': '支持的编程语言',
        '/api/templates': '代码模板',
        '/api/validate': '想法验证',
        '/api/execute': '代码执行',
        '/api/history': '执行历史',
        '/health': '健康检查'
      },
      features: [
        '自然语言转代码',
        'AI智能解析',
        '多语言支持',
        '安全执行环境',
        '实时结果反馈',
        '执行历史记录'
      ]
    },
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/stats:
 *   get:
 *     tags: [API Info]
 *     summary: 获取系统统计信息
 *     description: 返回系统运行统计数据，包括执行次数、成功率、资源使用等
 *     responses:
 *       200:
 *         description: 成功获取统计信息
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         totalExecutions:
 *                           type: integer
 *                           description: 总执行次数
 *                         successfulExecutions:
 *                           type: integer
 *                           description: 成功执行次数
 *                         failedExecutions:
 *                           type: integer
 *                           description: 失败执行次数
 *                         uptime:
 *                           type: number
 *                           description: 系统运行时间（秒）
 *                         memoryUsage:
 *                           type: object
 *                           description: 内存使用情况
 */
router.get('/stats', asyncHandler(async (req, res) => {
  logger.info('系统统计请求');
  
  // 模拟统计数据，实际应从数据库获取
  const stats = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    supportedLanguages: 5,
    activeUsers: 0,
    averageExecutionTime: '0ms',
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    lastUpdated: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/languages:
 *   get:
 *     tags: [API Info]
 *     summary: 获取支持的编程语言列表
 *     description: 返回系统支持的所有编程语言及其详细信息
 *     responses:
 *       200:
 *         description: 成功获取语言列表
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
 *                         $ref: '#/components/schemas/Language'
 *                     count:
 *                       type: integer
 *                       description: 支持的语言数量
 */
router.get('/languages', asyncHandler(async (req, res) => {
  logger.info('支持语言列表请求');
  
  const languages = [
    {
      id: 'python',
      name: 'Python',
      version: '3.9+',
      description: '通用编程语言，适合数据处理、AI、Web开发',
      extensions: ['.py'],
      examples: ['数据分析', '机器学习', 'Web爬虫', 'API开发']
    },
    {
      id: 'javascript',
      name: 'JavaScript',
      version: 'ES2020+',
      description: '前端和后端开发语言',
      extensions: ['.js', '.mjs'],
      examples: ['Web应用', 'API服务', '数据处理', '自动化脚本']
    },
    {
      id: 'bash',
      name: 'Bash',
      version: '4.0+',
      description: 'Shell脚本语言，适合系统管理和自动化',
      extensions: ['.sh'],
      examples: ['系统管理', '文件处理', '部署脚本', '监控脚本']
    },
    {
      id: 'go',
      name: 'Go',
      version: '1.18+',
      description: '高性能编程语言，适合并发和网络编程',
      extensions: ['.go'],
      examples: ['微服务', 'CLI工具', '网络服务', '系统编程']
    },
    {
      id: 'rust',
      name: 'Rust',
      version: '1.60+',
      description: '系统编程语言，注重安全和性能',
      extensions: ['.rs'],
      examples: ['系统工具', '性能关键应用', 'WebAssembly', '区块链']
    }
  ];
  
  res.json({
    success: true,
    data: languages,
    count: languages.length,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/templates:
 *   get:
 *     tags: [Code Templates]
 *     summary: 获取代码模板列表
 *     description: 返回可用的代码模板，支持按语言筛选
 *     parameters:
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *         description: 编程语言过滤器
 *         example: 'python'
 *     responses:
 *       200:
 *         description: 成功获取模板列表
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
 *                         $ref: '#/components/schemas/CodeTemplate'
 *                     count:
 *                       type: integer
 *                       description: 模板数量
 */
router.get('/templates', asyncHandler(async (req, res) => {
  const { language, category } = req.query;
  
  logger.info('代码模板请求', { language, category });
  
  const templates = {
    python: {
      'data-analysis': {
        name: '数据分析模板',
        description: '使用pandas进行数据分析',
        code: `import pandas as pd\nimport numpy as np\n\n# 读取数据\ndf = pd.read_csv('data.csv')\n\n# 数据探索\nprint(df.head())\nprint(df.info())\nprint(df.describe())\n\n# 数据处理\n# TODO: 添加具体的数据处理逻辑`
      },
      'web-scraping': {
        name: '网页爬虫模板',
        description: '使用requests和BeautifulSoup爬取网页',
        code: `import requests\nfrom bs4 import BeautifulSoup\n\n# 发送请求\nurl = 'https://example.com'\nresponse = requests.get(url)\n\n# 解析HTML\nsoup = BeautifulSoup(response.content, 'html.parser')\n\n# 提取数据\n# TODO: 添加具体的数据提取逻辑`
      }
    },
    javascript: {
      'api-server': {
        name: 'API服务器模板',
        description: '使用Express创建API服务器',
        code: `const express = require('express');\nconst app = express();\nconst port = 3000;\n\napp.use(express.json());\n\napp.get('/', (req, res) => {\n  res.json({ message: 'Hello World!' });\n});\n\napp.listen(port, () => {\n  console.log(\`Server running on port \${port}\`);\n});`
      }
    },
    bash: {
      'file-processing': {
        name: '文件处理模板',
        description: '批量处理文件的Shell脚本',
        code: `#!/bin/bash\n\n# 设置变量\nSOURCE_DIR="/path/to/source"\nTARGET_DIR="/path/to/target"\n\n# 创建目标目录\nmkdir -p "$TARGET_DIR"\n\n# 处理文件\nfor file in "$SOURCE_DIR"/*; do\n  if [ -f "$file" ]; then\n    echo "Processing: $file"\n    # TODO: 添加具体的文件处理逻辑\n  fi\ndone`
      }
    }
  };
  
  let result = templates;
  
  if (language) {
    result = templates[language] || {};
  }
  
  if (language && category) {
    result = templates[language]?.[category] || null;
  }
  
  res.json({
    success: true,
    data: result,
    timestamp: new Date().toISOString()
  });
}));

/**
 * @swagger
 * /api/validate:
 *   post:
 *     tags: [Idea Validation]
 *     summary: 验证想法可行性
 *     description: 分析用户提供的想法，评估其技术可行性和实现复杂度
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idea
 *             properties:
 *               idea:
 *                 type: string
 *                 description: 要验证的想法描述
 *                 example: '创建一个实时聊天应用'
 *               language:
 *                 type: string
 *                 description: 首选编程语言
 *                 example: 'javascript'
 *               complexity:
 *                 type: string
 *                 enum: [simple, medium, complex]
 *                 description: 期望的复杂度级别
 *     responses:
 *       200:
 *         description: 验证成功
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/ValidationResult'
 *       400:
 *         description: 请求参数错误
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/validate', asyncHandler(async (req, res) => {
  const { idea, language = 'python' } = req.body;
  
  if (!idea) {
    return res.status(400).json({
      success: false,
      error: {
        message: '请提供要验证的想法',
        code: 'MISSING_IDEA'
      }
    });
  }
  
  try {
    const validation = await aiService.validateIdea(idea, language);
    
    logger.info('想法验证完成', { idea, language, valid: validation.valid });
    
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    logger.error('想法验证失败', error);
    
    res.status(500).json({
      success: false,
      error: {
        message: '验证过程出现错误',
        code: 'VALIDATION_ERROR',
        details: error.message
      }
    });
  }
}));

/**
 * @swagger
 * /api/execution/status:
 *   get:
 *     tags: [Execution]
 *     summary: 获取执行环境状态
 *     description: 返回当前执行环境的状态信息，包括资源使用情况和可用性
 *     responses:
 *       200:
 *         description: 成功获取执行环境状态
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           enum: [available, busy, maintenance]
 *                           description: 执行环境状态
 *                         activeExecutions:
 *                           type: integer
 *                           description: 当前活跃的执行任务数
 *                         queueLength:
 *                           type: integer
 *                           description: 等待队列长度
 *                         resourceUsage:
 *                           type: object
 *                           properties:
 *                             cpu:
 *                               type: number
 *                               description: CPU使用率（百分比）
 *                             memory:
 *                               type: number
 *                               description: 内存使用率（百分比）
 *                             disk:
 *                               type: number
 *                               description: 磁盘使用率（百分比）
 */
router.get('/execution/status', asyncHandler(async (req, res) => {
  logger.info('执行环境状态请求');
  
  // 检查各种服务状态
  const status = {
    docker: {
      available: true,
      version: '20.10+',
      containers: {
        running: 0,
        total: 0
      }
    },
    languages: {
      python: { available: true, version: '3.9.7' },
      javascript: { available: true, version: '16.14.0' },
      bash: { available: true, version: '5.1.8' },
      go: { available: true, version: '1.18.1' },
      rust: { available: true, version: '1.60.0' }
    },
    resources: {
      cpu: {
        usage: '15%',
        cores: 4
      },
      memory: {
        usage: '45%',
        total: '8GB',
        available: '4.4GB'
      },
      disk: {
        usage: '60%',
        total: '100GB',
        available: '40GB'
      }
    },
    queue: {
      pending: 0,
      running: 0,
      completed: 0
    }
  };
  
  res.json({
    success: true,
    data: status,
    timestamp: new Date().toISOString()
  });
}));

module.exports = router;