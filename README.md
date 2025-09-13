# 💡 CodeSeed  
## 从一个最小执行单元开始，世界不断生长。

在开发过程中，很多点子转瞬即逝：

-“这个 API 能不能这样用？”

-“如果把算法参数改一改会怎样？”

-“能不能写个小脚本验证一下？”

往往这些小实验需要新建工程、写一堆样板代码、配置环境，灵感就被消磨掉了。

**我们解决的，就是这个问题。**

首先感谢VibeHacks给我们这个机会来实现我们的想法，这次黑客松的主题是用“Vibe Code优化Vibe Code”，首先我们会想：Vibe Code 是什么？我们队伍的想法是，Vibe Code 不只是代码，而是代码背后的语境与氛围，强调直觉 → 代码的转换，而不是从零写大段冗长逻辑。因此我们开发了这款工具。

**我们的工具如何“用 Vibe Code 优化 Vibe Code”？**

输入即 Vibe Code：用户用自然语言、随手记下的灵感，其实就是一种 vibe，CodeSeed 把它转化为最小执行单元。

输出也是 Vibe Code：这些最小执行单元不仅是代码，还保留了文档，形成“带 vibe 的代码片段”。

优化的过程：

每次灵感捕捉（Vibe）→ 转换成 MEU（Code）。

多个 MEU 通过整理、组合，演化成完整的 Vibe Code 文档。

也就是说，我们用 Vibe Code 的方式（灵感对话）来生成、组织和优化 Vibe Code 本身（代码 + 文档 + 可执行单元）。


## ✨ 功能特性

- 🤖 **AI驱动**: 集成DeepSeek API，提供智能代码生成
- 🔄 **想法验证**: 自动分析想法的可行性和复杂度
- 💻 **多语言支持**: 支持Python、JavaScript、Java等多种编程语言
- 🛡️ **安全执行**: 在受控环境中安全执行生成的代码
- 🎨 **现代UI**: 简洁美观的用户界面
- 📊 **实时反馈**: 提供详细的执行结果和性能指标

## 🚀 CodeSeed 部署指南

### 📋 系统要求

- **Node.js**: >= 18.0.0
- **Docker**: >= 20.10.0
- **MongoDB**: >= 5.0 (可选，支持Docker部署)
- **操作系统**: macOS, Linux, Windows

### 🛠️ 快速部署

#### 1. 克隆项目

```bash
git clone <repository-url>
cd idea-meu-plugin
```

#### 2. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd backend
npm install
cd ..
```

#### 3. 环境配置

```bash
# 复制环境配置文件
cp backend/.env.example backend/.env
```

编辑 `backend/.env` 文件，配置必要参数：

> **重要**: 跨设备部署时，请务必正确配置 `HOST_PROJECT_ROOT` 环境变量为项目的绝对路径，以确保Docker容器能正确挂载项目目录。

```env
# 基础配置
PORT=3000
NODE_ENV=production

# 数据库配置
MONGODB_URI=mongodb://admin:password123@localhost:27017/idea-meu?authSource=admin

# AI服务配置（必需）
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_API_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-coder

# Docker执行配置
DOCKER_EXECUTION=true
# 跨设备兼容性：指定项目根目录的绝对路径
# 在不同设备上部署时，请修改为实际的项目路径
HOST_PROJECT_ROOT=/path/to/your/idea-meu-plugin

# 安全配置
JWT_SECRET=your-secure-jwt-secret
```

#### 4. 构建Docker镜像

```bash
# 构建代码执行环境镜像
docker build -t meu-executor:latest docker/execution/
```

#### 5. 启动数据库（可选）

```bash
# 使用Docker启动MongoDB
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password123 \
  -v mongodb_data:/data/db \
  mongo:5.0
```

#### 6. 启动服务

```bash
# 启动后端服务
cd backend
npm start

# 新终端启动前端服务
cd ..
npm run dev
```

### 🌐 访问应用

- **前端界面**: http://localhost:3001
- **后端API**: http://localhost:3000
- **健康检查**: http://localhost:3000/health
- **API文档**: http://localhost:3000/api


## 📁 项目结构

```
idea-to-meu-plugin/
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

本项目支持集成各种大模型API，提供AI代码生成功能：

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

1. **Docker镜像构建失败**
   ```bash
   # 清理Docker缓存
   docker system prune -a
   ```

2. **数据库连接失败**
   ```bash
   # 检查MongoDB状态
   docker ps | grep mongo
   docker logs mongodb
   ```

3. **AI服务调用失败**
   ```bash
   # 验证API密钥
   curl -H "Authorization: Bearer $DEEPSEEK_API_KEY" https://api.deepseek.com/v1/models
   ```

4. **端口占用**
   ```bash
   # 查找占用端口的进程
   lsof -i :3000
   lsof -i :3001
   ```

5. **跨设备部署路径问题**
   
   **问题**: 代码执行失败，提示路径未共享或Docker挂载错误
   
   **解决方案**:
   ```bash
   # 1. 确保HOST_PROJECT_ROOT环境变量设置正确
   # 在.env文件中设置项目的绝对路径
   HOST_PROJECT_ROOT=/Users/username/path/to/idea-meu-plugin
   
   # 2. 检查Docker文件共享设置
   # 在Docker Desktop中，确保项目目录已添加到文件共享列表
   
   # 3. 验证路径挂载
   docker exec idea-meu-backend ls -la /app/projects/
   
   # 4. 重启服务应用新配置
   docker-compose restart backend
   ```
   
   **注意**: 不同操作系统的路径格式不同：
   - macOS/Linux: `/Users/username/project` 或 `/home/username/project`
   - Windows: `C:\Users\username\project` (在WSL中使用Linux格式)


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
