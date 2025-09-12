const axios = require('axios');

// 测试Docker环境下的MEU执行流程
async function testDockerExecution() {
    const baseURL = 'http://localhost:3000';
    
    console.log('🚀 开始测试Docker环境下的MEU执行流程...');
    
    try {
        // 1. 测试健康检查 (跳过，直接测试核心功能)
        console.log('\n1. 跳过健康检查，直接测试核心功能...');
        // const healthResponse = await axios.get(`${baseURL}/health`);
        // console.log('✅ 健康检查通过:', healthResponse.data);
        
        // 2. 测试简单的JavaScript代码执行
        console.log('\n2. 测试JavaScript代码执行...');
        const jsCode = `
console.log('Hello from Docker container!');
const result = 2 + 3;
console.log('计算结果:', result);
return result;
`;
        
        const jsResponse = await axios.post(`${baseURL}/api/execute`, {
            idea: '测试Docker环境下的JavaScript代码执行',
            code: jsCode,
            language: 'javascript',
            timeout: 10000
        });
        
        console.log('✅ JavaScript执行结果:', jsResponse.data);
        
        // 3. 测试Python代码执行
        console.log('\n3. 测试Python代码执行...');
        const pythonCode = `
print('Hello from Python in Docker!')
import sys
print(f'Python版本: {sys.version}')
result = [i**2 for i in range(5)]
print(f'平方数列表: {result}')
print(result)
`;
        
        const pythonResponse = await axios.post(`${baseURL}/api/execute`, {
            idea: '测试Docker环境下的Python代码执行',
            code: pythonCode,
            language: 'python',
            timeout: 10000
        });
        
        console.log('✅ Python执行结果:', pythonResponse.data);
        
        // 4. 测试安全策略 - 尝试执行被禁止的命令
        console.log('\n4. 测试安全策略...');
        const maliciousCode = `
const { exec } = require('child_process');
exec('rm -rf /', (error, stdout, stderr) => {
    console.log('This should be blocked!');
});
`;
        
        try {
            const securityResponse = await axios.post(`${baseURL}/api/execute`, {
                idea: '测试安全策略 - 尝试执行被禁止的命令',
                code: maliciousCode,
                language: 'javascript',
                timeout: 5000
            });
            console.log('⚠️ 安全策略测试结果:', securityResponse.data);
        } catch (error) {
            console.log('✅ 安全策略生效，危险代码被阻止:', error.response?.data || error.message);
        }
        
        // 5. 测试资源限制
        console.log('\n5. 测试资源限制...');
        const resourceIntensiveCode = `
// 尝试创建大量数据测试内存限制
const data = [];
for (let i = 0; i < 1000000; i++) {
    data.push('x'.repeat(100));
}
console.log('数据长度:', data.length);
return data.length;
`;
        
        try {
            const resourceResponse = await axios.post(`${baseURL}/api/execute`, {
                idea: '测试资源限制 - 创建大量数据测试内存限制',
                code: resourceIntensiveCode,
                language: 'javascript',
                timeout: 15000
            });
            console.log('✅ 资源限制测试结果:', resourceResponse.data);
        } catch (error) {
            console.log('⚠️ 资源限制测试:', error.response?.data || error.message);
        }
        
        console.log('\n🎉 Docker环境MEU执行流程测试完成!');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.response?.data || error.message);
        process.exit(1);
    }
}

// 运行测试
testDockerExecution();