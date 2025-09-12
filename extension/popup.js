// 全局变量
let currentExecutionId = null;
let isExecuting = false;

// DOM 元素
const elements = {
  ideaInput: null,
  executeBtn: null,
  clearBtn: null,
  loadingSection: null,
  resultsSection: null,
  statusIndicator: null,
  statusText: null,
  outputContent: null,
  codeContent: null,
  logsContent: null,
  historyList: null,
  downloadBtn: null,
  continueBtn: null,
  clearHistoryBtn: null,
  loadingMessage: null
};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
  initializeElements();
  bindEvents();
  loadHistory();
  updateStatus('就绪', 'ready');
});

// 初始化DOM元素
function initializeElements() {
  elements.ideaInput = document.getElementById('ideaInput');
  elements.executeBtn = document.getElementById('executeBtn');
  elements.clearBtn = document.getElementById('clearBtn');
  elements.loadingSection = document.getElementById('loadingSection');
  elements.resultsSection = document.getElementById('resultsSection');
  elements.statusIndicator = document.getElementById('statusIndicator');
  elements.statusText = elements.statusIndicator?.querySelector('.status-text');
  elements.outputContent = document.getElementById('outputContent');
  elements.codeContent = document.getElementById('codeContent');
  elements.logsContent = document.getElementById('logsContent');
  elements.historyList = document.getElementById('historyList');
  elements.downloadBtn = document.getElementById('downloadBtn');
  elements.continueBtn = document.getElementById('continueBtn');
  elements.clearHistoryBtn = document.getElementById('clearHistoryBtn');
  elements.loadingMessage = document.getElementById('loadingMessage');
}

// 绑定事件
function bindEvents() {
  // 执行按钮
  elements.executeBtn?.addEventListener('click', handleExecute);
  
  // 清空按钮
  elements.clearBtn?.addEventListener('click', () => {
    elements.ideaInput.value = '';
    elements.ideaInput.focus();
  });
  
  // 下载按钮
  elements.downloadBtn?.addEventListener('click', handleDownload);
  
  // 继续按钮
  elements.continueBtn?.addEventListener('click', handleContinue);
  
  // 清空历史按钮
  elements.clearHistoryBtn?.addEventListener('click', handleClearHistory);
  
  // Tab切换
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      switchTab(e.target.dataset.tab);
    });
  });
  
  // 输入框键盘事件
  elements.ideaInput?.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter 执行
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleExecute();
    }
    
    // Escape 清空输入
    if (e.key === 'Escape') {
      e.preventDefault();
      elements.ideaInput.value = '';
      elements.ideaInput.blur();
    }
  });
  
  // 输入框实时字符计数
  elements.ideaInput?.addEventListener('input', (e) => {
    const length = e.target.value.length;
    const maxLength = 500;
    
    // 更新字符计数显示
    let counter = document.getElementById('char-counter');
    if (!counter) {
      counter = document.createElement('div');
      counter.id = 'char-counter';
      counter.className = 'char-counter';
      elements.ideaInput.parentNode.appendChild(counter);
    }
    
    counter.textContent = `${length}/${maxLength}`;
    counter.className = `char-counter ${length > maxLength * 0.9 ? 'warning' : ''}`;
  });
  
  // 全局键盘快捷键
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K 聚焦输入框
    if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      elements.ideaInput?.focus();
    }
    
    // Ctrl/Cmd + H 切换到历史标签
    if (e.key === 'h' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      switchTab('history');
    }
    
    // Ctrl/Cmd + R 切换到结果标签
    if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      switchTab('results');
    }
  });
}

