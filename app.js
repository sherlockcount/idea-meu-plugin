// Idea to MEU - 智能项目构建助手
// 常规网页版本

// 全局变量
let currentProject = null;
let currentMode = 'stepByStep'; // 'stepByStep' or 'auto'
let isProcessing = false;
let isOnline = navigator.onLine;
let connectionRetryCount = 0;
const MAX_CONNECTION_RETRIES = 3;

// API配置
const API_BASE_URL = 'http://localhost:3000';
const API_TIMEOUT = 60000; // 60秒超时
const MAX_RETRIES = 3;

// DOM元素
const elements = {
    // 输入相关
    ideaInput: null,
    complexitySelect: null,
    languageSelect: null,
    charCount: null,
    analyzeBtn: null,
    downloadBtn: null,
    continueBtn: null,
    
    // 结果相关
    resultsArea: null,
    outputContent: null,
    codeContent: null,
    
    // 标签页相关
    tabButtons: null,
    tabContents: null,
    
    // MEU相关
    stepByStepMode: null,
    autoMode: null,
    projectProgress: null,
    progressBar: null,
    progressText: null,
    stepsList: null,
    meuActions: null,
    executeStepBtn: null,
    modifyStepBtn: null,
    
    // 历史记录相关
    historyList: null,
    clearHistoryBtn: null,
    
    // 加载和状态相关
    loadingOverlay: null,
    loadingText: null,
    
    // 状态指示器
    statusIndicator: null
};

// 网络连接检查
async function checkConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            timeout: 5000
        });
        return response.ok;
    } catch (error) {
        console.warn('Connection check failed:', error);
        return false;
    }
}

// 更新连接状态
function updateConnectionStatus(connected) {
    const statusIndicator = elements.statusIndicator;
    if (statusIndicator) {
        const dot = statusIndicator.querySelector('div');
        const text = statusIndicator.querySelector('span');
        if (connected) {
            dot.className = 'w-3 h-3 bg-green-400 rounded-full animate-pulse';
            text.textContent = '就绪';
        } else {
            dot.className = 'w-3 h-3 bg-red-400 rounded-full animate-pulse';
            text.textContent = '离线';
        }
    }
}

// API调用函数
async function apiCall(endpoint, options = {}, retries = MAX_RETRIES) {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        timeout: API_TIMEOUT
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            // 创建带超时的fetch请求
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), finalOptions.timeout);
            
            const response = await fetch(url, {
                ...finalOptions,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            // 重置连接重试计数
            connectionRetryCount = 0;
            updateConnectionStatus(true);
            
            return data;
        } catch (error) {
            console.warn(`API call attempt ${attempt + 1} failed:`, error);
            
            if (attempt === retries) {
                connectionRetryCount++;
                if (connectionRetryCount >= MAX_CONNECTION_RETRIES) {
                    updateConnectionStatus(false);
                }
                throw error;
            }
            
            // 等待后重试
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
    }
}

// 初始化应用
function initApp() {
    console.log('Initializing Idea to MEU App...');
    
    // 初始化DOM元素
    initializeElements();
    
    // 设置事件监听器
    setupEventListeners();
    
    // 设置网络监听器
    setupNetworkListeners();
    
    // 加载历史记录
    loadHistory();
    
    // 检查连接状态
    checkConnection().then(updateConnectionStatus);
    
    console.log('App initialized successfully');
}

// 设置网络监听器
function setupNetworkListeners() {
    window.addEventListener('online', () => {
        isOnline = true;
        checkConnection().then(updateConnectionStatus);
    });
    
    window.addEventListener('offline', () => {
        isOnline = false;
        updateConnectionStatus(false);
    });
}

