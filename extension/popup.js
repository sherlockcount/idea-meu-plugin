// Idea to MEU Plugin - Modern UI with Tailwind CSS

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
    
    // 加载相关
    loadingOverlay: null,
    loadingText: null,
    
    // 状态指示器
    statusIndicator: null
};

// API调用辅助函数
// 检查网络连接
async function checkConnection() {
    if (!navigator.onLine) {
        throw new Error('网络连接已断开，请检查网络设置');
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
        });
        return response.ok;
    } catch (error) {
        return false;
    }
}

// 更新连接状态显示
function updateConnectionStatus(connected) {
    isOnline = connected;
    if (elements.statusIndicator) {
        elements.statusIndicator.className = connected 
            ? 'w-2 h-2 bg-green-500 rounded-full'
            : 'w-2 h-2 bg-red-500 rounded-full';
        elements.statusIndicator.title = connected ? '已连接' : '连接断开';
    }
}

async function apiCall(endpoint, options = {}, retries = MAX_RETRIES) {
    // 检查网络连接
    if (!navigator.onLine) {
        throw new Error('网络连接已断开，请检查网络设置');
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // 连接成功，重置重试计数
        connectionRetryCount = 0;
        updateConnectionStatus(true);
        
        if (!response.ok) {
            let errorMessage = `服务器错误 (${response.status})`;
            
            if (response.status === 429) {
                errorMessage = '请求过于频繁，请稍后再试';
            } else if (response.status === 500) {
                errorMessage = '服务器内部错误，请稍后再试';
            } else if (response.status === 503) {
                errorMessage = '服务暂时不可用，请稍后再试';
            }
            
            throw new Error(errorMessage);
        }
        
        return await response.json();
    } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
            throw new Error('请求超时，请检查网络连接');
        }
        
        // 网络连接错误处理
        if (error.name === 'TypeError' || error.message.includes('fetch')) {
            updateConnectionStatus(false);
            connectionRetryCount++;
            
            if (retries > 0 && connectionRetryCount <= MAX_CONNECTION_RETRIES) {
                console.log(`API调用失败，重试中... (剩余重试次数: ${retries - 1})`);
                showNotification(`连接失败，正在重试... (${connectionRetryCount}/${MAX_CONNECTION_RETRIES})`, 'warning');
                await new Promise(resolve => setTimeout(resolve, 2000 * connectionRetryCount)); // 递增延迟
                return apiCall(endpoint, options, retries - 1);
            } else {
                throw new Error('无法连接到服务器，请确保后端服务正在运行');
            }
        }
        
        throw error;
    }
}

// 初始化应用
function initApp() {
    initializeElements();
    setupEventListeners();
    setupTabSwitching();
    setupNetworkListeners();
    loadHistory();
    updateCharCount();
    updateStatus('ready', '准备就绪');
    
    // 初始连接状态检查
    checkConnection().then(connected => {
        updateConnectionStatus(connected);
    }).catch(() => {
        updateConnectionStatus(false);
    });
    
    console.log('Idea to MEU Plugin initialized with modern UI');
}

// 设置网络状态监听
function setupNetworkListeners() {
    window.addEventListener('online', () => {
        updateConnectionStatus(true);
        showNotification('网络连接已恢复', 'success');
        connectionRetryCount = 0;
    });
    
    window.addEventListener('offline', () => {
        updateConnectionStatus(false);
        showNotification('网络连接已断开', 'error');
    });
}

