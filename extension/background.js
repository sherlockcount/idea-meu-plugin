// 后台服务工作者

// 安装事件
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Idea → MEU 插件已安装');
  
  if (details.reason === 'install') {
    // 首次安装时的初始化
    initializeExtension();
  } else if (details.reason === 'update') {
    // 更新时的处理
    console.log('插件已更新到版本:', chrome.runtime.getManifest().version);
  }
});

// 初始化扩展
async function initializeExtension() {
  try {
    // 设置默认配置
    await chrome.storage.local.set({
      apiEndpoint: 'http://localhost:3000/api',
      maxHistoryItems: 10,
      autoSave: true,
      theme: 'light'
    });
    
    console.log('插件初始化完成');
  } catch (error) {
    console.error('插件初始化失败:', error);
  }
}

// 处理来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request);
  
  switch (request.action) {
    case 'executeIdea':
      handleExecuteIdea(request.data)
        .then(result => sendResponse({ success: true, data: result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // 保持消息通道开放
      
    case 'getConfig':
      getConfig()
        .then(config => sendResponse({ success: true, data: config }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'updateConfig':
      updateConfig(request.data)
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    case 'clearData':
      clearAllData()
        .then(() => sendResponse({ success: true }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true;
      
    default:
      sendResponse({ success: false, error: '未知的操作' });
  }
});

// 处理执行想法请求
async function handleExecuteIdea(ideaData) {
  try {
    const config = await getConfig();
    const apiEndpoint = config.apiEndpoint || 'http://localhost:3000/api';
    
    // 调用后端API
    const response = await fetch(`${apiEndpoint}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idea: ideaData.idea,
        context: ideaData.context || {},
        options: ideaData.options || {}
      })
    });
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // 保存执行记录
    await saveExecutionRecord({
      idea: ideaData.idea,
      result: result,
      timestamp: new Date().toISOString()
    });
    
    return result;
    
  } catch (error) {
    console.error('执行想法失败:', error);
    
    // 如果后端不可用，返回模拟结果
    if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
      console.log('后端服务不可用，返回模拟结果');
      return generateMockResult(ideaData.idea);
    }
    
    throw error;
  }
}

// 生成模拟结果（用于演示）
function generateMockResult(idea) {
  const mockResults = {
    'hello world': {
      executionId: 'mock_' + Date.now(),
      output: {
        type: 'html',
        content: '<!DOCTYPE html><html><head><title>Hello World</title></head><body><h1 style="text-align:center;color:#667eea;font-family:Arial;">Hello World!</h1><p style="text-align:center;">这是由AI生成的Hello World页面</p></body></html>'
      },
      code: `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hello World</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Hello World!</h1>
        <p>这是由AI生成的Hello World页面</p>
    </div>
</body>
</html>`,
      logs: [
        { timestamp: new Date().toISOString(), level: 'info', message: '开始分析想法...' },
        { timestamp: new Date().toISOString(), level: 'info', message: '生成HTML代码...' },
        { timestamp: new Date().toISOString(), level: 'success', message: '代码生成完成' },
        { timestamp: new Date().toISOString(), level: 'info', message: '执行测试...' },
        { timestamp: new Date().toISOString(), level: 'success', message: '测试通过，页面可正常显示' }
      ],
      success: true,
      executionTime: 2.5
    }
  };
  
  // 检查是否有匹配的模拟结果
  const lowerIdea = idea.toLowerCase();
  for (const [key, result] of Object.entries(mockResults)) {
    if (lowerIdea.includes(key)) {
      return result;
    }
  }
  
  // 默认模拟结果
  return {
    executionId: 'mock_' + Date.now(),
    output: `基于想法 "${idea}" 的执行结果\n\n这是一个模拟结果，因为后端服务尚未启动。\n请启动后端服务以获得真实的AI生成结果。`,
    code: `// 基于想法: ${idea}\n// 这是模拟生成的代码\n\nconsole.log('Hello from Idea → MEU!');\nconsole.log('想法:', '${idea}');\n\n// TODO: 实现具体功能`,
    logs: [
      { timestamp: new Date().toISOString(), level: 'info', message: '使用模拟模式' },
      { timestamp: new Date().toISOString(), level: 'warning', message: '后端服务未连接' },
      { timestamp: new Date().toISOString(), level: 'info', message: '生成模拟结果' }
    ],
    success: true,
    executionTime: 1.0,
    isMock: true
  };
}

// 获取配置
async function getConfig() {
  try {
    const result = await chrome.storage.local.get([
      'apiEndpoint',
      'maxHistoryItems',
      'autoSave',
      'theme'
    ]);
    
    return {
      apiEndpoint: result.apiEndpoint || 'http://localhost:3000/api',
      maxHistoryItems: result.maxHistoryItems || 10,
      autoSave: result.autoSave !== false,
      theme: result.theme || 'light'
    };
  } catch (error) {
    console.error('获取配置失败:', error);
    return {
      apiEndpoint: 'http://localhost:3000/api',
      maxHistoryItems: 10,
      autoSave: true,
      theme: 'light'
    };
  }
}

// 更新配置
async function updateConfig(newConfig) {
  try {
    await chrome.storage.local.set(newConfig);
    console.log('配置已更新:', newConfig);
  } catch (error) {
    console.error('更新配置失败:', error);
    throw error;
  }
}

// 保存执行记录
async function saveExecutionRecord(record) {
  try {
    const result = await chrome.storage.local.get(['executionHistory']);
    const history = result.executionHistory || [];
    
    history.unshift(record);
    
    // 限制记录数量
    const config = await getConfig();
    if (history.length > config.maxHistoryItems) {
      history.splice(config.maxHistoryItems);
    }
    
    await chrome.storage.local.set({ executionHistory: history });
  } catch (error) {
    console.error('保存执行记录失败:', error);
  }
}

// 清空所有数据
async function clearAllData() {
  try {
    await chrome.storage.local.clear();
    await initializeExtension(); // 重新初始化默认配置
    console.log('所有数据已清空');
  } catch (error) {
    console.error('清空数据失败:', error);
    throw error;
  }
}

// 处理网络请求错误
chrome.webRequest?.onErrorOccurred?.addListener(
  (details) => {
    if (details.url.includes('localhost:3000')) {
      console.log('检测到后端服务连接问题:', details);
    }
  },
  { urls: ['http://localhost:3000/*'] }
);

// 监听标签页更新（可用于未来的上下文感知功能）
chrome.tabs?.onUpdated?.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // 可以在这里添加页面上下文分析逻辑
    console.log('页面加载完成:', tab.url);
  }
});

// 定期清理过期数据
setInterval(async () => {
  try {
    const result = await chrome.storage.local.get(['executionHistory']);
    const history = result.executionHistory || [];
    
    // 清理30天前的记录
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const filteredHistory = history.filter(record => {
      return new Date(record.timestamp) > thirtyDaysAgo;
    });
    
    if (filteredHistory.length !== history.length) {
      await chrome.storage.local.set({ executionHistory: filteredHistory });
      console.log(`清理了 ${history.length - filteredHistory.length} 条过期记录`);
    }
  } catch (error) {
    console.error('清理过期数据失败:', error);
  }
}, 24 * 60 * 60 * 1000); // 每24小时执行一次

console.log('Idea → MEU 后台服务已启动');