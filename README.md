# 💡 Idea → MEU  从想法到最小可执行单元

一个完整的浏览器插件 + 后端系统，让AI在安全的容器环境中将你的想法转化为可执行的代码。

## 🎯 项目概述

**Idea → MEU** 是一个生产级的全栈应用，包含：
- 🌐 **网页**：现代化UI界面，支持想法输入和结果展示
- 🚀 **Node.js后端服务**：RESTful API，集成AI服务和Docker执行环境
- 🗄️ **MongoDB数据库**：持久化存储想法、执行历史和用户数据
- 🐳 **Docker容器化**：完整的生产环境部署方案
- 🤖 **AI集成**：支持DeepSeek等多种AI模型切换
- 🛡️ **安全执行**：在隔离的Linux容器中安全运行生成的代码

## ✨ 已实现功能

### 🌐 网页
- ✅ **现代化UI**：基于Tailwind CSS的响应式界面
- ✅ **实时交互**：与后端API的实时通信
- ✅ **本地存储**：想法和历史记录的本地缓存

### 🚀 后端服务
- ✅ **Express.js框架**：RESTful API服务
- ✅ **MongoDB集成**：完整的数据持久化方案
- ✅ **AI服务集成**：支持DeepSeek、OpenAI等多种AI模型
- ✅ **Docker执行环境**：安全的代码执行容器
- ✅ **Swagger文档**：完整的API文档
- ✅ **日志系统**：基于Winston的结构化日志
- ✅ **安全中间件**：CORS、Helmet、速率限制等

### 🐳 容器化部署
- ✅ **Docker Compose**：一键部署整个应用栈
- ✅ **MongoDB容器**：数据库服务容器化
- ✅ **Mongo Express**：数据库管理界面
- ✅ **网络隔离**：安全的容器网络配置
- ✅ **数据持久化**：Docker卷管理

## 🚀 快速开始

### 方式一：Docker部署（推荐）

```bash
# 建议将docker-compose.prod.yml 名称更改为docker-compose.yml

# 1. 克隆项目
git clone <repository-url>
cd idea-meu-plugin

# 2. 配置环境变量
cp .env.production .env
# 编辑 .env 文件，添加你的AI API密钥

# 3. 一键启动所有服务
docker-compose -f docker-compose.yml up -d

# 4. 验证服务状态
docker-compose -f docker-compose.yml ps

# 5. 运行前端
npm run dev
```

服务启动后：
- 🌐 后端API：http://localhost:3000
- 📊 API文档：http://localhost:3000/api-docs
- 🗄️ 数据库管理：http://localhost:8081
- 🌐 前端：http://localhost:3001

### 方式二：开发环境

```bash
# 建议将docker-compose.prod.yml 名称更改为 docker-compose.yml

# 1. 安装后端依赖
cd backend
npm install

# 2. 安装前端依赖
npm install

# 2. 配置环境
cp .env.example .env
# 编辑 .env 文件

# 3. 启动MongoDB（需要本地安装）
mongod

# 4. 启动后端服务
cd backend
npm start

# 5. 启动前端服务
npm run dev
```


## 🏗️ 技术架构

### 核心技术栈
- **前端**：Html + Tailwind CSS
- **后端**：Node.js + Express.js + MongoDB
- **AI集成**：DeepSeek API / OpenAI API
- **容器化**：Docker + Docker Compose
- **安全**：Helmet + CORS + Rate Limiting
- **日志**：Winston + Morgan
- **文档**：Swagger UI

### 项目结构

```
idea-meu-plugin/
├── backend/                  # Node.js后端服务
│   ├── server.js            # 服务器入口文件
│   ├── config/              # 配置文件
│   │   ├── database.js      # 数据库配置
│   │   └── swagger.js       # API文档配置
│   ├── models/              # MongoDB数据模型
│   │   ├── Idea.js          # 想法模型
│   │   ├── Execution.js     # 执行记录模型
│   │   └── User.js          # 用户模型
│   ├── routes/              # API路由
│   │   ├── api.js           # 核心API端点
│   │   ├── execute.js       # 代码执行API
│   │   ├── meu.js           # MEU生成API
│   │   └── health.js        # 健康检查API
│   ├── services/            # 业务逻辑服务
│   │   ├── aiService.js     # AI服务集成
│   │   ├── dockerService.js # Docker执行服务
│   │   └── meuService.js    # MEU生成服务
│   ├── middleware/          # Express中间件
│   │   ├── errorHandler.js  # 错误处理
│   │   └── rateLimiter.js   # 速率限制
│   └── utils/               # 工具函数
│       └── logger.js        # 日志工具
├── docker/                   # Docker配置
│   └── execution/           # 代码执行容器配置
├── docker-compose.prod.yml   # 生产环境部署配置
├── .env.production          # 生产环境变量
└── setup-ai.sh             # AI服务配置脚本
```

