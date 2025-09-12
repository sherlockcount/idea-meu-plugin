const aiService = require('./aiService');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

/**
 * MEU (Minimum Executable Unit) 服务
 * 负责将用户想法分解为最小可执行单元，并支持逐步构建
 */
class MEUService {
  constructor() {
    // 在Docker容器中使用/app/projects，在本地开发中使用../../projects
    this.projectsDir = process.env.DOCKER_EXECUTION === 'true' 
      ? path.join('/app', 'projects')
      : path.join(__dirname, '../../projects');
    this.ensureProjectsDir();
  }

  /**
   * 确保项目目录存在
   */
  async ensureProjectsDir() {
    try {
      await fs.access(this.projectsDir);
    } catch {
      await fs.mkdir(this.projectsDir, { recursive: true });
      logger.info('创建项目目录', { dir: this.projectsDir });
    }
  }

  /**
   * 分析想法并生成MEU计划
   * @param {string} idea - 用户想法
   * @param {string} language - 编程语言
   * @returns {Promise<Object>} MEU计划
   */
  async analyzeMEU(idea, language = 'python') {
    try {
      logger.info('开始分析MEU', { idea, language });

      // 验证想法
      const validation = await aiService.validateIdea(idea, language);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      // 生成MEU计划
      const meuPlan = await this.generateMEUPlan(idea, language);
      
      // 创建项目ID
      const projectId = this.generateProjectId(idea);
      
      // 保存MEU计划
      await this.saveMEUPlan(projectId, meuPlan);

      return {
        projectId,
        plan: meuPlan,
        currentStep: 0,
        totalSteps: meuPlan.steps.length,
        status: 'planned'
      };
    } catch (error) {
      logger.error('MEU分析失败', { error: error.message, idea, language });
      throw error;
    }
  }

  /**
   * 生成MEU计划
   * @param {string} idea - 用户想法
   * @param {string} language - 编程语言
   * @returns {Promise<Object>} MEU计划
   */
  async generateMEUPlan(idea, language) {
    const complexity = aiService.assessComplexity(idea);
    
    // 根据复杂度生成不同的MEU步骤
    let steps = [];
    
    if (complexity === 'low') {
      steps = await this.generateSimpleMEU(idea, language);
    } else if (complexity === 'medium') {
      steps = await this.generateMediumMEU(idea, language);
    } else {
      steps = await this.generateComplexMEU(idea, language);
    }

    return {
      idea,
      language,
      complexity,
      steps,
      createdAt: new Date().toISOString()
    };
  }

  /**
   * 生成简单MEU步骤
   */
  async generateSimpleMEU(idea, language) {
    return [
      {
        id: 1,
        title: '基础实现',
        description: `实现${idea}的核心功能`,
        type: 'implementation',
        dependencies: [],
        estimatedTime: '< 1分钟',
        files: [{
          name: this.getMainFileName(language),
          type: 'main',
          description: '主要实现文件'
        }]
      },
      {
        id: 2,
        title: '测试验证',
        description: '验证功能是否正常工作',
        type: 'testing',
        dependencies: [1],
        estimatedTime: '< 30秒',
        files: []
      }
    ];
  }

  /**
   * 生成中等复杂度MEU步骤
   */
  async generateMediumMEU(idea, language) {
    return [
      {
        id: 1,
        title: '项目结构',
        description: '创建基本的项目结构和配置',
        type: 'setup',
        dependencies: [],
        estimatedTime: '< 30秒',
        files: [{
          name: this.getConfigFileName(language),
          type: 'config',
          description: '配置文件'
        }]
      },
      {
        id: 2,
        title: '核心功能',
        description: `实现${idea}的主要功能`,
        type: 'implementation',
        dependencies: [1],
        estimatedTime: '1-2分钟',
        files: [{
          name: this.getMainFileName(language),
          type: 'main',
          description: '主要实现文件'
        }]
      },
      {
        id: 3,
        title: '功能扩展',
        description: '添加额外功能和优化',
        type: 'enhancement',
        dependencies: [2],
        estimatedTime: '1-2分钟',
        files: []
      },
      {
        id: 4,
        title: '测试验证',
        description: '全面测试所有功能',
        type: 'testing',
        dependencies: [3],
        estimatedTime: '< 1分钟',
        files: []
      }
    ];
  }