// 验证用户输入
function validateInput(idea) {
  if (!idea || idea.length < 3) {
    return { valid: false, message: '请输入至少3个字符的想法描述' };
  }
  
  if (idea.length > 500) {
    return { valid: false, message: '想法描述不能超过500个字符' };
  }
  
  // 检查是否包含恶意内容
  const maliciousPatterns = [
    /rm\s+-rf/i,
    /del\s+\/[sq]/i,
    /format\s+c:/i,
    /__import__\s*\(\s*['"]os['"]\s*\)/i
  ];
  
  for (const pattern of maliciousPatterns) {
    if (pattern.test(idea)) {
      return { valid: false, message: '输入内容包含不安全的命令，请重新输入' };
    }
  }
  
  return { valid: true };
}

// 处理执行
async function handleExecute() {
  const idea = elements.ideaInput?.value.trim();
  
  // 输入验证
  const validation = validateInput(idea);
  if (!validation.valid) {
    showNotification(validation.message, 'warning');
    elements.ideaInput?.focus();
    return;
  }
  
  if (isExecuting) {
    showNotification('正在执行中，请稍候', 'info');
    return;
  }
  
  try {
    isExecuting = true;
    showLoading();
    updateStatus('执行中', 'executing');
    
    // 显示执行开始通知
    showNotification('开始执行你的想法...', 'info');
    
    // 保存到历史记录
    await saveToHistory(idea);
    
    // 调用后端API
    const result = await executeIdea(idea);
    
    // 显示结果
    showResults(result);
    updateStatus('完成', 'completed');
    
    // 显示成功通知
    showNotification('执行完成！', 'success');
    
    // 清空输入框
    elements.ideaInput.value = '';
    
  } catch (error) {
    console.error('执行失败:', error);
    showError(error.message || '执行失败，请重试');
    updateStatus('错误', 'error');
  } finally {
    isExecuting = false;
    hideLoading();
  }
}

// 检查后端服务连接
async function checkBackendConnection() {
  const API_BASE = 'http://localhost:3000';
  try {
    const response = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      timeout: 5000
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// 带重试的API请求
async function fetchWithRetry(url, options, maxRetries = 2) {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        timeout: 30000 // 30秒超时
      });
      return response;
    } catch (error) {
      if (i === maxRetries) {
        throw error;
      }
      // 等待1秒后重试
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// 调用后端API执行想法
async function executeIdea(idea) {
  const API_BASE = 'http://localhost:3000/api';
  
  // 步骤1: 检查连接
  updateLoadingStep(1, '检查服务连接...');
  const isConnected = await checkBackendConnection();
  if (!isConnected) {
    throw new Error('无法连接到后端服务，请确保服务已启动');
  }
  
  // 步骤2: 分析想法
  updateLoadingStep(2, '分析想法中...');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 步骤3: 生成代码
  updateLoadingStep(3, '生成代码中...');
  
  const response = await fetchWithRetry(`${API_BASE}/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      idea,
      language: 'python' // 默认使用Python
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API请求失败 (${response.status}): ${errorText}`);
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.message || '执行失败');
  }
  
  // 步骤4: 准备结果
  updateLoadingStep(4, '准备结果...');
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 保存执行ID用于后续操作
  currentExecutionId = result.data.executionId;
  
  return result.data;
}

// 显示加载状态
function showLoading() {
  elements.loadingSection.style.display = 'block';
  elements.resultsSection.style.display = 'none';
  elements.executeBtn.disabled = true;
  
  // 重置步骤状态
  document.querySelectorAll('.step').forEach(step => {
    step.classList.remove('active', 'completed');
  });
}

// 隐藏加载状态
function hideLoading() {
  elements.loadingSection.style.display = 'none';
  elements.executeBtn.disabled = false;
}

// 更新加载步骤
function updateLoadingStep(stepNumber, message) {
  // 更新消息
  if (elements.loadingMessage) {
    elements.loadingMessage.textContent = message;
  }
  
  // 更新步骤状态
  const currentStep = document.getElementById(`step${stepNumber}`);
  const prevSteps = document.querySelectorAll(`.step:nth-child(-n+${stepNumber - 1})`);
  
  // 标记之前的步骤为完成
  prevSteps.forEach(step => {
    step.classList.remove('active');
    step.classList.add('completed');
  });
  
  // 标记当前步骤为活跃
  if (currentStep) {
    currentStep.classList.add('active');
    currentStep.classList.remove('completed');
  }
}

// 显示结果
function showResults(result) {
  elements.resultsSection.style.display = 'block';
  elements.resultsSection.classList.add('fade-in');
  
  // 显示执行输出
  if (elements.outputContent && result.result && result.result.output) {
    elements.outputContent.innerHTML = formatOutput(result.result.output);
  }
  
  // 显示生成的代码
  if (elements.codeContent && result.code) {
    elements.codeContent.textContent = result.code;
  }
  
  // 显示执行日志（如果有错误信息）
  if (elements.logsContent) {
    const logs = [];
    
    // 添加AI解释
    if (result.explanation) {
      logs.push({ level: 'info', message: `AI解释: ${result.explanation}` });
    }
    
    // 添加执行状态
    if (result.result) {
      const status = result.result.success ? '成功' : '失败';
      const level = result.result.success ? 'success' : 'error';
      logs.push({ level, message: `执行状态: ${status}` });
      
      // 添加执行时间
      if (result.result.executionTime) {
        logs.push({ level: 'info', message: `执行时间: ${result.result.executionTime}ms` });
      }
      
      // 添加错误信息
      if (result.result.error) {
        logs.push({ level: 'error', message: `错误: ${result.result.error}` });
      }
    }
    
    elements.logsContent.innerHTML = formatLogs(logs);
  }
  
  // 保存当前执行ID
  currentExecutionId = result.executionId;
}

// 格式化输出
function formatOutput(output) {
  if (typeof output === 'string') {
    return `<div class="output-text">${escapeHtml(output)}</div>`;
  }
  
  if (output.type === 'html') {
    return `<iframe srcdoc="${escapeHtml(output.content)}" style="width: 100%; height: 200px; border: 1px solid #e2e8f0; border-radius: 4px;"></iframe>`;
  }
  
  if (output.type === 'image') {
    return `<img src="${output.url}" alt="Generated output" style="max-width: 100%; border-radius: 4px;" />`;
  }
  
  return `<pre>${escapeHtml(JSON.stringify(output, null, 2))}</pre>`;
}

// 格式化日志
function formatLogs(logs) {
  if (Array.isArray(logs)) {
    return logs.map(log => {
      const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
      const level = log.level || 'info';
      return `<div class="log-entry log-${level}">[${timestamp}] ${escapeHtml(log.message)}</div>`;
    }).join('');
  }
  
  return `<div class="log-entry">${escapeHtml(logs)}</div>`;
}

// HTML转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 切换Tab
function switchTab(tabName) {
  // 更新按钮状态
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  // 更新内容显示
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `${tabName}Tab`);
  });
}