## 🔧 环境配置

### 必需的环境变量

创建 `.env` 文件并配置以下变量：

```bash
# AI服务配置
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/idea_meu
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=secure_password

# 服务配置
PORT=3000
NODE_ENV=production
JWT_SECRET=your_jwt_secret

# 日志配置
LOG_LEVEL=info
```

### AI服务配置

使用配置向导快速设置：
```bash
./setup-ai.sh
```

或查看详细配置说明：[AI_SETUP.md](AI_SETUP.md)

## 🛠️ API接口

### 核心端点

```http
# 健康检查
GET /health

# 想法验证
POST /api/validate
Content-Type: application/json
{
  "idea": "创建一个计算器",
  "language": "python"
}

# 代码生成和执行
POST /api/execute
Content-Type: application/json
{
  "idea": "打印Hello World",
  "language": "python"
}

# 执行历史
GET /api/history

# API文档
GET /api-docs
```

## 🧪 测试和验证

### 使用curl测试API

```bash
# 测试服务健康状态
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

- **容器隔离**：代码在独立的Docker容器中执行
- **速率限制**：防止API滥用和DDoS攻击
- **输入验证**：使用Joi进行严格的参数验证
- **CORS保护**：配置跨域请求安全策略
- **Helmet安全**：HTTP头部安全保护
- **日志监控**：完整的操作审计日志
- **JWT认证**：用户身份验证和授权

## 🚨 故障排除

### 常见问题

**Q: Docker服务启动失败**
```bash
# 检查Docker状态
docker-compose -f docker-compose.yml logs

# 重新构建镜像
docker-compose -f docker-compose.yml up --build -d
```

**Q: MongoDB连接失败**
```bash
# 检查MongoDB容器状态
docker-compose -f docker-compose.yml logs mongodb

# 验证数据库连接
docker exec -it meu-mongodb mongosh
```

**Q: AI服务不可用**
- 检查API密钥配置
- 验证网络连接
- 查看后端日志：`docker-compose logs backend`

**Q: 浏览器插件无法连接**
- 确认后端服务运行在正确端口
- 检查CORS配置
- 验证插件权限设置

### 日志查看

```bash
# 查看所有服务日志
docker-compose -f docker-compose.yml logs -f

# 查看特定服务日志
docker-compose -f docker-compose.yml logs -f backend
docker-compose -f docker-compose.yml logs -f mongodb
```

## 📊 监控和维护

### 服务监控

- **健康检查**：`GET /health` 端点监控服务状态
- **数据库管理**：Mongo Express界面 (http://localhost:8081)
- **API文档**：Swagger UI界面 (http://localhost:3000/api-docs)
- **日志分析**：Winston结构化日志

### 数据备份

```bash
# 备份MongoDB数据
docker exec meu-mongodb mongodump --out /backup

# 恢复数据
docker exec meu-mongodb mongorestore /backup
```

## 🤝 贡献指南

1. Fork 项目仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 开发规范

- 遵循ESLint代码规范
- 编写单元测试
- 更新API文档
- 添加适当的日志记录

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

- [DeepSeek](https://www.deepseek.com/) - AI API
- [MongoDB](https://www.mongodb.com/) - 灵活的文档数据库
- [Express.js](https://expressjs.com/) - 快速的Node.js框架
- [Docker](https://www.docker.com/) - 容器化部署方案

---

⭐ 如果这个项目对您有帮助，请给它一个星标！

📧 问题反馈：请提交 [Issue](https://github.com/RATING3PRO/idea-meu-plugin/issues)