// 初始化DOM元素
function initializeElements() {
    elements.ideaInput = document.getElementById('ideaInput');
    elements.complexitySelect = document.getElementById('complexitySelect');
    elements.languageSelect = document.getElementById('languageSelect');
    elements.charCount = document.getElementById('charCount');
    elements.analyzeBtn = document.getElementById('analyzeBtn');
    elements.downloadBtn = document.getElementById('downloadBtn');
    elements.continueBtn = document.getElementById('continueBtn');
    elements.resultsArea = document.getElementById('resultsArea');
    elements.outputContent = document.getElementById('outputContent');
    elements.codeContent = document.getElementById('codeContent');
    elements.tabButtons = document.querySelectorAll('.tab-button');
    elements.tabContents = document.querySelectorAll('.tab-content');
    elements.stepByStepMode = document.getElementById('stepByStepMode');
    elements.autoMode = document.getElementById('autoMode');
    elements.projectProgress = document.getElementById('projectProgress');
    elements.progressBar = document.getElementById('progressBar');
    elements.progressText = document.getElementById('progressText');
    elements.stepsList = document.getElementById('stepsList');
    elements.meuActions = document.getElementById('meuActions');
    elements.executeStepBtn = document.getElementById('executeStepBtn');
    elements.modifyStepBtn = document.getElementById('modifyStepBtn');
    elements.historyList = document.getElementById('historyList');
    elements.clearHistoryBtn = document.getElementById('clearHistoryBtn');
    elements.loadingOverlay = document.getElementById('loadingOverlay');
    elements.loadingText = document.getElementById('loadingText');
    elements.statusIndicator = document.getElementById('statusIndicator');
}

// 设置事件监听器
function setupEventListeners() {
    // 输入相关事件
    elements.ideaInput?.addEventListener('input', updateCharCount);
    elements.analyzeBtn?.addEventListener('click', handleAnalyze);
    elements.downloadBtn?.addEventListener('click', handleDownload);
    elements.continueBtn?.addEventListener('click', handleContinue);
    
    // 标签页切换
    setupTabSwitching();
    
    // MEU模式切换
    elements.stepByStepMode?.addEventListener('click', () => setMode('stepByStep'));
    elements.autoMode?.addEventListener('click', () => setMode('auto'));
    
    // MEU操作按钮
    elements.executeStepBtn?.addEventListener('click', executeCurrentStep);
    elements.modifyStepBtn?.addEventListener('click', modifyCurrentStep);
    
    // 历史记录
    elements.clearHistoryBtn?.addEventListener('click', clearHistory);
    
    // 键盘快捷键
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// 设置标签页切换
function setupTabSwitching() {
    elements.tabButtons?.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

// 切换标签页
function switchTab(tabName) {
    // 更新按钮状态
    elements.tabButtons?.forEach(button => {
        if (button.getAttribute('data-tab') === tabName) {
            button.className = button.className.replace('tab-inactive', 'tab-active');
        } else {
            button.className = button.className.replace('tab-active', 'tab-inactive');
        }
    });
    
    // 显示对应内容
    document.querySelectorAll('.tab-content').forEach(content => {
        if (content.id === `${tabName}Tab`) {
            content.classList.remove('hidden');
        } else {
            content.classList.add('hidden');
        }
    });
}

// 更新字符计数
function updateCharCount() {
    const input = elements.ideaInput;
    const counter = elements.charCount;
    
    if (input && counter) {
        const currentLength = input.value.length;
        const maxLength = input.getAttribute('maxlength') || 1000;
        counter.textContent = `${currentLength}/${maxLength}`;
        
        // 根据字符数改变颜色
        if (currentLength > maxLength * 0.9) {
            counter.className = 'absolute bottom-3 right-3 text-xs text-red-400';
        } else if (currentLength > maxLength * 0.7) {
            counter.className = 'absolute bottom-3 right-3 text-xs text-yellow-400';
        } else {
            counter.className = 'absolute bottom-3 right-3 text-xs text-gray-500';
        }
    }
}

// 设置执行模式
function setMode(mode) {
    currentMode = mode;
    
    // 更新按钮状态
    if (elements.stepByStepMode && elements.autoMode) {
        if (mode === 'stepByStep') {
            elements.stepByStepMode.className = elements.stepByStepMode.className.replace('mode-btn-inactive', 'mode-btn-active');
            elements.autoMode.className = elements.autoMode.className.replace('mode-btn-active', 'mode-btn-inactive');
        } else {
            elements.autoMode.className = elements.autoMode.className.replace('mode-btn-inactive', 'mode-btn-active');
            elements.stepByStepMode.className = elements.stepByStepMode.className.replace('mode-btn-active', 'mode-btn-inactive');
        }
    }
}

// 显示加载状态
function showLoading(message = '正在处理...') {
    if (elements.loadingOverlay && elements.loadingText) {
        elements.loadingText.textContent = message;
        elements.loadingOverlay.classList.remove('hidden');
    }
}

// 隐藏加载状态
function hideLoading() {
    if (elements.loadingOverlay) {
        elements.loadingOverlay.classList.add('hidden');
    }
}

// 更新状态
function updateStatus(status, message) {
    console.log(`Status: ${status} - ${message}`);
    
    // 可以在这里添加状态栏更新逻辑
    if (elements.statusIndicator) {
        const text = elements.statusIndicator.querySelector('span');
        if (text) {
            text.textContent = message || status;
        }
    }
}

// 显示通知
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl border transition-all duration-300 transform translate-x-full`;
    
    // 根据类型设置样式
    switch (type) {
        case 'success':
            notification.className += ' bg-green-900 border-green-700 text-green-100';
            break;
        case 'error':
            notification.className += ' bg-red-900 border-red-700 text-red-100';
            break;
        case 'warning':
            notification.className += ' bg-yellow-900 border-yellow-700 text-yellow-100';
            break;
        default:
            notification.className += ' bg-gray-900 border-gray-700 text-gray-100';
    }
    
    notification.innerHTML = `
        <div class="flex items-center space-x-3">
            <div class="flex-1">
                <p class="text-sm font-medium">${message}</p>
            </div>
            <button class="text-gray-400 hover:text-gray-200 transition-colors" onclick="this.parentElement.parentElement.remove()">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                </svg>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, 5000);
}

