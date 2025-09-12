const axios = require('axios');
const logger = require('../utils/logger');

class AIService {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    this.baseURL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com';
    this.model = process.env.DEEPSEEK_MODEL || 'deepseek-coder';
    
    if (!this.apiKey) {
      logger.warn('DeepSeek API密钥未配置，将使用模拟模式');
    }
  }

  /**
   * 分析用户想法并生成代码
   * @param {string} idea - 用户的想法描述
   * @param {string} language - 目标编程语言
   * @returns {Promise<Object>} 生成的代码和相关信息
   */
  async generateCode(idea, language) {
    try {
      if (!this.apiKey) {
        return this.getMockResponse(idea, language);
      }

      const prompt = this.buildPrompt(idea, language);
      const response = await this.callDeepSeekAPI(prompt);
      
      return this.parseResponse(response, idea, language);
    } catch (error) {
      logger.error('AI代码生成失败', { error: error.message, idea, language });
      
      // 如果API调用失败，回退到模拟模式
      logger.warn('回退到模拟模式');
      return this.getMockResponse(idea, language);
    }
  }

  /**
   * 构建发送给AI的提示词
   * @param {string} idea - 用户想法
   * @param {string} language - 编程语言
   * @returns {string} 构建的提示词
   */
  buildPrompt(idea, language) {
    const languageInstructions = {
      python: '请使用Python编写代码，遵循PEP 8规范',
      javascript: '请使用现代JavaScript (ES6+) 编写代码',
      bash: '请编写Bash脚本，确保兼容性',
      go: '请使用Go语言编写代码，遵循Go的最佳实践',
      rust: '请使用Rust编写代码，注重内存安全',
      java: '请使用Java编写代码，遵循Java编码规范',
      cpp: '请使用C++编写代码，使用现代C++特性',
      csharp: '请使用C#编写代码，遵循.NET最佳实践'
    };

    const instruction = languageInstructions[language] || `请使用${language}编写代码`;

    return `你是一个专业的代码生成助手。根据用户的想法生成高质量、可执行的代码。

用户想法: ${idea}
编程语言: ${language}

要求:
1. ${instruction}
2. 代码应该简洁、清晰、可读
3. 包含必要的注释
4. 确保代码可以直接运行
5. 如果需要输入，请使用合理的默认值或示例数据
6. 只返回代码，不要包含解释文字

请生成代码:`;
  }

  /**
   * 调用DeepSeek API
   * @param {string} prompt - 提示词
   * @returns {Promise<Object>} API响应
   */
  async callDeepSeekAPI(prompt) {
    const requestData = {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 2000,
      temperature: 0.1,
      top_p: 0.95,
      stream: false
    };

    const config = {
      method: 'POST',
      url: `${this.baseURL}/v1/chat/completions`,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      data: requestData,
      timeout: 30000
    };

    logger.debug('调用DeepSeek API', { 
      model: this.model, 
      promptLength: prompt.length 
    });

    const response = await axios(config);
    return response.data;
  }

  /**
   * 解析AI响应
   * @param {Object} response - AI API响应
   * @param {string} idea - 原始想法
   * @param {string} language - 编程语言
   * @returns {Object} 解析后的结果
   */
  parseResponse(response, idea, language) {
    if (!response.choices || response.choices.length === 0) {
      throw new Error('AI响应格式无效');
    }

    const generatedContent = response.choices[0].message.content.trim();
    
    // 提取代码块（如果被包装在```中）
    let code = generatedContent;
    const codeBlockRegex = /```(?:\w+)?\n?([\s\S]*?)```/;
    const match = generatedContent.match(codeBlockRegex);
    if (match) {
      code = match[1].trim();
    }

    // 生成解释
    const explanation = this.generateExplanation(idea, language, code);
    
    // 计算置信度（基于响应质量）
    const confidence = this.calculateConfidence(code, language);

    return {
      code,
      explanation,
      confidence,
      model: this.model,
      usage: response.usage || {},
      metadata: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0
      }
    };
  }

  /**
   * 生成代码解释
   * @param {string} idea - 用户想法
   * @param {string} language - 编程语言
   * @param {string} code - 生成的代码
   * @returns {string} 解释文本
   */
  generateExplanation(idea, language, code) {
    const lineCount = code.split('\n').length;
    return `基于您的想法"${idea}"，我使用${language}生成了${lineCount}行代码。代码实现了您描述的功能，可以直接运行。`;
  }

  /**
   * 计算代码质量置信度
   * @param {string} code - 生成的代码
   * @param {string} language - 编程语言
   * @returns {number} 置信度 (0-1)
   */
  calculateConfidence(code, language) {
    let confidence = 0.5; // 基础置信度

    // 代码长度检查
    if (code.length > 10) confidence += 0.1;
    if (code.length > 50) confidence += 0.1;

    // 语法结构检查
    const syntaxPatterns = {
      python: [/def \w+\(/, /import \w+/, /if __name__ == ["']__main__["']/, /print\(/],
      javascript: [/function \w+\(/, /const \w+/, /console\.log\(/, /=>/],
      bash: [/#!/, /echo/, /if \[/, /for \w+ in/],
      go: [/package \w+/, /func \w+\(/, /fmt\.Print/, /import/],
      rust: [/fn \w+\(/, /println!/, /use \w+/, /let \w+/]
    };

    const patterns = syntaxPatterns[language] || [];
    const matchCount = patterns.filter(pattern => pattern.test(code)).length;
    confidence += (matchCount / Math.max(patterns.length, 1)) * 0.3;

    // 确保置信度在合理范围内
    return Math.min(Math.max(confidence, 0.1), 0.95);
  }

  /**
   * 模拟响应（当API不可用时）
   * @param {string} idea - 用户想法
   * @param {string} language - 编程语言
   * @returns {Object} 模拟的响应
   */
  getMockResponse(idea, language) {
    const mockCodes = {
      python: {
        '打印': 'print("Hello, World!")',
        '计算': 'result = 2 + 2\nprint(f"计算结果: {result}")',
        '时间': 'import datetime\nprint(f"当前时间: {datetime.datetime.now()}")',
        '文件': 'with open("example.txt", "w") as f:\n    f.write("Hello, World!")',
        '默认': '# 基于您的想法生成的Python代码\nprint("功能实现中...")'
      },
      javascript: {
        '打印': 'console.log("Hello, World!");',
        '计算': 'const result = 2 + 2;\nconsole.log(`计算结果: ${result}`);',
        '时间': 'console.log(`当前时间: ${new Date()}`);',
        '数组': 'const arr = [1, 2, 3, 4, 5];\nconsole.log(arr);',
        '默认': '// 基于您的想法生成的JavaScript代码\nconsole.log("功能实现中...");'
      },
      bash: {
        '打印': 'echo "Hello, World!"',
        '文件': 'ls -la',
        '时间': 'date',
        '系统': 'uname -a',
        '默认': '#!/bin/bash\n# 基于您的想法生成的Bash脚本\necho "功能实现中..."'
      }
    };

    const languageCodes = mockCodes[language] || mockCodes.python;
    
    // 根据想法关键词选择合适的模拟代码
    let selectedCode = languageCodes['默认'];
    for (const [keyword, code] of Object.entries(languageCodes)) {
      if (idea.includes(keyword)) {
        selectedCode = code;
        break;
      }
    }

    return {
      code: selectedCode,
      explanation: `基于您的想法"${idea}"生成的${language}代码（模拟模式）`,
      confidence: 0.8,
      model: 'mock-model',
      usage: {},
      metadata: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        mockMode: true
      }
    };
  }

  /**
   * 验证想法的可行性
   * @param {string} idea - 用户想法
   * @param {string} language - 编程语言
   * @returns {Promise<Object>} 验证结果
   */
  async validateIdea(idea, language) {
    try {
      // 基本验证
      if (!idea || idea.trim().length < 3) {
        return {
          valid: false,
          message: '想法描述太短，请提供更详细的描述',
          suggestions: ['请描述您想要实现的具体功能', '可以包含输入输出的例子']
        };
      }

      if (idea.length > 1000) {
        return {
          valid: false,
          message: '想法描述太长，请简化描述',
          suggestions: ['请提取核心功能点', '分步骤描述复杂需求']
        };
      }

      // 检查是否包含不安全内容
      const unsafeKeywords = ['删除系统', '格式化硬盘', 'rm -rf', '病毒', '恶意'];
      const hasUnsafeContent = unsafeKeywords.some(keyword => 
        idea.toLowerCase().includes(keyword.toLowerCase())
      );

      if (hasUnsafeContent) {
        return {
          valid: false,
          message: '检测到潜在的不安全操作，请修改您的想法',
          suggestions: ['避免涉及系统级危险操作', '专注于安全的功能实现']
        };
      }

      // 语言支持检查
      const supportedLanguages = ['python', 'javascript', 'bash', 'go', 'rust', 'java', 'cpp', 'csharp'];
      if (!supportedLanguages.includes(language)) {
        return {
          valid: false,
          message: `暂不支持${language}语言`,
          suggestions: [`支持的语言: ${supportedLanguages.join(', ')}`]
        };
      }

      return {
        valid: true,
        message: '想法验证通过',
        complexity: this.assessComplexity(idea),
        estimatedTime: this.estimateExecutionTime(idea, language)
      };
    } catch (error) {
      logger.error('想法验证失败', error);
      return {
        valid: false,
        message: '验证过程出现错误',
        error: error.message
      };
    }
  }

  /**
   * 评估想法复杂度
   * @param {string} idea - 用户想法
   * @returns {string} 复杂度等级
   */
  assessComplexity(idea) {
    const complexKeywords = ['算法', '数据库', '网络', '并发', '多线程', 'API', '框架'];
    const simpleKeywords = ['打印', '计算', '输出', '显示', '读取'];
    
    const complexCount = complexKeywords.filter(keyword => 
      idea.toLowerCase().includes(keyword)
    ).length;
    
    const simpleCount = simpleKeywords.filter(keyword => 
      idea.toLowerCase().includes(keyword)
    ).length;

    if (complexCount > simpleCount) return 'high';
    if (simpleCount > 0) return 'low';
    return 'medium';
  }

  /**
   * 估算执行时间
   * @param {string} idea - 用户想法
   * @param {string} language - 编程语言
   * @returns {string} 估算时间
   */
  estimateExecutionTime(idea, language) {
    const complexity = this.assessComplexity(idea);
    const timeMap = {
      low: '< 1秒',
      medium: '1-5秒',
      high: '5-30秒'
    };
    return timeMap[complexity] || '未知';
  }
}

module.exports = new AIService();