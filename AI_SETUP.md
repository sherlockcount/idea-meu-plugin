# 🤖 AI服务配置指南

本项目支持集成DeepSeek API来提供真正的AI代码生成功能。按照以下步骤配置您的AI服务。

## 🚀 快速开始

### 1. 获取DeepSeek API密钥

1. 访问 [DeepSeek官网](https://www.deepseek.com/)
2. 注册账户并登录
3. 进入API管理页面
4. 创建新的API密钥
5. 复制您的API密钥

### 2. 配置环境变量

在 `backend/.env` 文件中添加您的API配置：

```bash
# DeepSeek API配置
DEEPSEEK_API_KEY=sk-your-actual-api-key-here
DEEPSEEK_API_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-coder
```

### 3. 重启服务器

```bash
cd backend
npm start
```

## 📋 配置选项说明

| 环境变量 | 说明 | 默认值 | 必需 |
|---------|------|--------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API密钥 | - | 是 |
| `DEEPSEEK_API_URL` | DeepSeek API基础URL | `https://api.deepseek.com` | 否 |
| `DEEPSEEK_MODEL` | 使用的模型名称 | `deepseek-coder` | 否 |

## 🔧 模型选择

DeepSeek提供多种模型，推荐用于代码生成的模型：

- **deepseek-coder** (推荐): 专门针对代码生成优化
- **deepseek-chat**: 通用对话模型，也支持代码生成

## 🧪 测试配置

配置完成后，您可以通过以下方式测试AI功能：

### 1. 使用测试页面

打开 `test.html` 文件，在浏览器中测试完整功能。

### 2. 使用API直接测试

```bash
# 测试想法验证
curl -X POST http://localhost:3000/api/validate \
  -H "Content-Type: application/json" \
  -d '{"idea":"创建一个计算器","language":"python"}'

# 测试代码生成和执行
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"idea":"打印Hello World","language":"python"}'
```

### 3. 检查日志

查看服务器日志确认AI服务状态：

```bash
# 如果配置正确，应该看到：
# [info]: DeepSeek AI服务已初始化

# 如果未配置，会看到：
# [warn]: DeepSeek API密钥未配置，将使用模拟模式
```

## 🔒 安全注意事项

1. **保护API密钥**: 永远不要将API密钥提交到版本控制系统
2. **环境隔离**: 在生产环境中使用不同的API密钥
3. **访问控制**: 考虑在生产环境中添加API访问控制
4. **监控使用**: 定期检查API使用量和费用

## 🚨 故障排除

### 常见问题

**Q: 服务器显示"DeepSeek API密钥未配置"**
A: 检查 `.env` 文件中的 `DEEPSEEK_API_KEY` 是否正确设置

**Q: API调用失败**
A: 
1. 验证API密钥是否有效
2. 检查网络连接
3. 确认API配额是否充足
4. 查看服务器日志获取详细错误信息

**Q: 代码生成质量不佳**
A: 
1. 尝试更详细地描述您的想法
2. 使用更具体的编程术语
3. 考虑切换到不同的模型

### 日志调试

启用详细日志以获取更多调试信息：

```bash
# 在 .env 文件中设置
LOG_LEVEL=debug
```

## 💡 使用技巧

1. **清晰描述**: 使用清晰、具体的语言描述您的想法
2. **指定语言**: 明确指定目标编程语言
3. **分步骤**: 对于复杂功能，考虑分解为多个简单步骤
4. **示例输入**: 在描述中包含期望的输入输出示例

## 📚 更多资源

- [DeepSeek官方文档](https://docs.deepseek.com/)
- [API参考文档](https://docs.deepseek.com/api/)
- [项目GitHub仓库](https://github.com/your-repo/idea-to-meu)

---

如果您遇到任何问题，请查看项目文档或提交Issue。