// 处理分析请求
async function handleAnalyze() {
    const idea = elements.ideaInput?.value?.trim();
    const complexity = elements.complexitySelect?.value;
    const language = elements.languageSelect?.value;
    
    if (!idea) {
        showNotification('请输入项目想法', 'warning');
        return;
    }
    
    if (isProcessing) {
        showNotification('正在处理中，请稍候...', 'warning');
        return;
    }
    
    try {
        isProcessing = true;
        showLoading('正在验证您的想法...');
        updateStatus('processing', '验证想法中');
        
        // 禁用按钮
        if (elements.analyzeBtn) {
            elements.analyzeBtn.disabled = true;
        }
        
        // 首先验证想法
        const validateResponse = await apiCall('/api/validate', {
            method: 'POST',
            body: JSON.stringify({
                idea,
                language
            })
        });
        
        if (!validateResponse.success || !validateResponse.data.valid) {
            throw new Error(validateResponse.data?.message || '想法验证失败');
        }
        
        showLoading('正在生成代码...');
        updateStatus('processing', '生成代码中');
        
        // 验证通过后生成代码
        const executeResponse = await apiCall('/api/execute', {
            method: 'POST',
            body: JSON.stringify({
                idea,
                language
            })
        });
        
        if (executeResponse.success && executeResponse.data) {
            displayResults(executeResponse.data);
            
            // 保存到历史记录（只有在有实际内容时）
            if (executeResponse.data && (executeResponse.data.code && executeResponse.data.code.trim() && executeResponse.data.code !== '// 代码生成中...' || executeResponse.data.plan)) {
                saveToHistory({
                    idea,
                    complexity,
                    language,
                    result: executeResponse.data,
                    timestamp: Date.now()
                });
            }
            
            showNotification('分析完成！', 'success');
            updateStatus('completed', '分析完成');
        } else {
            throw new Error(executeResponse.message || '代码生成失败');
        }
    } catch (error) {
        console.error('Analysis error:', error);
        showNotification(`分析失败: ${error.message}`, 'error');
        updateStatus('error', '分析失败');
    } finally {
        isProcessing = false;
        hideLoading();
        
        // 重新启用按钮
        if (elements.analyzeBtn) {
            elements.analyzeBtn.disabled = false;
        }
    }
}