  /**
   * 生成复杂MEU步骤
   */
  async generateComplexMEU(idea, language) {
    return [
      {
        id: 1,
        title: '项目初始化',
        description: '创建项目结构和依赖管理',
        type: 'setup',
        dependencies: [],
        estimatedTime: '1分钟',
        files: [{
          name: this.getConfigFileName(language),
          type: 'config',
          description: '项目配置文件'
        }]
      },
      {
        id: 2,
        title: '核心模块',
        description: '实现核心业务逻辑',
        type: 'implementation',
        dependencies: [1],
        estimatedTime: '2-3分钟',
        files: [{
          name: this.getMainFileName(language),
          type: 'main',
          description: '主要实现文件'
        }]
      },
      {
        id: 3,
        title: '数据处理',
        description: '实现数据存储和处理逻辑',
        type: 'data',
        dependencies: [2],
        estimatedTime: '2-3分钟',
        files: [{
          name: this.getDataFileName(language),
          type: 'data',
          description: '数据处理文件'
        }]
      },
      {
        id: 4,
        title: '用户界面',
        description: '创建用户交互界面',
        type: 'ui',
        dependencies: [2],
        estimatedTime: '2-3分钟',
        files: [{
          name: this.getUIFileName(language),
          type: 'ui',
          description: '用户界面文件'
        }]
      },
      {
        id: 5,
        title: '集成测试',
        description: '整合所有模块并进行测试',
        type: 'integration',
        dependencies: [3, 4],
        estimatedTime: '1-2分钟',
        files: []
      },
      {
        id: 6,
        title: '优化完善',
        description: '性能优化和功能完善',
        type: 'optimization',
        dependencies: [5],
        estimatedTime: '1-2分钟',
        files: []
      }
    ];
  }

  /**
   * 执行MEU步骤
   * @param {string} projectId - 项目ID
   * @param {number} stepId - 步骤ID
   * @returns {Promise<Object>} 执行结果
   */
  async executeMEUStep(projectId, stepId) {
    try {
      logger.info('执行MEU步骤', { projectId, stepId });

      // 加载MEU计划
      const meuPlan = await this.loadMEUPlan(projectId);
      if (!meuPlan) {
        throw new Error('MEU计划不存在');
      }

      // 找到对应步骤
      const step = meuPlan.plan.steps.find(s => s.id === stepId);
      if (!step) {
        throw new Error(`步骤 ${stepId} 不存在`);
      }

      // 检查依赖
      const unmetDependencies = step.dependencies.filter(depId => 
        !meuPlan.completedSteps?.includes(depId)
      );
      
      if (unmetDependencies.length > 0) {
        throw new Error(`未满足依赖: ${unmetDependencies.join(', ')}`);
      }

      // 生成步骤代码
      const stepCode = await this.generateStepCode(meuPlan.plan, step);
      
      // 执行代码
      const executionResult = await this.executeStepCode(projectId, step, stepCode);
      
      // 更新MEU状态
      await this.updateMEUProgress(projectId, stepId, executionResult);

      return {
        stepId,
        step,
        code: stepCode,
        result: executionResult,
        status: 'completed'
      };
    } catch (error) {
      logger.error('MEU步骤执行失败', { error: error.message, projectId, stepId });
      throw error;
    }
  }

  /**
   * 生成步骤代码
   */
  async generateStepCode(plan, step) {
    const prompt = this.buildStepPrompt(plan, step);
    const result = await aiService.generateCode(prompt, plan.language);
    return result.code;
  }

  /**
   * 构建步骤提示词
   */
  buildStepPrompt(plan, step) {
    return `基于以下项目信息，生成第${step.id}步的代码：

项目想法: ${plan.idea}
编程语言: ${plan.language}
当前步骤: ${step.title}
步骤描述: ${step.description}
步骤类型: ${step.type}

请生成这一步需要的具体代码，确保代码可以独立运行或与前面的步骤配合使用。`;
  }

  /**
   * 执行步骤代码
   */
  async executeStepCode(projectId, step, code) {
    // 这里应该调用Docker执行服务
    // 暂时返回模拟结果
    return {
      success: true,
      output: `步骤 ${step.id}: ${step.title} 执行成功`,
      executionTime: Math.random() * 1000 + 500, // 模拟执行时间
      files: step.files || []
    };
  }