// 初始化DOM元素
function initializeElements() {
    // 输入相关
    elements.ideaInput = document.getElementById('ideaInput');
    elements.complexitySelect = document.getElementById('complexitySelect');
    elements.languageSelect = document.getElementById('languageSelect');
    elements.charCount = document.getElementById('charCount');
    elements.analyzeBtn = document.getElementById('analyzeBtn');
    elements.downloadBtn = document.getElementById('downloadBtn');
    elements.continueBtn = document.getElementById('continueBtn');
    
    // 结果相关
    elements.resultsArea = document.getElementById('resultsArea');
    elements.outputContent = document.getElementById('outputContent');
    elements.codeContent = document.getElementById('codeContent');
    
    // 标签页相关
    elements.tabButtons = document.querySelectorAll('.tab-button');
    elements.tabContents = document.querySelectorAll('.tab-content');
    
    // MEU相关
    elements.stepByStepMode = document.getElementById('stepByStepMode');
    elements.autoMode = document.getElementById('autoMode');
    elements.projectProgress = document.getElementById('projectProgress');
    elements.progressBar = document.getElementById('progressBar');
    elements.progressText = document.getElementById('progressText');
    elements.stepsList = document.getElementById('stepsList');
    elements.meuActions = document.getElementById('meuActions');
    elements.executeStepBtn = document.getElementById('executeStepBtn');
    elements.modifyStepBtn = document.getElementById('modifyStepBtn');
    
    // 历史记录相关
    elements.historyList = document.getElementById('historyList');
    elements.clearHistoryBtn = document.getElementById('clearHistoryBtn');
    
    // 加载相关
    elements.loadingOverlay = document.getElementById('loadingOverlay');
    elements.loadingText = document.getElementById('loadingText');
    
    // 状态指示器
    elements.statusIndicator = document.getElementById('statusIndicator');
}

// 设置事件监听器
function setupEventListeners() {
    // 输入相关事件
    elements.ideaInput?.addEventListener('input', updateCharCount);
    elements.analyzeBtn?.addEventListener('click', handleAnalyze);
    elements.downloadBtn?.addEventListener('click', handleDownload);
    elements.continueBtn?.addEventListener('click', handleContinue);
    
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
    elements.tabButtons?.forEach(btn => {
        if (btn.getAttribute('data-tab') === tabName) {
            btn.className = 'tab-button px-6 py-3 rounded-lg font-medium transition-all duration-200 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg';
        } else {
            btn.className = 'tab-button px-6 py-3 rounded-lg font-medium transition-all duration-200 bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-slate-200';
        }
    });
    
    // 显示对应内容
    elements.tabContents?.forEach(content => {
        if (content.id === `${tabName}Tab`) {
            content.classList.remove('hidden');
        } else {
            content.classList.add('hidden');
        }
    });
}

// 更新字符计数
function updateCharCount() {
    if (elements.ideaInput && elements.charCount) {
        const count = elements.ideaInput.value.length;
        elements.charCount.textContent = `${count}/1000`;
        
        // 根据字符数改变颜色
        if (count > 800) {
            elements.charCount.className = 'absolute bottom-3 right-3 text-xs text-red-400';
        } else if (count > 600) {
            elements.charCount.className = 'absolute bottom-3 right-3 text-xs text-yellow-400';
        } else {
            elements.charCount.className = 'absolute bottom-3 right-3 text-xs text-gray-400';
        }
    }
}

// 设置执行模式
function setMode(mode) {
    currentMode = mode;
    
    if (mode === 'stepByStep') {
        elements.stepByStepMode?.classList.add('border-indigo-500', 'bg-indigo-900', 'text-indigo-300');
        elements.stepByStepMode?.classList.remove('border-slate-600', 'bg-slate-700', 'text-slate-300');
        elements.autoMode?.classList.remove('border-indigo-500', 'bg-indigo-900', 'text-indigo-300');
        elements.autoMode?.classList.add('border-slate-600', 'bg-slate-700', 'text-slate-300');
    } else {
        elements.autoMode?.classList.add('border-indigo-500', 'bg-indigo-900', 'text-indigo-300');
        elements.autoMode?.classList.remove('border-slate-600', 'bg-slate-700', 'text-slate-300');
        elements.stepByStepMode?.classList.remove('border-indigo-500', 'bg-indigo-900', 'text-indigo-300');
        elements.stepByStepMode?.classList.add('border-slate-600', 'bg-slate-700', 'text-slate-300');
    }
}

// 显示加载状态
function showLoading(message = '正在处理...') {
    if (elements.loadingOverlay && elements.loadingText) {
        elements.loadingText.textContent = message;
        elements.loadingOverlay.classList.remove('hidden');
    }
    isProcessing = true;
}

// 隐藏加载状态
function hideLoading() {
    if (elements.loadingOverlay) {
        elements.loadingOverlay.classList.add('hidden');
    }
    isProcessing = false;
}