// 显示分析结果
function displayResults(data) {
    if (!data) return;
    
    // 显示结果区域
    if (elements.resultsArea) {
        elements.resultsArea.classList.remove('hidden');
    }
    
    // 显示代码说明
    if (elements.outputContent && data.explanation) {
        elements.outputContent.textContent = data.explanation;
    }
    
    // 显示代码
    if (elements.codeContent && data.code) {
        const codeElement = elements.codeContent.querySelector('code');
        if (codeElement) {
            codeElement.textContent = data.code;
        }
    }
    
    // 显示执行结果
    if (data.result) {
        // 创建执行结果显示区域
        let executionResultDiv = document.getElementById('execution-result');
        if (!executionResultDiv) {
            executionResultDiv = document.createElement('div');
            executionResultDiv.id = 'execution-result';
            executionResultDiv.className = 'bg-gray-900 border border-gray-700 rounded-xl p-4 mt-4';
            elements.resultsArea.appendChild(executionResultDiv);
        }
        
        const resultHtml = `
            <h3 class="text-lg font-semibold text-gray-200 mb-3">执行结果</h3>
            <div class="space-y-2 text-sm">
                <p><span class="text-gray-400">状态:</span> <span class="${data.result.success ? 'text-green-400' : 'text-red-400'}">${data.result.success ? '成功' : '失败'}</span></p>
                <p><span class="text-gray-400">执行时间:</span> <span class="text-gray-200">${data.result.executionTime || data.totalTime}ms</span></p>
                ${data.confidence ? `<p><span class="text-gray-400">置信度:</span> <span class="text-gray-200">${Math.round(data.confidence * 100)}%</span></p>` : ''}
            </div>
            ${data.result.output ? `<div class="mt-4"><h4 class="text-md font-medium text-gray-300 mb-2">输出:</h4><pre class="bg-gray-800 p-3 rounded-lg text-gray-300 text-sm overflow-x-auto">${data.result.output}</pre></div>` : ''}
            ${data.result.error ? `<div class="mt-4"><h4 class="text-md font-medium text-red-400 mb-2">错误:</h4><pre class="bg-red-900 p-3 rounded-lg text-red-200 text-sm overflow-x-auto">${data.result.error}</pre></div>` : ''}
        `;
        
        executionResultDiv.innerHTML = resultHtml;
        executionResultDiv.style.display = 'block';
    }
    
    // 启用按钮
    const hasResult = data.explanation || data.code;
    const hasCode = data.code && data.code.trim() && data.code !== '// 代码生成中...';
    
    if (elements.downloadBtn) {
        elements.downloadBtn.disabled = !hasCode;
    }
    
    if (elements.continueBtn) {
        elements.continueBtn.disabled = !data.plan;
    }
    
    // 如果有MEU计划，切换到MEU标签页
    if (data.plan) {
        currentProject = {
            id: generateProjectId(),
            idea: elements.ideaInput?.value?.trim(),
            complexity: elements.complexitySelect?.value,
            language: elements.languageSelect?.value,
            plan: data.plan,
            steps: data.plan.steps || [],
            currentStepIndex: 0,
            status: 'ready'
        };
        
        displayMEUProject(currentProject);
    }
}

// 显示MEU项目
function displayMEUProject(project) {
    if (!project) return;
    
    updateProjectProgress(project);
    renderStepsList(project);
    
    // 显示项目进度和操作按钮
    if (elements.projectProgress) {
        elements.projectProgress.classList.remove('hidden');
    }
    if (elements.meuActions) {
        elements.meuActions.classList.remove('hidden');
    }
}

// 更新项目进度
function updateProjectProgress(project) {
    if (!project || !elements.progressBar || !elements.progressText) return;
    
    const completedSteps = project.steps.filter(step => step.status === 'completed').length;
    const totalSteps = project.steps.length;
    const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
    
    elements.progressBar.style.width = `${progress}%`;
    elements.progressText.textContent = `${completedSteps}/${totalSteps}`;
}

// 渲染步骤列表
function renderStepsList(project) {
    if (!project || !elements.stepsList) return;
    
    elements.stepsList.innerHTML = '';
    
    project.steps.forEach((step, index) => {
        const stepElement = createStepElement(step, index, index === project.currentStepIndex);
        elements.stepsList.appendChild(stepElement);
    });
}

// 创建步骤元素
function createStepElement(step, index, isCurrent) {
    const stepDiv = document.createElement('div');
    stepDiv.className = `bg-gray-900 border border-gray-700 rounded-xl p-4 transition-all duration-200 ${
        isCurrent ? 'ring-2 ring-gray-500' : ''
    }`;
    
    const statusIcon = getStatusIcon(step.status);
    const statusColor = getStatusColor(step.status);
    const statusText = getStatusText(step.status);
    
    stepDiv.innerHTML = `
        <div class="flex items-start space-x-4">
            <div class="flex-shrink-0">
                <div class="w-8 h-8 ${statusColor} rounded-full flex items-center justify-center">
                    ${statusIcon}
                </div>
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="text-sm font-semibold text-gray-200">
                        步骤 ${index + 1}: ${step.title}
                    </h4>
                    <span class="text-xs px-2 py-1 rounded-full ${statusColor} text-gray-200">
                        ${statusText}
                    </span>
                </div>
                <p class="text-sm text-gray-400 mb-3">${step.description}</p>
                ${step.code ? `
                    <div class="bg-gray-800 rounded-lg p-3 mt-3">
                        <pre class="text-xs text-gray-300 overflow-x-auto scrollbar-thin"><code>${step.code}</code></pre>
                    </div>
                ` : ''}
                ${step.result ? `
                    <div class="bg-gray-800 rounded-lg p-3 mt-3">
                        <p class="text-xs text-gray-300">${step.result}</p>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
    
    return stepDiv;
}

