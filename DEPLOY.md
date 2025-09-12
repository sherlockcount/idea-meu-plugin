# 🚀 Idea to MEU 部署指南

## 📋 系统要求

- **Node.js**: >= 18.0.0
- **Docker**: >= 20.10.0
- **MongoDB**: >= 5.0 (可选，支持Docker部署)
- **操作系统**: macOS, Linux, Windows

## 🛠️ 快速部署

### 1. 克隆项目

```bash
git clone <repository-url>
cd idea-to-meu-plugin
```

### 2. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd backend
npm install
cd ..
```

### 3. 环境配置

```bash
# 复制环境配置文件
cp backend/.env.example backend/.env
```

编辑 `backend/.env` 文件，配置必要参数：

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

# 安全配置
JWT_SECRET=your-secure-jwt-secret
```

### 4. 构建Docker镜像

```bash
# 构建代码执行环境镜像
docker build -t meu-executor:latest docker/execution/
```

### 5. 启动数据库（可选）

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

### 6. 启动服务

```bash
# 启动后端服务
cd backend
npm start

# 新终端启动前端服务
cd ..
npm run dev
```

## 🌐 访问应用

- **前端界面**: http://localhost:3001
- **后端API**: http://localhost:3000
- **健康检查**: http://localhost:3000/health
- **API文档**: http://localhost:3000/api

## 🔧 生产环境部署

### 使用PM2部署

```bash
# 安装PM2
npm install -g pm2

# 启动后端服务
cd backend
pm2 start ecosystem.config.js

# 启动前端服务（构建后）
cd ..
npm run build
pm2 serve dist 3001 --name "meu-frontend"
```

### 使用Docker Compose

创建 `docker-compose.prod.yml`：

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:5.0
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password123
    volumes:
      - mongodb_data:/data/db
    ports:
      - "27017:27017"

  backend:
    build: ./backend
    environment:
      NODE_ENV: production
      MONGODB_URI: mongodb://admin:password123@mongodb:27017/idea-meu?authSource=admin
    ports:
      - "3000:3000"
    depends_on:
      - mongodb
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock

  frontend:
    build: .
    ports:
      - "3001:3001"
    depends_on:
      - backend

volumes:
  mongodb_data:
```

启动：

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 🔐 安全配置

### 1. 环境变量安全

- 使用强密码和随机JWT密钥
- 不要将 `.env` 文件提交到版本控制
- 在生产环境中使用环境变量或密钥管理服务

### 2. 网络安全

```bash
# 配置防火墙（Ubuntu/CentOS）
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 3. HTTPS配置

使用Nginx反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 📊 监控和日志

### 日志配置

```bash
# 查看应用日志
tail -f backend/logs/app.log

# 查看PM2日志
pm2 logs

# 查看Docker日志
docker logs -f container_name
```

### 健康检查

```bash
# 检查服务状态
curl http://localhost:3000/health

# 检查数据库连接
curl http://localhost:3000/api/stats
```

## 🔄 更新部署

```bash
# 拉取最新代码
git pull origin main

# 更新依赖
npm install
cd backend && npm install && cd ..

# 重新构建Docker镜像
docker build -t meu-executor:latest docker/execution/

# 重启服务
pm2 restart all
```

## 🐛 故障排除

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

### 日志级别

在 `.env` 文件中设置：

```env
# 开发环境
LOG_LEVEL=debug

# 生产环境
LOG_LEVEL=info
```

## 📞 技术支持

如遇到部署问题，请检查：

1. 系统要求是否满足
2. 环境变量是否正确配置
3. Docker服务是否正常运行
4. 网络连接是否正常
5. 查看应用日志获取详细错误信息

---

**注意**: 首次部署建议在测试环境中验证所有功能正常后再部署到生产环境。