// 更新状态指示器
function updateStatus(status, message) {
    if (!elements.statusIndicator) return;
    
    const dot = elements.statusIndicator.querySelector('div');
    const text = elements.statusIndicator.querySelector('span');
    
    if (dot && text) {
        // 移除所有状态类
        dot.className = 'w-2 h-2 rounded-full';
        
        switch (status) {
            case 'ready':
                dot.classList.add('bg-green-400', 'animate-pulse');
                text.textContent = message || '就绪';
                break;
            case 'processing':
                dot.classList.add('bg-yellow-400', 'animate-pulse');
                text.textContent = message || '处理中';
                break;
            case 'error':
                dot.classList.add('bg-red-400');
                text.textContent = message || '错误';
                break;
            case 'success':
                dot.classList.add('bg-blue-400');
                text.textContent = message || '完成';
                break;
        }
    }
}

// 处理分析请求
async function handleAnalyze() {
    if (isProcessing) return;
    
    const idea = elements.ideaInput?.value.trim();
    if (!idea) {
        showNotification('请输入您的项目想法', 'warning');
        return;
    }
    
    const complexity = elements.complexitySelect?.value || 'medium';
    const language = elements.languageSelect?.value || 'javascript';
    
    try {
        showLoading('正在分析您的想法...');
        updateStatus('processing', '分析中');
        
        const result = await apiCall('/api/meu/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                idea,
                complexity,
                language
            })
        });
        
        if (result.success) {
            displayResults(result.data);
            
            // 只有在有实际代码内容时才保存到历史记录
            if (result.data && (result.data.code && result.data.code !== '// 代码生成中...' || result.data.plan)) {
                saveToHistory({
                    idea,
                    complexity,
                    language,
                    result: result.data,
                    timestamp: new Date().toISOString()
                });
            }
            
            updateStatus('success', '分析完成');
        } else {
            throw new Error(result.error || '分析失败');
        }
        
    } catch (error) {
        console.error('Analysis error:', error);
        let errorMessage = '分析失败';
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = '无法连接到服务器，请确保后端服务正在运行';
        } else if (error.message.includes('HTTP error')) {
            errorMessage = `服务器错误: ${error.message}`;
        } else {
            errorMessage = `分析失败: ${error.message}`;
        }
        
        showNotification(errorMessage, 'error');
        updateStatus('error', '分析失败');
    } finally {
        hideLoading();
    }
}

// 显示结果
function displayResults(data) {
    if (elements.resultsArea) {
        elements.resultsArea.classList.remove('hidden');
    }
    
    if (elements.outputContent) {
        elements.outputContent.textContent = data.explanation || '分析完成';
    }
    
    if (elements.codeContent) {
        elements.codeContent.textContent = data.code || '// 代码生成中...';
    }
    
    // 启用操作按钮
    if (elements.downloadBtn) {
        elements.downloadBtn.disabled = false;
    }
    if (elements.continueBtn) {
        elements.continueBtn.disabled = false;
    }
    
    // 如果有MEU计划，切换到MEU标签页并显示
    if (data.plan || data.meuPlan) {
        currentProject = {
            id: data.projectId || generateProjectId(),
            idea: elements.ideaInput?.value,
            language: elements.languageSelect?.value || 'javascript',
            plan: data.plan || data.meuPlan,
            currentStep: 0,
            status: 'ready'
        };
        
        displayMEUProject(currentProject);
        switchTab('meu');
    }
}

// 显示MEU项目
function displayMEUProject(project) {
    if (!project || !project.plan) return;
    
    // 显示项目进度
    if (elements.projectProgress) {
        elements.projectProgress.classList.remove('hidden');
    }
    
    updateProjectProgress(project);
    renderStepsList(project);
    
    // 显示操作按钮
    if (elements.meuActions) {
        elements.meuActions.classList.remove('hidden');
    }
}

// 更新项目进度
function updateProjectProgress(project) {
    if (!project || !project.plan) return;
    
    const totalSteps = project.plan.steps ? project.plan.steps.length : 0;
    const completedSteps = project.plan.steps ? project.plan.steps.filter(step => step.status === 'completed').length : 0;
    const progressPercentage = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
    
    if (elements.progressText) {
        elements.progressText.textContent = `${completedSteps}/${totalSteps}`;
    }
    
    if (elements.progressBar) {
        elements.progressBar.style.width = `${progressPercentage}%`;
    }
}