// 获取状态图标
function getStatusIcon(status) {
    switch (status) {
        case 'completed':
            return '<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>';
        case 'in_progress':
            return '<svg class="w-4 h-4 text-white animate-spin" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/></svg>';
        case 'error':
            return '<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>';
        default:
            return `<span class="text-white text-xs font-bold">${getStepNumber(status)}</span>`;
    }
}

// 获取状态颜色
function getStatusColor(status) {
    switch (status) {
        case 'completed':
            return 'bg-green-600';
        case 'in_progress':
            return 'bg-blue-600';
        case 'error':
            return 'bg-red-600';
        default:
            return 'bg-gray-600';
    }
}

// 获取状态文本
function getStatusText(status) {
    switch (status) {
        case 'completed':
            return '已完成';
        case 'in_progress':
            return '进行中';
        case 'error':
            return '错误';
        default:
            return '待执行';
    }
}

// 获取步骤编号
function getStepNumber(status) {
    return '•';
}

// 执行当前步骤
async function executeCurrentStep() {
    if (!currentProject || isProcessing) {
        showNotification('没有可执行的步骤', 'warning');
        return;
    }
    
    const currentStep = currentProject.steps[currentProject.currentStepIndex];
    if (!currentStep || currentStep.status === 'completed') {
        showNotification('当前步骤已完成或不存在', 'warning');
        return;
    }
    
    try {
        isProcessing = true;
        showLoading(`正在执行步骤 ${currentProject.currentStepIndex + 1}...`);
        
        // 更新步骤状态为进行中
        currentStep.status = 'in_progress';
        renderStepsList(currentProject);
        
        const response = await apiCall('/api/meu/execute', {
            method: 'POST',
            body: JSON.stringify({
                projectId: currentProject.id,
                stepIndex: currentProject.currentStepIndex,
                step: currentStep,
                context: {
                    idea: currentProject.idea,
                    language: currentProject.language,
                    previousSteps: currentProject.steps.slice(0, currentProject.currentStepIndex)
                }
            })
        });
        
        if (response.success && response.data) {
            // 更新步骤结果
            currentStep.status = 'completed';
            currentStep.code = response.data.code || currentStep.code;
            currentStep.result = response.data.result || currentStep.result;
            
            // 移动到下一步
            if (currentProject.currentStepIndex < currentProject.steps.length - 1) {
                currentProject.currentStepIndex++;
            }
            
            // 更新显示
            updateProjectProgress(currentProject);
            renderStepsList(currentProject);
            
            showNotification('步骤执行完成！', 'success');
            
            // 检查是否所有步骤都完成了
            const allCompleted = currentProject.steps.every(step => step.status === 'completed');
            if (allCompleted) {
                showNotification('项目执行完成！', 'success');
                
                // 保存完整项目到历史记录
                const completedSteps = currentProject.steps.filter(step => step.status === 'completed');
                const combinedCode = completedSteps
                    .map(step => step.code)
                    .filter(code => code && code.trim() && code !== '// 代码生成中...')
                    .join('\n\n');
                
                if (combinedCode) {
                    saveToHistory({
                        idea: currentProject.idea,
                        complexity: currentProject.complexity,
                        language: currentProject.language,
                        result: {
                            explanation: `MEU项目执行完成\n\n项目思路: ${currentProject.idea}\n复杂度: ${currentProject.complexity}\n编程语言: ${currentProject.language}\n\n共完成 ${completedSteps.length} 个步骤`,
                            code: combinedCode,
                            plan: currentProject.plan,
                            result: {
                                success: true,
                                executionTime: 0,
                                output: 'MEU项目执行完成'
                            },
                            confidence: 0.95
                        },
                        timestamp: Date.now()
                    });
                }
            }
            
            // 自动执行模式下继续执行下一步
            if (currentMode === 'auto' && currentProject.currentStepIndex < currentProject.steps.length && !allCompleted) {
                setTimeout(() => executeCurrentStep(), 1000);
            }
        } else {
            throw new Error(response.message || '步骤执行失败');
        }
    } catch (error) {
        console.error('Step execution error:', error);
        currentStep.status = 'error';
        currentStep.result = `执行失败: ${error.message}`;
        renderStepsList(currentProject);
        showNotification(`步骤执行失败: ${error.message}`, 'error');
    } finally {
        isProcessing = false;
        hideLoading();
    }
}