// 处理下载
function handleDownload() {
  if (!currentExecutionId) {
    showNotification('没有可下载的内容', 'warning');
    return;
  }
  
  // 创建下载链接
  const codeContent = elements.codeContent?.textContent;
  if (codeContent) {
    const blob = new Blob([codeContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `idea-meu-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('代码已下载', 'success');
  }
}

// 处理继续扩展
function handleContinue() {
  const currentIdea = elements.ideaInput?.value.trim();
  if (currentIdea) {
    elements.ideaInput.value = currentIdea + '\n\n请继续扩展这个功能：';
    elements.ideaInput.focus();
    elements.ideaInput.setSelectionRange(elements.ideaInput.value.length, elements.ideaInput.value.length);
  }
}

// 更新状态
function updateStatus(text, type = 'ready') {
  if (elements.statusText) {
    elements.statusText.textContent = text;
  }
  
  const dot = elements.statusIndicator?.querySelector('.status-dot');
  if (dot) {
    dot.className = 'status-dot';
    dot.classList.add(`status-${type}`);
  }
}

// 显示通知
function showNotification(message, type = 'info') {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // 添加样式
  Object.assign(notification.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '12px 16px',
    borderRadius: '8px',
    color: 'white',
    fontSize: '13px',
    fontWeight: '500',
    zIndex: '10000',
    opacity: '0',
    transform: 'translateX(100%)',
    transition: 'all 0.3s ease'
  });
  
  // 设置背景色
  const colors = {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6'
  };
  notification.style.background = colors[type] || colors.info;
  
  document.body.appendChild(notification);
  
  // 显示动画
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // 自动隐藏
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  }, 3000);
}

// 显示错误
function showError(message) {
  elements.loadingSection.style.display = 'none';
  elements.resultsSection.style.display = 'none';
  
  // 根据错误类型提供更友好的提示
  let friendlyMessage = message;
  
  if (message.includes('Failed to fetch') || message.includes('网络错误')) {
    friendlyMessage = '网络连接失败，请检查后端服务是否启动 (http://localhost:3000)';
  } else if (message.includes('API请求失败 (404)')) {
    friendlyMessage = 'API端点不存在，请检查后端服务配置';
  } else if (message.includes('API请求失败 (500)')) {
    friendlyMessage = '服务器内部错误，请查看后端日志';
  } else if (message.includes('API请求失败 (429)')) {
    friendlyMessage = '请求过于频繁，请稍后再试';
  } else if (message.includes('AI服务')) {
    friendlyMessage = 'AI服务暂时不可用，请稍后重试';
  }
  
  showNotification(friendlyMessage, 'error');
  updateStatus('错误', 'error');
  
  // 在控制台输出详细错误信息供调试
  console.error('详细错误信息:', message);
}

// 保存到历史记录
async function saveToHistory(idea) {
  try {
    const history = await getHistory();
    const newItem = {
      id: Date.now(),
      text: idea,
      timestamp: new Date().toISOString()
    };
    
    history.unshift(newItem);
    
    // 限制历史记录数量
    if (history.length > 10) {
      history.splice(10);
    }
    
    await chrome.storage.local.set({ history });
    loadHistory();
  } catch (error) {
    console.error('保存历史记录失败:', error);
  }
}

// 获取历史记录
async function getHistory() {
  try {
    const result = await chrome.storage.local.get(['history']);
    return result.history || [];
  } catch (error) {
    console.error('获取历史记录失败:', error);
    return [];
  }
}

// 加载历史记录
async function loadHistory() {
  try {
    const history = await getHistory();
    
    if (!elements.historyList) return;
    
    if (history.length === 0) {
      elements.historyList.innerHTML = '<div class="history-empty">暂无历史记录</div>';
      return;
    }
    
    elements.historyList.innerHTML = history.map(item => {
      const time = new Date(item.timestamp).toLocaleString();
      return `
        <div class="history-item" data-id="${item.id}">
          <div class="history-item-text">${escapeHtml(item.text)}</div>
          <div class="history-item-time">${time}</div>
        </div>
      `;
    }).join('');
    
    // 绑定点击事件
    elements.historyList.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', () => {
        const text = item.querySelector('.history-item-text').textContent;
        elements.ideaInput.value = text;
        elements.ideaInput.focus();
      });
    });
    
  } catch (error) {
    console.error('加载历史记录失败:', error);
  }
}

// 清空历史记录
async function handleClearHistory() {
  try {
    await chrome.storage.local.remove(['history']);
    loadHistory();
    showNotification('历史记录已清空', 'success');
  } catch (error) {
    console.error('清空历史记录失败:', error);
    showNotification('清空失败', 'error');
  }
}

// 添加CSS样式到状态点
const style = document.createElement('style');
style.textContent = `
  .status-ready { background: #10b981; }
  .status-executing { background: #f59e0b; }
  .status-completed { background: #3b82f6; }
  .status-error { background: #ef4444; }

  .history-empty {
    text-align: center;
    color: #9ca3af;
    font-size: 12px;
    padding: 16px;
  }
  
  .log-entry {
    margin-bottom: 4px;
    font-family: inherit;
  }
  
  .log-info { color: #94a3b8; }
  .log-warn { color: #fbbf24; }
  .log-error { color: #f87171; }
  .log-success { color: #34d399; }
  
  .char-counter {
    position: absolute;
    right: 8px;
    bottom: 8px;
    font-size: 11px;
    color: #9ca3af;
    background: rgba(255, 255, 255, 0.9);
    padding: 2px 6px;
    border-radius: 4px;
    pointer-events: none;
  }
  
  .char-counter.warning {
    color: #f59e0b;
    font-weight: 500;
  }
  
  .input-container {
    position: relative;
  }
  
  .help-text {
    margin-top: 8px;
    text-align: center;
    opacity: 0.7;
  }
  
  .help-text small {
    color: #6b7280;
    font-size: 11px;
  }
`;
document.head.appendChild(style);