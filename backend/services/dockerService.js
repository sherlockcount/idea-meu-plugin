const { spawn, exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

const execAsync = promisify(exec);

// 加载安全策略配置
let securityPolicy = null;
const loadSecurityPolicy = async () => {
  try {
    const policyPath = path.join(__dirname, '../../docker/execution/security-policy.json');
    const policyContent = await fs.readFile(policyPath, 'utf8');
    securityPolicy = JSON.parse(policyContent);
    logger.info('安全策略配置已加载', { policyPath });
  } catch (error) {
    logger.error('加载安全策略失败', { error: error.message });
    // 使用默认安全策略
    securityPolicy = getDefaultSecurityPolicy();
  }
};

// 默认安全策略
const getDefaultSecurityPolicy = () => ({
  resourceLimits: {
    memory: '256m',
    cpus: '0.5',
    pids: 100,
    executionTimeout: 30,
    outputLimit: 10240
  },
  securityOptions: {
    readOnly: true,
    noNewPrivileges: true,
    dropCapabilities: ['ALL']
  },
  networkPolicy: {
    networkMode: 'none'
  }
});

// 初始化时加载安全策略
loadSecurityPolicy();

class DockerService {
    constructor() {
        this.containerPrefix = 'meu-exec';
        this.networkName = 'idea-meu-network';
        this.executionImage = 'meu-executor:latest';
        this.maxConcurrentContainers = 5;
        this.activeContainers = new Map();
        this.cleanupSchedulerStarted = false;
    }

    /**
     * 初始化Docker服务
     */
    async initialize() {
        try {
            // 检查Docker是否可用
            await this.checkDockerAvailability();
            
            // 构建执行环境镜像
            await this.buildExecutionImage();
            
            // 启动清理调度器
            if (!this.cleanupSchedulerStarted) {
                this.startCleanupScheduler();
                this.cleanupSchedulerStarted = true;
            }
            
            logger.info('Docker服务初始化完成');
        } catch (error) {
            logger.error('Docker服务初始化失败', { error: error.message });
            throw error;
        }
    }

    /**
     * 检查Docker可用性
     */
    async checkDockerAvailability() {
        return new Promise((resolve, reject) => {
            exec('docker --version', (error, stdout) => {
                if (error) {
                    reject(new Error('Docker不可用，请确保Docker已安装并运行'));
                } else {
                    logger.info('Docker版本检查通过', { version: stdout.trim() });
                    resolve();
                }
            });
        });
    }

    /**
     * 构建执行环境镜像
     */
    async buildExecutionImage() {
        return new Promise((resolve, reject) => {
            const buildProcess = spawn('docker', [
                'build',
                '-t', this.executionImage,
                path.join(__dirname, '../../docker/execution')
            ]);

            let output = '';
            buildProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            buildProcess.stderr.on('data', (data) => {
                output += data.toString();
            });

            buildProcess.on('close', (code) => {
                if (code === 0) {
                    logger.info('执行环境镜像构建成功');
                    resolve();
                } else {
                    logger.error('执行环境镜像构建失败', { output });
                    reject(new Error(`镜像构建失败，退出码: ${code}`));
                }
            });
        });
    }

    /**
     * 创建并启动执行容器
     */
    async createExecutionContainer(projectId, stepId) {
        if (this.activeContainers.size >= this.maxConcurrentContainers) {
            throw new Error('已达到最大并发容器数量限制');
        }

        const containerName = `${this.containerPrefix}-${projectId}-${stepId}-${Date.now()}`;
        const projectPath = process.env.DOCKER_EXECUTION === 'true'
            ? path.join('/app', 'projects', projectId)
            : path.join(__dirname, '../../projects', projectId);
        
        try {
            // 确保安全策略已加载
            if (!securityPolicy) {
                await loadSecurityPolicy();
            }
            
            const policy = securityPolicy;
            
            // 检查项目目录是否存在
            await fs.access(projectPath);
            
            const dockerArgs = [
                'run',
                '--rm',
                '--name', containerName,
                // 网络策略
                '--network', policy.networkPolicy.networkMode,
                // 资源限制
                '--memory', policy.resourceLimits.memory,
                '--cpus', policy.resourceLimits.cpus.toString(),
                '--pids-limit', policy.resourceLimits.pids.toString(),
                // 安全选项
                '--security-opt', 'no-new-privileges:true',
                '--cap-drop', 'ALL',
                '--cap-add', 'SETUID',
                '--cap-add', 'SETGID',
                // 文件系统安全
                '--read-only',
                '--tmpfs', '/tmp:noexec,nosuid,size=100m',
                '--tmpfs', '/var/tmp:noexec,nosuid,size=50m',
                // ulimit限制
                '--ulimit', 'nproc=100',
                '--ulimit', 'nofile=1024:2048',
                // 挂载目录
                '-v', `${projectPath}:/workspace/projects/${projectId}:ro`,
                '-v', `${path.join(__dirname, '../../projects')}:/workspace/output`,
                '-w', '/workspace',
                '-d',
                this.executionImage,
                'sleep', policy.resourceLimits.executionTimeout ? (policy.resourceLimits.executionTimeout * 60).toString() : '3600' // 根据策略设置运行时间
            ];

            const containerId = await this.runDockerCommand('run', dockerArgs.slice(1));
            
            this.activeContainers.set(containerName, {
                id: containerId.trim(),
                projectId,
                stepId,
                createdAt: new Date(),
                status: 'running'
            });

            logger.info('执行容器创建成功', {
                containerName,
                containerId: containerId.trim(),
                projectId,
                stepId,
                securityPolicy: {
                    memory: policy.resourceLimits.memory,
                    cpus: policy.resourceLimits.cpus,
                    networkMode: policy.networkPolicy.networkMode
                }
            });

            return containerName;
        } catch (error) {
            logger.error('创建执行容器失败', {
                containerName,
                projectId,
                stepId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 在容器中执行代码
     */
    async executeInContainer(containerName, language, projectId, stepId, codeFile) {
        const container = this.activeContainers.get(containerName);
        if (!container) {
            throw new Error(`容器不存在: ${containerName}`);
        }

        try {
            // 确保安全策略已加载
            if (!securityPolicy) {
                await loadSecurityPolicy();
            }
            
            const policy = securityPolicy;
            const timeout = (policy.resourceLimits.executionTimeout || 30) * 1000; // 转换为毫秒
            const outputLimit = policy.resourceLimits.outputLimit || 10240;
            
            const execArgs = [
                'exec',
                containerName,
                'timeout', `${policy.resourceLimits.executionTimeout || 30}s`, // 添加超时保护
                '/bin/bash',
                '/workspace/sandbox.sh',
                language,
                projectId,
                stepId,
                codeFile
            ];

            const startTime = Date.now();
            const result = await this.runDockerCommand('exec', execArgs.slice(1));
            const executionTime = Date.now() - startTime;
            
            // 读取执行结果
            const outputPath = path.join(__dirname, '../../projects', `${projectId}_${stepId}_output.txt`);
            const errorPath = path.join(__dirname, '../../projects', `${projectId}_${stepId}_error.txt`);
            const statusPath = path.join(__dirname, '../../projects', `${projectId}_${stepId}_status.json`);

            const executionResult = {
                output: '',
                error: '',
                status: null,
                success: true,
                executionTime
            };

            try {
                const output = await fs.readFile(outputPath, 'utf8');
                // 限制输出长度
                executionResult.output = output.length > outputLimit ? 
                    output.substring(0, outputLimit) + '\n[输出被截断...]' : output;
            } catch (e) {
                // 输出文件可能不存在
            }

            try {
                const error = await fs.readFile(errorPath, 'utf8');
                // 限制错误输出长度
                executionResult.error = error.length > outputLimit ? 
                    error.substring(0, outputLimit) + '\n[错误输出被截断...]' : error;
            } catch (e) {
                // 错误文件可能不存在
            }

            try {
                const statusContent = await fs.readFile(statusPath, 'utf8');
                executionResult.status = JSON.parse(statusContent);
                executionResult.success = executionResult.status.exitCode === 0;
            } catch (e) {
                logger.warn('无法读取执行状态文件', { statusPath });
            }

            // 添加安全策略信息
            executionResult.securityInfo = {
                timeoutApplied: policy.resourceLimits.executionTimeout,
                outputLimited: executionResult.output.includes('[输出被截断...]') || executionResult.error.includes('[错误输出被截断...]'),
                resourceLimits: {
                    memory: policy.resourceLimits.memory,
                    cpus: policy.resourceLimits.cpus
                }
            };

            logger.info('代码执行完成', {
                containerName,
                projectId,
                stepId,
                success: executionResult.success,
                executionTime: executionResult.executionTime,
                outputLimited: executionResult.securityInfo.outputLimited
            });

            return executionResult;
        } catch (error) {
            logger.error('容器中代码执行失败', {
                containerName,
                projectId,
                stepId,
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 停止并删除容器
     */
    async stopContainer(containerName) {
        const container = this.activeContainers.get(containerName);
        if (!container) {
            logger.warn('尝试停止不存在的容器', { containerName });
            return;
        }

        try {
            await this.runDockerCommand('stop', [containerName]);
            this.activeContainers.delete(containerName);
            
            logger.info('容器已停止', { containerName });
        } catch (error) {
            logger.error('停止容器失败', {
                containerName,
                error: error.message
            });
        }
    }

    /**
     * 强制删除容器
     */
    async removeContainer(containerName) {
        try {
            const result = await this.runDockerCommand('rm', ['-f', containerName]);
            
            logger.info('容器已删除', { containerName });
            return true;
            
        } catch (error) {
            logger.error('删除容器失败', {
                containerName,
                error: error.message
            });
            return false; // 删除失败不抛出异常，避免影响其他操作
        }
    }

    /**
     * 获取容器状态
     */
    async getContainerStatusFromDocker(containerName) {
        try {
            const result = await this.runDockerCommand('inspect', [
                '--format', '{{.State.Status}}',
                containerName
            ]);
            
            return result.trim();
            
        } catch (error) {
            logger.warn('获取容器状态失败', {
                containerName,
                error: error.message
            });
            return 'not_found';
        }
    }

    /**
     * 获取容器资源使用情况
     */
    async getContainerStats(containerName) {
        try {
            const result = await this.runDockerCommand('stats', [
                '--no-stream',
                '--format', 'table {{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.PIDs}}',
                containerName
            ]);
            
            const lines = result.trim().split('\n');
            if (lines.length < 2) return null;
            
            const stats = lines[1].split('\t');
            return {
                cpuPercent: stats[0] || '0%',
                memoryUsage: stats[1] || '0B / 0B',
                memoryPercent: stats[2] || '0%',
                pids: stats[3] || '0'
            };
            
        } catch (error) {
            logger.warn('获取容器统计信息失败', {
                containerName,
                error: error.message
            });
            return null;
        }
    }

    /**
     * 清理过期容器
     */
    async cleanupExpiredContainers() {
        try {
            // 获取所有MEU执行容器
            const result = await this.runDockerCommand('ps', [
                '-a',
                '--filter', 'name=meu-exec-',
                '--format', '{{.Names}}\t{{.Status}}\t{{.CreatedAt}}'
            ]);
            
            const containers = result.trim().split('\n').filter(line => line.trim());
            const now = new Date();
            let cleanedCount = 0;
            
            for (const containerInfo of containers) {
                const [name, status, createdAt] = containerInfo.split('\t');
                
                // 解析创建时间
                const createdTime = new Date(createdAt);
                const ageMinutes = (now - createdTime) / (1000 * 60);
                
                // 清理超过10分钟的容器
                if (ageMinutes > 10) {
                    await this.removeContainer(name);
                    cleanedCount++;
                    logger.info('清理过期容器', {
                        containerName: name,
                        ageMinutes: Math.round(ageMinutes),
                        status
                    });
                }
            }
            
            if (cleanedCount > 0) {
                logger.info('容器清理完成', { cleanedCount });
            }
            
            return cleanedCount;
            
        } catch (error) {
            logger.error('清理过期容器失败', { error: error.message });
            return 0;
        }
    }

    /**
     * 启动定期清理任务
     */
    startCleanupScheduler() {
        // 每5分钟清理一次过期容器
        setInterval(async () => {
            try {
                await this.cleanupExpiredContainers();
            } catch (error) {
                logger.error('定期清理任务失败', { error: error.message });
            }
        }, 5 * 60 * 1000); // 5分钟
        
        logger.info('容器清理调度器已启动');
    }

    /**
     * 获取系统资源使用情况
     */
    async getSystemResourceUsage() {
        try {
            const result = await this.runDockerCommand('system', ['df']);
            
            return {
                timestamp: new Date(),
                systemInfo: result.trim()
            };
            
        } catch (error) {
            logger.warn('获取系统资源使用情况失败', { error: error.message });
            return null;
        }
    }

    /**
     * 清理所有活跃容器
     */
    async cleanup() {
        const containerNames = Array.from(this.activeContainers.keys());
        
        for (const containerName of containerNames) {
            await this.stopContainer(containerName);
        }
        
        logger.info('Docker服务清理完成');
    }

    /**
     * 执行Docker命令
     */
    runDockerCommand(command, args) {
        return new Promise((resolve, reject) => {
            const dockerProcess = spawn('docker', [command, ...args]);
            
            let stdout = '';
            let stderr = '';
            
            dockerProcess.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            dockerProcess.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            dockerProcess.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout);
                } else {
                    reject(new Error(`Docker命令失败: ${stderr || stdout}`));
                }
            });
        });
    }

    /**
     * 获取容器状态
     */
    getContainerStatus(containerName) {
        return this.activeContainers.get(containerName) || null;
    }

    /**
     * 获取所有活跃容器
     */
    getActiveContainers() {
        return Array.from(this.activeContainers.entries()).map(([name, info]) => ({
            name,
            ...info
        }));
    }

    // 构建安全的执行命令
    buildSecureExecuteCommand(language, projectId, stepId, codeFileName, policy) {
        // 验证语言是否在允许列表中
        const allowedCommands = policy.allowedCommands || {};
        if (!allowedCommands[language]) {
            throw new Error(`不支持的编程语言: ${language}`);
        }
        
        // 验证文件名安全性
        if (!this.isSecureFileName(codeFileName)) {
            throw new Error(`不安全的文件名: ${codeFileName}`);
        }
        
        const commands = {
            python: `cd /workspace && timeout ${policy.resourceLimits.executionTimeout || 30}s python3 ${codeFileName}`,
            javascript: `cd /workspace && timeout ${policy.resourceLimits.executionTimeout || 30}s node ${codeFileName}`,
            java: {
                compile: `cd /workspace && timeout 60s javac ${codeFileName}`,
                run: `cd /workspace && timeout ${policy.resourceLimits.executionTimeout || 30}s java ${codeFileName.replace('.java', '')}`
            },
            go: `cd /workspace && timeout ${policy.resourceLimits.executionTimeout || 30}s go run ${codeFileName}`,
            cpp: {
                compile: `cd /workspace && timeout 60s g++ -o ${stepId} ${codeFileName}`,
                run: `cd /workspace && timeout ${policy.resourceLimits.executionTimeout || 30}s ./${stepId}`
            },
            c: {
                compile: `cd /workspace && timeout 60s gcc -o ${stepId} ${codeFileName}`,
                run: `cd /workspace && timeout ${policy.resourceLimits.executionTimeout || 30}s ./${stepId}`
            }
        };
        
        const command = commands[language];
        if (typeof command === 'object') {
            return `${command.compile} && ${command.run}`;
        }
        return command;
    }
    
    // 验证文件名安全性
    isSecureFileName(fileName) {
        // 检查文件名是否包含危险字符
        const dangerousPatterns = [
            /\.\./, // 路径遍历
            /[;&|`$(){}\[\]<>]/, // Shell特殊字符
            /^-/, // 以-开头可能被解释为选项
            /\s/, // 空格字符
            /[\x00-\x1f\x7f-\x9f]/ // 控制字符
        ];
        
        return !dangerousPatterns.some(pattern => pattern.test(fileName));
    }
    
    // 验证命令安全性
    validateCommand(command, policy) {
        const blockedCommands = policy.blockedCommands || [];
        
        // 检查是否包含被禁止的命令
        for (const blockedCmd of blockedCommands) {
            if (command.includes(blockedCmd)) {
                throw new Error(`检测到被禁止的命令: ${blockedCmd}`);
            }
        }
        
        return true;
    }
}

module.exports = new DockerService();