// 修改当前步骤
function modifyCurrentStep() {
    if (!currentProject) {
        showNotification('没有可修改的步骤', 'warning');
        return;
    }
    
    const currentStep = currentProject.steps[currentProject.currentStepIndex];
    if (!currentStep) {
        showNotification('当前步骤不存在', 'warning');
        return;
    }
    
    // 这里可以实现步骤修改的UI
    showNotification('步骤修改功能开发中...', 'info');
}

// 处理下载
function handleDownload() {
    if (currentProject && currentProject.steps.some(step => step.status === 'completed')) {
        downloadMEUProject();
    } else {
        // 下载单个分析结果
        const codeElement = elements.codeContent?.querySelector('code');
        if (codeElement && codeElement.textContent.trim()) {
            const language = elements.languageSelect?.value || 'javascript';
            const filename = `generated_code.${getFileExtension(language)}`;
            downloadFile(codeElement.textContent, filename);
        } else {
            showNotification('没有可下载的代码', 'warning');
        }
    }
}

// 下载MEU项目
function downloadMEUProject() {
    if (!currentProject) {
        showNotification('没有可下载的项目', 'warning');
        return;
    }
    
    const completedSteps = currentProject.steps.filter(step => step.status === 'completed');
    if (completedSteps.length === 0) {
        showNotification('没有已完成的步骤', 'warning');
        return;
    }
    
    // 合并所有步骤的代码
    const combinedCode = completedSteps
        .map((step, index) => `// 步骤 ${index + 1}: ${step.title}\n${step.code || ''}\n`)
        .join('\n');
    
    const language = currentProject.language || 'javascript';
    const filename = `meu_project_${currentProject.id}.${getFileExtension(language)}`;
    
    downloadFile(combinedCode, filename);
    showNotification('项目下载完成！', 'success');
}

// 处理继续按钮
function handleContinue() {
    if (currentProject) {
        switchTab('meu');
    } else {
        showNotification('没有可继续的项目', 'warning');
    }
}

// 获取文件扩展名
function getFileExtension(language) {
    const extensions = {
        javascript: 'js',
        python: 'py',
        html: 'html'
    };
    return extensions[language] || 'txt';
}

// 下载文件
function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 生成项目ID
function generateProjectId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 保存到历史记录
function saveToHistory(item) {
    try {
        let history = JSON.parse(localStorage.getItem('ideaToMeuHistory') || '[]');
        
        // 添加到历史记录开头
        history.unshift(item);
        
        // 限制历史记录数量
        if (history.length > 50) {
            history = history.slice(0, 50);
        }
        
        localStorage.setItem('ideaToMeuHistory', JSON.stringify(history));
        
        // 重新加载历史记录显示
        loadHistory();
    } catch (error) {
        console.error('Failed to save to history:', error);
    }
}

// 加载历史记录
function loadHistory() {
    try {
        const history = JSON.parse(localStorage.getItem('ideaToMeuHistory') || '[]');
        
        if (!elements.historyList) return;
        
        if (history.length === 0) {
            elements.historyList.innerHTML = `
                <div class="text-center py-12 text-gray-500">
                    <svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
                    </svg>
                    <p class="text-lg">暂无历史记录</p>
                </div>
            `;
            return;
        }
        
        elements.historyList.innerHTML = '';
        history.forEach((item, index) => {
            const historyItem = createHistoryItem(item, index);
            elements.historyList.appendChild(historyItem);
        });
    } catch (error) {
        console.error('Failed to load history:', error);
    }
}