// 渲染步骤列表
function renderStepsList(project) {
    if (!elements.stepsList || !project.plan.steps) return;
    
    elements.stepsList.innerHTML = '';
    
    project.plan.steps.forEach((step, index) => {
        const stepElement = createStepElement(step, index, project.currentStep === index);
        elements.stepsList.appendChild(stepElement);
    });
}

// 创建步骤元素
function createStepElement(step, index, isCurrent) {
    const div = document.createElement('div');
    div.className = `bg-slate-700 rounded-xl border-2 p-4 transition-all duration-200 ${
        isCurrent ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-slate-600'
    }`;
    
    const statusIcon = getStatusIcon(step.status);
    const statusColor = getStatusColor(step.status);
    
    div.innerHTML = `
        <div class="flex items-start space-x-3">
            <div class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${statusColor}">
                ${statusIcon}
            </div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                    <h4 class="text-sm font-semibold text-slate-200 truncate">
                        步骤 ${index + 1}: ${step.title || step.description}
                    </h4>
                    <span class="text-xs px-2 py-1 rounded-full ${
                        step.status === 'completed' ? 'bg-green-100 text-green-800' :
                        step.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        step.status === 'error' ? 'bg-red-900 text-red-300' :
                        'bg-slate-600 text-slate-300'
                    }">
                        ${getStatusText(step.status)}
                    </span>
                </div>
                <p class="text-sm text-slate-400 mt-1">${step.description}</p>
                ${step.code ? `<div class="mt-2">
                    <div class="text-xs text-slate-400 mb-1">生成的代码:</div>
                    <pre class="text-xs bg-slate-800 p-2 rounded overflow-x-auto text-slate-300"><code>${step.code}</code></pre>
                </div>` : ''}
                ${step.output ? `<div class="mt-2">
                    <div class="text-xs text-slate-400 mb-1">执行输出:</div>
                    <pre class="text-xs bg-green-900/20 border border-green-700 p-2 rounded overflow-x-auto text-green-300"><code>${step.output}</code></pre>
                </div>` : ''}
                ${step.executionResult && step.executionResult.error ? `<div class="mt-2">
                    <div class="text-xs text-red-400 mb-1">执行错误:</div>
                    <pre class="text-xs bg-red-900/20 border border-red-700 p-2 rounded overflow-x-auto text-red-300"><code>${step.executionResult.error}</code></pre>
                </div>` : ''}
                ${step.error ? `<div class="mt-2">
                    <div class="text-xs text-red-400 mb-1">错误信息:</div>
                    <pre class="text-xs bg-red-900/20 border border-red-700 p-2 rounded overflow-x-auto text-red-300"><code>${step.error}</code></pre>
                </div>` : ''}
            </div>
        </div>
    `;
    
    return div;
}

