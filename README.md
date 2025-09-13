# 💡 CodeSeed  从想法到最小执行单元

在开发过程中，很多点子转瞬即逝：

 “这个 API 能不能这样用？”

  “如果把算法参数改一改会怎样？”

  “能不能写个小脚本验证一下？”

往往这些小实验需要新建工程、写一堆样板代码、配置环境，灵感就被消磨掉了。

**我们解决的，就是这个问题。**

## ✨ 功能特性

- 🤖 **AI驱动**: 集成DeepSeek API，提供智能代码生成
- 🔄 **想法验证**: 自动分析想法的可行性和复杂度
- 💻 **多语言支持**: 支持Python、JavaScript、Java等多种编程语言
- 🛡️ **安全执行**: 在受控环境中安全执行生成的代码
- 🎨 **现代UI**: 简洁美观的用户界面
- 📊 **实时反馈**: 提供详细的执行结果和性能指标

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd idea-meu-plugin
```

### 2. 安装依赖
```bash
# 安装后端依赖
cd backend
npm install

# 返回项目根目录
cd ..
```

### 3. 配置AI服务 (推荐)
```bash
# 使用配置向导
./setup-ai.sh

# 或手动编辑 backend/.env 文件
# 添加您的DeepSeek API密钥
```

### 4. 启动后端服务
```bash
cd backend
npm start
```

### 5. 测试功能
打开 `test.html` 文件在浏览器中测试完整功能。

### 6. 安装浏览器插件
1. 打开Chrome浏览器
2. 进入扩展程序管理页面 (`chrome://extensions/`)
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目根目录

## 📁 项目结构

```
idea-meu-plugin/
├── manifest.json          # 浏览器插件配置
├── popup.html            # 插件弹窗界面
├── popup.js              # 插件前端逻辑
├── test.html             # 功能测试页面
├── setup-ai.sh           # AI服务配置脚本
├── AI_SETUP.md           # AI配置详细指南
├── backend/              # 后端服务
│   ├── server.js         # 主服务器文件
│   ├── .env              # 环境配置文件
│   ├── .env.example      # 配置文件模板
│   ├── routes/           # API路由
│   │   ├── api.js        # 主要API端点
│   │   └── execute.js    # 代码执行端点
│   ├── middleware/       # 中间件
│   │   ├── cors.js       # CORS配置
│   │   ├── logging.js    # 日志中间件
│   │   └── rateLimiter.js # 速率限制
│   ├── services/         # 业务逻辑服务
│   │   └── aiService.js  # AI服务集成
│   └── package.json      # 后端依赖配置
└── README.md             # 项目说明
```

## 🔧 配置说明

### AI服务配置

本项目支持集成DeepSeek API提供真正的AI代码生成功能：

#### 快速配置
```bash
# 使用配置向导 (推荐)
./setup-ai.sh
```

#### 手动配置
在 `backend/.env` 文件中添加：
```bash
DEEPSEEK_API_KEY=your_api_key_here
DEEPSEEK_API_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-coder
```

详细配置说明请查看 [AI_SETUP.md](AI_SETUP.md)

### 其他环境变量

- `PORT`: 服务器端口 (默认: 3000)
- `NODE_ENV`: 运行环境 (development/production)
- `MONGODB_URI`: MongoDB连接字符串 (可选)
- `LOG_LEVEL`: 日志级别 (默认: info)

## 🛠️ API文档

### 健康检查
```http
GET /health
```

### 想法验证
```http
POST /api/validate
Content-Type: application/json

{
  "idea": "创建一个计算器",
  "language": "python"
}
```

### 代码生成和执行
```http
POST /api/execute
Content-Type: application/json

{
  "idea": "打印Hello World",
  "language": "python"
}
```

### 服务信息
```http
GET /api/info
```

## 🧪 测试

### 使用测试页面
打开 `test.html` 文件，可以测试所有功能：
- 服务状态检查
- 想法验证
- 代码生成和执行
- AI服务状态

### 使用curl测试
```bash
# 测试健康检查
curl http://localhost:3000/health

# 测试想法验证
curl -X POST http://localhost:3000/api/validate \
  -H "Content-Type: application/json" \
  -d '{"idea":"创建一个计算器","language":"python"}'

# 测试代码执行
curl -X POST http://localhost:3000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"idea":"打印Hello World","language":"python"}'
```

## 🔒 安全特性

- **速率限制**: 防止API滥用
- **输入验证**: 严格的参数验证
- **安全执行**: 代码在隔离环境中执行
- **日志记录**: 完整的操作日志
- **CORS保护**: 跨域请求保护

## 🚨 故障排除

### 常见问题

**Q: 后端服务无法启动**
A: 检查端口3000是否被占用，或修改 `.env` 文件中的 `PORT` 配置

**Q: AI功能不工作**
A: 确认DeepSeek API密钥已正确配置，查看 [AI_SETUP.md](AI_SETUP.md)

**Q: 浏览器插件无法加载**
A: 确认已开启Chrome的开发者模式，并选择了正确的项目目录

**Q: 代码执行失败**
A: 检查服务器日志，确认执行环境配置正确

### 日志查看
```bash
# 查看服务器日志
cd backend
npm start

# 或查看日志文件
tail -f logs/app.log
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [DeepSeek](https://www.deepseek.com/) - 提供强大的AI代码生成能力
- [Express.js](https://expressjs.com/) - 后端框架
- [Chrome Extensions API](https://developer.chrome.com/docs/extensions/) - 浏览器插件支持

## 📞 联系方式

如果您有任何问题或建议，请：
- 提交 [Issue](https://github.com/your-repo/idea-to-meu/issues)
- 发送邮件到 your-email@example.com

---

⭐ 如果这个项目对您有帮助，请给它一个星标！