// 创建历史记录项
function createHistoryItem(item, index) {
    const div = document.createElement('div');
    div.className = 'bg-gray-900 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-all duration-200';
    
    const date = new Date(item.timestamp).toLocaleString('zh-CN');
    const hasResult = item.result && (item.result.explanation || item.result.code || item.result.plan);
    const hasCode = item.result && item.result.code && item.result.code.trim() && item.result.code !== '// 代码生成中...';
    
    // 对于MEU项目，检查是否有已完成的步骤
    let fileCount = 0;
    if (item.result && item.result.plan && item.result.plan.steps) {
        const completedSteps = item.result.plan.steps.filter(step => 
            step.status === 'completed' && step.code && step.code.trim() && step.code !== '// 代码生成中...'
        );
        fileCount = completedSteps.length;
    } else if (hasCode) {
        fileCount = 1;
    }
    
    div.innerHTML = `
        <div class="flex items-start justify-between mb-3">
            <div class="flex-1">
                <h4 class="font-medium text-gray-200 mb-1 line-clamp-2">${item.idea}</h4>
                <div class="flex items-center space-x-4 text-xs text-gray-400">
                    <span>${item.language}</span>
                    <span>${item.complexity}</span>
                    <span>${date}</span>
                    ${item.result && item.result.confidence ? `<span>置信度: ${Math.round(item.result.confidence * 100)}%</span>` : ''}
                </div>
            </div>
            <div class="flex items-center space-x-2 ml-4">
                ${hasResult ? `
                    <span class="px-2 py-1 bg-green-900 text-green-300 text-xs rounded-full">
                        分析完成
                    </span>
                ` : ''}
                ${fileCount > 0 ? `
                    <span class="px-2 py-1 bg-blue-900 text-blue-300 text-xs rounded-full">
                        ${fileCount} 个文件
                    </span>
                ` : ''}
                ${item.result && item.result.result && item.result.result.success !== undefined ? `
                    <span class="px-2 py-1 ${item.result.result.success ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'} text-xs rounded-full">
                        ${item.result.result.success ? '执行成功' : '执行失败'}
                    </span>
                ` : ''}
            </div>
        </div>
        
        ${item.result && item.result.explanation ? `
            <div class="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-3">
                <h5 class="text-sm font-medium text-gray-300 mb-2">代码说明</h5>
                <p class="text-gray-400 text-sm">${item.result.explanation.substring(0, 200)}${item.result.explanation.length > 200 ? '...' : ''}</p>
            </div>
        ` : ''}
        
        ${item.result && item.result.result && (item.result.result.output || item.result.result.error) ? `
            <div class="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-3">
                <h5 class="text-sm font-medium text-gray-300 mb-2">执行结果</h5>
                <div class="text-sm">
                    <span class="${item.result.result.success ? 'text-green-400' : 'text-red-400'}">
                        ${item.result.result.success ? '✅ 执行成功' : '❌ 执行失败'}
                    </span>
                    ${item.result.result.executionTime ? ` (${item.result.result.executionTime}ms)` : ''}
                    ${item.result.result.output ? `<pre class="mt-2 text-xs text-gray-300 bg-gray-900 p-2 rounded">${item.result.result.output.substring(0, 100)}${item.result.result.output.length > 100 ? '...' : ''}</pre>` : ''}
                    ${item.result.result.error ? `<pre class="mt-2 text-xs text-red-300 bg-red-900 p-2 rounded">${item.result.result.error.substring(0, 100)}${item.result.result.error.length > 100 ? '...' : ''}</pre>` : ''}
                </div>
            </div>
        ` : ''}
        
        <div class="flex items-center space-x-2">
            <button onclick="loadHistoryItem(${index})" class="flex-1 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-gray-500 text-gray-300 py-2 px-3 rounded-lg transition-all duration-200">
                查看详情
            </button>
            ${hasCode ? `
                <button onclick="toggleCodePreview(${index})" class="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-gray-500 text-gray-300 py-2 px-3 rounded-lg transition-all duration-200">
                    预览代码
                </button>
                <button onclick="downloadHistoryItem(${index})" class="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-gray-500 text-gray-300 py-2 px-3 rounded-lg transition-all duration-200">
                    下载
                </button>
            ` : ''}
            <button onclick="removeHistoryItem(${index})" class="text-xs text-red-400 hover:text-red-300 py-2 px-3 rounded-lg transition-all duration-200">
                删除
            </button>
        </div>
        
        <div id="codePreview${index}" class="hidden mt-4 bg-gray-800 rounded-lg p-3">
            <pre class="text-xs text-gray-300 overflow-x-auto scrollbar-thin max-h-60"><code></code></pre>
        </div>
    `;
    
    return div;
}

