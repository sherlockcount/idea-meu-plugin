const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger定义
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Idea to MEU API',
    version: '1.0.0',
    description: '将想法转换为可执行代码的API服务',
    contact: {
      name: 'API Support',
      email: 'support@idea-to-meu.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: '开发环境'
    },
    {
      url: 'https://api.idea-to-meu.com',
      description: '生产环境'
    }
  ],
  components: {
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: '请求是否成功'
          },
          data: {
            type: 'object',
            description: '响应数据'
          },
          message: {
            type: 'string',
            description: '响应消息'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: '响应时间戳'
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          error: {
            type: 'object',
            properties: {
              message: {
                type: 'string',
                description: '错误消息'
              },
              code: {
                type: 'string',
                description: '错误代码'
              },
              details: {
                type: 'string',
                description: '错误详情'
              }
            }
          }
        }
      },
      Language: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: '语言标识符'
          },
          name: {
            type: 'string',
            description: '语言名称'
          },
          version: {
            type: 'string',
            description: '支持的版本'
          },
          description: {
            type: 'string',
            description: '语言描述'
          },
          extensions: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: '文件扩展名'
          },
          examples: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: '使用示例'
          }
        }
      },
      ExecutionRequest: {
        type: 'object',
        required: ['idea'],
        properties: {
          idea: {
            type: 'string',
            description: '要执行的想法描述',
            example: '创建一个计算斐波那契数列的函数'
          },
          language: {
            type: 'string',
            description: '编程语言',
            enum: ['python', 'javascript', 'bash', 'go', 'rust'],
            default: 'python'
          },
          timeout: {
            type: 'integer',
            description: '执行超时时间（秒）',
            default: 30,
            minimum: 1,
            maximum: 300
          }
        }
      },
      ExecutionResult: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: '执行ID'
          },
          idea: {
            type: 'string',
            description: '原始想法'
          },
          language: {
            type: 'string',
            description: '编程语言'
          },
          code: {
            type: 'string',
            description: '生成的代码'
          },
          output: {
            type: 'string',
            description: '执行输出'
          },
          error: {
            type: 'string',
            nullable: true,
            description: '错误信息'
          },
          success: {
            type: 'boolean',
            description: '执行是否成功'
          },
          executionTime: {
            type: 'number',
            description: '执行时间（毫秒）'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: '创建时间'
          }
        }
      },
      CodeTemplate: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: '模板ID'
          },
          name: {
            type: 'string',
            description: '模板名称'
          },
          language: {
            type: 'string',
            description: '编程语言'
          },
          category: {
            type: 'string',
            description: '模板分类'
          },
          code: {
            type: 'string',
            description: '模板代码'
          },
          description: {
            type: 'string',
            description: '模板描述'
          }
        }
      },
      ValidationResult: {
        type: 'object',
        properties: {
          valid: {
            type: 'boolean',
            description: '是否有效'
          },
          feasibility: {
            type: 'string',
            enum: ['high', 'medium', 'low'],
            description: '可行性评级'
          },
          complexity: {
            type: 'string',
            enum: ['simple', 'medium', 'complex'],
            description: '复杂度评级'
          },
          estimatedTime: {
            type: 'string',
            description: '预估实现时间'
          },
          suggestions: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: '改进建议'
          },
          requiredSkills: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: '所需技能'
          }
        }
      },
      Pagination: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            description: '当前页码'
          },
          limit: {
            type: 'integer',
            description: '每页记录数'
          },
          total: {
            type: 'integer',
            description: '总记录数'
          },
          totalPages: {
            type: 'integer',
            description: '总页数'
          }
        }
      }
    },
    responses: {
      BadRequest: {
        description: '请求参数错误',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      InternalError: {
        description: '服务器内部错误',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      },
      NotFound: {
        description: '资源未找到',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/ErrorResponse'
            }
          }
        }
      }
    }
  },
  tags: [
    {
      name: 'API Info',
      description: 'API信息和系统状态'
    },
    {
      name: 'Execution',
      description: '代码执行相关接口'
    },
    {
      name: 'MEU',
      description: 'MEU项目管理接口'
    },
    {
      name: 'History',
      description: '执行历史记录'
    },
    {
      name: 'Health',
      description: '健康检查接口'
    }
  ]
};

// Swagger选项
const options = {
  definition: swaggerDefinition,
  apis: [
    './routes/*.js',
    './models/*.js'
  ]
};

// 生成Swagger规范
const swaggerSpec = swaggerJSDoc(options);

// Swagger UI选项
const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    docExpansion: 'none',
    filter: true,
    showRequestHeaders: true,
    showCommonExtensions: true,
    tryItOutEnabled: true
  },
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #3b82f6 }
  `,
  customSiteTitle: 'Idea to MEU API Documentation'
};

module.exports = {
  swaggerSpec,
  swaggerUi,
  swaggerUiOptions
};