// 获取状态图标
function getStatusIcon(status) {
    switch (status) {
        case 'completed':
            return '<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>';
        case 'in_progress':
            return '<svg class="w-4 h-4 text-white animate-spin" fill="currentColor" viewBox="0 0 20 20"><path d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"/></svg>';
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
            return 'bg-green-500';
        case 'in_progress':
            return 'bg-blue-500';
        case 'error':
            return 'bg-red-500';
        default:
            return 'bg-gray-400';
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
    // 这里可以根据实际需要返回步骤编号
    return '•';
}

// 执行当前步骤
async function executeCurrentStep() {
    if (!currentProject || isProcessing) return;
    
    const currentStep = currentProject.plan.steps[currentProject.currentStep];
    if (!currentStep) return;
    
    try {
        showLoading(`正在执行步骤 ${currentProject.currentStep + 1}...`);
        updateStatus('processing', '执行中');
        
        // 更新步骤状态为进行中
        currentStep.status = 'in_progress';
        renderStepsList(currentProject);
        
        const result = await apiCall(`/api/meu/execute/${currentProject.id}/${currentProject.currentStep + 1}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                idea: currentStep.description || currentStep.title,
                language: currentProject.language || 'javascript'
            })
        });
        
        if (result.success) {
            // 更新步骤状态为完成
            currentStep.status = 'completed';
            if (result.data && result.data.code) {
                currentStep.code = result.data.code;
            }
            if (result.data && result.data.output) {
                currentStep.output = result.data.output;
            }
            if (result.data && result.data.executionResult) {
                currentStep.executionResult = result.data.executionResult;
            }
            
            // 移动到下一步
            const completedStepNumber = currentProject.currentStep + 1;
            currentProject.currentStep++;
            
            // 更新显示
            updateProjectProgress(currentProject);
            renderStepsList(currentProject);
            
            updateStatus('success', '步骤完成');
            showNotification(`步骤 ${completedStepNumber} 执行完成`, 'success');
            
            // 如果是自动模式且还有下一步，继续执行
            if (currentMode === 'auto' && currentProject.currentStep < currentProject.plan.steps.length) {
                setTimeout(() => executeCurrentStep(), 1000);
            }
            
            // 如果所有步骤都完成了，保存到历史记录
            if (currentProject.currentStep >= currentProject.plan.steps.length) {
                const completedSteps = currentProject.plan.steps.filter(step => step.status === 'completed');
                const allCode = completedSteps.map(step => step.code).filter(code => code).join('\n\n');
                
                if (allCode) {
                    saveToHistory({
                        idea: currentProject.idea,
                        complexity: 'MEU项目',
                        language: currentProject.language,
                        result: {
                            code: allCode,
                            explanation: `MEU项目完成 - ${completedSteps.length}个步骤`,
                            plan: currentProject.plan
                        },
                        timestamp: new Date().toISOString()
                    });
                }
            }
        } else {
            throw new Error(result.error || result.message || '步骤执行失败');
        }
        
    } catch (error) {
        console.error('Step execution error:', error);
        currentStep.status = 'error';
        currentStep.error = error.message;
        renderStepsList(currentProject);
        
        let errorMessage = '步骤执行失败';
        let canRetry = false;
        
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = '无法连接到服务器，请检查网络连接';
            canRetry = true;
        } else if (error.message.includes('请求超时')) {
            errorMessage = '请求超时，请稍后重试';
            canRetry = true;
        } else if (error.message.includes('服务器错误')) {
            errorMessage = `服务器错误: ${error.message}`;
            canRetry = true;
        } else if (error.message.includes('请求过于频繁')) {
            errorMessage = '请求过于频繁，请稍后再试';
            canRetry = true;
        } else {
            errorMessage = `步骤执行失败: ${error.message}`;
        }
        
        showNotification(errorMessage, 'error');
        updateStatus('error', '执行失败');
        
        // 如果可以重试，显示重试按钮
        if (canRetry) {
            setTimeout(() => {
                if (confirm(`${errorMessage}\n\n是否重试执行此步骤？`)) {
                    currentStep.status = 'pending';
                    executeCurrentStep();
                }
            }, 1000);
        }
    } finally {
        hideLoading();
        isProcessing = false;
    }
}

// 修改当前步骤
function modifyCurrentStep() {
    if (!currentProject) return;
    
    const currentStep = currentProject.plan.steps[currentProject.currentStep];
    if (!currentStep) return;
    
    // 这里可以实现步骤修改的逻辑
    const newDescription = prompt('修改步骤描述:', currentStep.description);
    if (newDescription && newDescription !== currentStep.description) {
        currentStep.description = newDescription;
        renderStepsList(currentProject);
        showNotification('步骤已修改', 'success');
    }
}

// 处理下载
function handleDownload() {
    // 如果有MEU项目，下载项目文件
    if (currentProject && currentProject.plan && currentProject.plan.steps) {
        downloadMEUProject();
        return;
    }
    
    // 否则下载单个代码文件
    if (!elements.codeContent) return;
    
    const code = elements.codeContent.textContent;
    if (!code || code === '// 代码生成中...') {
        showNotification('没有可下载的代码', 'warning');
        return;
    }
    
    const language = elements.languageSelect?.value || 'javascript';
    const extension = getFileExtension(language);
    const filename = `generated_code.${extension}`;
    
    downloadFile(code, filename);
    showNotification('代码已下载', 'success');
}

// 下载MEU项目文件
function downloadMEUProject() {
    if (!currentProject) return;
    
    const completedSteps = currentProject.plan.steps.filter(step => step.status === 'completed' && step.code);
    
    if (completedSteps.length === 0) {
        showNotification('没有已完成的步骤可下载', 'warning');
        return;
    }
    
    const language = currentProject.language || 'javascript';
    const extension = getFileExtension(language);
    
    // 下载每个步骤的代码文件
    completedSteps.forEach((step, index) => {
        const stepNumber = currentProject.plan.steps.indexOf(step) + 1;
        const filename = `step_${stepNumber}_${step.title.replace(/[^a-zA-Z0-9]/g, '_')}.${extension}`;
        downloadFile(step.code, filename);
    });
    
    // 创建项目总结文件
    const summary = `项目: ${currentProject.idea}\n语言: ${language}\n\n步骤总结:\n${completedSteps.map((step, index) => {
        const stepNumber = currentProject.plan.steps.indexOf(step) + 1;
        return `${stepNumber}. ${step.title}\n   ${step.description}\n   状态: ${getStatusText(step.status)}${step.output ? '\n   输出: ' + step.output : ''}`;
    }).join('\n\n')}`;
    
    downloadFile(summary, 'project_summary.txt');
    
    showNotification(`已下载 ${completedSteps.length + 1} 个文件`, 'success');
}

// 处理继续
function handleContinue() {
    // 切换到MEU标签页
    switchTab('meu');
    showNotification('已切换到MEU模式', 'info');
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
    return 'project_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// 显示通知
function showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full`;
    
    // 根据类型设置样式
    switch (type) {
        case 'success':
            notification.classList.add('bg-green-500', 'text-white');
            break;
        case 'error':
            notification.classList.add('bg-red-500', 'text-white');
            break;
        case 'warning':
            notification.classList.add('bg-yellow-500', 'text-white');
            break;
        default:
            notification.classList.add('bg-blue-500', 'text-white');
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // 显示动画
    setTimeout(() => {
        notification.classList.remove('translate-x-full');
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// 保存到历史记录
function saveToHistory(item) {
    try {
        const history = JSON.parse(localStorage.getItem('ideaToMeuHistory') || '[]');
        history.unshift(item);
        
        // 限制历史记录数量
        if (history.length > 50) {
            history.splice(50);
        }
        
        localStorage.setItem('ideaToMeuHistory', JSON.stringify(history));
        loadHistory();
    } catch (error) {
        console.error('Failed to save history:', error);
    }
}

// 加载历史记录
function loadHistory() {
    if (!elements.historyList) return;
    
    try {
        const history = JSON.parse(localStorage.getItem('ideaToMeuHistory') || '[]');
        
        if (history.length === 0) {
            elements.historyList.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <svg class="w-12 h-12 mx-auto mb-3 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
                    </svg>
                    <p class="text-sm">暂无历史记录</p>
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
    div.className = 'bg-slate-700 rounded-lg border border-slate-600 p-4 hover:bg-slate-600 hover:shadow-lg transition-all duration-200';
    
    const date = new Date(item.timestamp).toLocaleString('zh-CN');
    const hasResult = item.result && (item.result.code || item.result.output || item.result.plan);
    const hasCode = item.result && item.result.code && item.result.code !== '// 代码生成中...' && item.result.code.trim() !== '';
    const fileCount = item.result && item.result.plan ? item.result.plan.steps.filter(step => step.status === 'completed' && step.code).length : (hasCode ? 1 : 0);
    const hasFiles = fileCount > 0;
    
    div.innerHTML = `
        <div class="space-y-3">
            <!-- 基本信息 -->
            <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0 cursor-pointer" onclick="loadHistoryItem(${index})">
                    <h4 class="text-sm font-semibold text-slate-200 truncate">${item.idea}</h4>
                    <div class="flex items-center space-x-2 mt-1">
                        <span class="text-xs px-2 py-1 bg-indigo-900 text-indigo-300 rounded">${item.language}</span>
                        <span class="text-xs px-2 py-1 bg-slate-600 text-slate-300 rounded">${item.complexity}</span>
                        ${hasResult ? '<span class="text-xs px-2 py-1 bg-green-900 text-green-300 rounded">已完成</span>' : '<span class="text-xs px-2 py-1 bg-yellow-900 text-yellow-300 rounded">未完成</span>'}
                    </div>
                    <p class="text-xs text-slate-400 mt-2">${date}</p>
                    ${hasFiles ? `<p class="text-xs text-slate-300 mt-1">生成文件: ${fileCount} 个</p>` : ''}
                </div>
                <button class="text-slate-400 hover:text-red-400 transition-colors duration-200" onclick="removeHistoryItem(${index})">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
                    </svg>
                </button>
            </div>
            
            <!-- 代码预览和操作按钮 -->
            ${hasResult ? `
                <div class="border-t border-slate-600 pt-3">
                    ${hasCode ? `
                        <div class="mb-3">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-xs font-medium text-slate-300">生成的代码:</span>
                                <button class="text-xs text-indigo-400 hover:text-indigo-300" onclick="toggleCodePreview(${index})">
                                    <span id="toggleText_${index}">显示代码</span>
                                </button>
                            </div>
                            <div id="codePreview_${index}" class="hidden bg-slate-800 rounded p-3 text-xs font-mono text-slate-300 max-h-32 overflow-y-auto">
                                <pre class="whitespace-pre-wrap">${item.result.code.substring(0, 500)}${item.result.code.length > 500 ? '...' : ''}</pre>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="flex space-x-2">
                        <button class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-2 px-3 rounded font-medium transition-colors" onclick="loadHistoryItem(${index})">
                            📋 加载项目
                        </button>
                        ${hasCode ? `
                            <button class="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 px-3 rounded font-medium transition-colors" onclick="downloadHistoryItem(${index})">
                                💾 下载代码
                            </button>
                        ` : ''}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
    
    return div;
}

// 加载历史记录项
function loadHistoryItem(index) {
    try {
        const history = JSON.parse(localStorage.getItem('ideaToMeuHistory') || '[]');
        const item = history[index];
        
        if (!item) {
            showNotification('历史记录不存在', 'error');
            return;
        }
        
        if (elements.ideaInput) {
            elements.ideaInput.value = item.idea;
            updateCharCount();
        }
        
        if (elements.complexitySelect) {
            elements.complexitySelect.value = item.complexity;
        }
        
        if (elements.languageSelect) {
            elements.languageSelect.value = item.language;
        }
        
        if (item.result) {
            displayResults(item.result);
        }
        
        // 切换到输入标签页
        switchTab('input');
        showNotification('历史记录已加载', 'success');
    } catch (error) {
        console.error('Failed to load history item:', error);
        showNotification('加载历史记录失败', 'error');
    }
}

// 切换代码预览显示
function toggleCodePreview(index) {
    const preview = document.getElementById(`codePreview_${index}`);
    const toggleText = document.getElementById(`toggleText_${index}`);
    
    if (preview && toggleText) {
        if (preview.classList.contains('hidden')) {
            preview.classList.remove('hidden');
            toggleText.textContent = '隐藏代码';
        } else {
            preview.classList.add('hidden');
            toggleText.textContent = '显示代码';
        }
    }
}

// 下载历史记录项的代码
function downloadHistoryItem(index) {
    try {
        const history = JSON.parse(localStorage.getItem('ideaToMeuHistory') || '[]');
        const item = history[index];
        
        if (!item || !item.result || !item.result.code) {
            showNotification('没有可下载的代码', 'error');
            return;
        }
        
        const filename = `${item.idea.substring(0, 20).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.${getFileExtension(item.language)}`;
        downloadFile(item.result.code, filename);
        showNotification('代码下载成功', 'success');
    } catch (error) {
        console.error('Failed to download history item:', error);
        showNotification('下载失败', 'error');
    }
}

// 删除历史记录项
function removeHistoryItem(index) {
    try {
        const history = JSON.parse(localStorage.getItem('ideaToMeuHistory') || '[]');
        history.splice(index, 1);
        localStorage.setItem('ideaToMeuHistory', JSON.stringify(history));
        loadHistory();
        showNotification('历史记录已删除', 'success');
    } catch (error) {
        console.error('Failed to remove history item:', error);
    }
}

// 清空历史记录
function clearHistory() {
    if (confirm('确定要清空所有历史记录吗？')) {
        localStorage.removeItem('ideaToMeuHistory');
        loadHistory();
        showNotification('历史记录已清空', 'success');
    }
}

// 处理键盘快捷键
function handleKeyboardShortcuts(event) {
    // Ctrl/Cmd + Enter: 执行分析
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (!isProcessing) {
            handleAnalyze();
        }
    }
    
    // Ctrl/Cmd + K: 聚焦输入框
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        elements.ideaInput?.focus();
    }
    
    // Esc: 清空输入
    if (event.key === 'Escape') {
        if (elements.ideaInput) {
            elements.ideaInput.value = '';
            updateCharCount();
        }
    }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// 导出函数供全局使用
window.removeHistoryItem = removeHistoryItem;