// 加载历史记录项
function loadHistoryItem(index) {
    try {
        const history = JSON.parse(localStorage.getItem('ideaToMeuHistory') || '[]');
        const item = history[index];
        
        if (!item) return;
        
        // 填充输入字段
        if (elements.ideaInput) elements.ideaInput.value = item.idea || '';
        if (elements.complexitySelect) elements.complexitySelect.value = item.complexity || 'medium';
        if (elements.languageSelect) elements.languageSelect.value = item.language || 'javascript';
        
        // 更新字符计数
        updateCharCount();
        
        // 显示结果
        if (item.result) {
            displayResults(item.result);
            
            // 如果有MEU计划，重建项目状态
            if (item.result.plan) {
                currentProject = {
                    id: generateProjectId(),
                    idea: item.idea,
                    complexity: item.complexity,
                    language: item.language,
                    plan: item.result.plan,
                    steps: item.result.plan.steps || [],
                    currentStepIndex: 0,
                    status: 'ready'
                };
                
                displayMEUProject(currentProject);
            }
        }
        
        // 切换到输入标签页
        switchTab('input');
        
        showNotification('历史记录已加载', 'success');
    } catch (error) {
        console.error('Failed to load history item:', error);
        showNotification('加载历史记录失败', 'error');
    }
}

// 切换代码预览
function toggleCodePreview(index) {
    try {
        const history = JSON.parse(localStorage.getItem('ideaToMeuHistory') || '[]');
        const item = history[index];
        const previewElement = document.getElementById(`codePreview${index}`);
        
        if (!item || !previewElement) return;
        
        if (previewElement.classList.contains('hidden')) {
            // 显示代码预览
            const codeElement = previewElement.querySelector('code');
            if (codeElement && item.result && item.result.code) {
                codeElement.textContent = item.result.code;
            }
            previewElement.classList.remove('hidden');
        } else {
            // 隐藏代码预览
            previewElement.classList.add('hidden');
        }
    } catch (error) {
        console.error('Failed to toggle code preview:', error);
    }
}

// 下载历史记录项
function downloadHistoryItem(index) {
    try {
        const history = JSON.parse(localStorage.getItem('ideaToMeuHistory') || '[]');
        const item = history[index];
        
        if (!item || !item.result || !item.result.code) {
            showNotification('没有可下载的代码', 'warning');
            return;
        }
        
        const filename = `history_${index + 1}_${Date.now()}.${getFileExtension(item.language)}`;
        downloadFile(item.result.code, filename);
        showNotification('下载完成！', 'success');
    } catch (error) {
        console.error('Failed to download history item:', error);
        showNotification('下载失败', 'error');
    }
}

// 删除历史记录项
function removeHistoryItem(index) {
    try {
        let history = JSON.parse(localStorage.getItem('ideaToMeuHistory') || '[]');
        history.splice(index, 1);
        localStorage.setItem('ideaToMeuHistory', JSON.stringify(history));
        loadHistory();
        showNotification('历史记录已删除', 'success');
    } catch (error) {
        console.error('Failed to remove history item:', error);
        showNotification('删除失败', 'error');
    }
}

// 清空历史记录
function clearHistory() {
    if (confirm('确定要清空所有历史记录吗？此操作不可撤销。')) {
        localStorage.removeItem('ideaToMeuHistory');
        loadHistory();
        showNotification('历史记录已清空', 'success');
    }
}

// 处理键盘快捷键
function handleKeyboardShortcuts(event) {
    // Ctrl/Cmd + Enter: 分析
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (!isProcessing) {
            handleAnalyze();
        }
    }
    
    // Ctrl/Cmd + D: 下载
    if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
        event.preventDefault();
        handleDownload();
    }
    
    // Ctrl/Cmd + 1/2/3: 切换标签页
    if ((event.ctrlKey || event.metaKey) && ['1', '2', '3'].includes(event.key)) {
        event.preventDefault();
        const tabs = ['input', 'meu', 'history'];
        const tabIndex = parseInt(event.key) - 1;
        if (tabs[tabIndex]) {
            switchTab(tabs[tabIndex]);
        }
    }
}

// 全局函数（供HTML调用）
window.loadHistoryItem = loadHistoryItem;
window.toggleCodePreview = toggleCodePreview;
window.downloadHistoryItem = downloadHistoryItem;
window.removeHistoryItem = removeHistoryItem;

// 初始化应用
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}