  /**
   * 获取文件名
   */
  getMainFileName(language) {
    const fileNames = {
      python: 'main.py',
      javascript: 'index.js',
      bash: 'script.sh',
      go: 'main.go',
      rust: 'main.rs',
      java: 'Main.java',
      cpp: 'main.cpp',
      csharp: 'Program.cs'
    };
    return fileNames[language] || 'main.txt';
  }

  getConfigFileName(language) {
    const configNames = {
      python: 'requirements.txt',
      javascript: 'package.json',
      go: 'go.mod',
      rust: 'Cargo.toml',
      java: 'pom.xml',
      cpp: 'CMakeLists.txt',
      csharp: 'project.csproj'
    };
    return configNames[language] || 'config.txt';
  }

  getDataFileName(language) {
    const dataNames = {
      python: 'data.py',
      javascript: 'data.js',
      go: 'data.go',
      rust: 'data.rs',
      java: 'Data.java',
      cpp: 'data.cpp',
      csharp: 'Data.cs'
    };
    return dataNames[language] || 'data.txt';
  }

  getUIFileName(language) {
    const uiNames = {
      python: 'ui.py',
      javascript: 'ui.html',
      go: 'ui.go',
      rust: 'ui.rs',
      java: 'UI.java',
      cpp: 'ui.cpp',
      csharp: 'UI.cs'
    };
    return uiNames[language] || 'ui.txt';
  }

  /**
   * 生成项目ID
   */
  generateProjectId(idea) {
    const timestamp = Date.now();
    const hash = idea.slice(0, 10).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    return `meu_${hash}_${timestamp}`;
  }

  /**
   * 保存MEU计划
   */
  async saveMEUPlan(projectId, plan) {
    const projectDir = path.join(this.projectsDir, projectId);
    await fs.mkdir(projectDir, { recursive: true });
    
    const planFile = path.join(projectDir, 'meu_plan.json');
    const planData = {
      projectId,
      plan,
      currentStep: 0,
      completedSteps: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await fs.writeFile(planFile, JSON.stringify(planData, null, 2));
    logger.info('MEU计划已保存', { projectId, planFile });
  }

  /**
   * 加载MEU计划
   */
  async loadMEUPlan(projectId) {
    try {
      const planFile = path.join(this.projectsDir, projectId, 'meu_plan.json');
      const data = await fs.readFile(planFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      logger.error('加载MEU计划失败', { error: error.message, projectId });
      return null;
    }
  }

  /**
   * 更新MEU进度
   */
  async updateMEUProgress(projectId, stepId, result) {
    const meuPlan = await this.loadMEUPlan(projectId);
    if (!meuPlan) return;

    if (!meuPlan.completedSteps) {
      meuPlan.completedSteps = [];
    }
    
    if (!meuPlan.completedSteps.includes(stepId)) {
      meuPlan.completedSteps.push(stepId);
    }
    
    meuPlan.currentStep = Math.max(meuPlan.currentStep, stepId);
    meuPlan.updatedAt = new Date().toISOString();
    
    // 保存执行结果
    if (!meuPlan.stepResults) {
      meuPlan.stepResults = {};
    }
    meuPlan.stepResults[stepId] = result;

    const planFile = path.join(this.projectsDir, projectId, 'meu_plan.json');
    await fs.writeFile(planFile, JSON.stringify(meuPlan, null, 2));
  }

  /**
   * 获取MEU状态
   */
  async getMEUStatus(projectId) {
    const meuPlan = await this.loadMEUPlan(projectId);
    if (!meuPlan) {
      throw new Error('MEU项目不存在');
    }

    const totalSteps = meuPlan.plan.steps.length;
    const completedSteps = meuPlan.completedSteps?.length || 0;
    const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    return {
      projectId,
      idea: meuPlan.plan.idea,
      language: meuPlan.plan.language,
      complexity: meuPlan.plan.complexity,
      totalSteps,
      completedSteps,
      currentStep: meuPlan.currentStep,
      progress: Math.round(progress),
      status: completedSteps === totalSteps ? 'completed' : 'in_progress',
      steps: meuPlan.plan.steps.map(step => ({
        ...step,
        completed: meuPlan.completedSteps?.includes(step.id) || false,
        result: meuPlan.stepResults?.[step.id] || null
      })),
      createdAt: meuPlan.createdAt,
      updatedAt: meuPlan.updatedAt
    };
  }
}

module.exports = new MEUService();