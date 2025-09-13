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
cd idea-meu-plugin
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

## 🔄 跨设备部署配置

当在不同设备或服务器上部署时，需要特别注意路径配置以确保Docker容器能正确访问项目文件。

### 配置步骤

1. **设置项目根路径**
   
   在 `backend/.env` 文件中配置：
   ```env
   HOST_PROJECT_ROOT=/absolute/path/to/your/idea-meu-plugin
   ```
   
   示例路径：
   - macOS: `/Users/username/idea-meu-plugin`
- Linux: `/home/username/idea-meu-plugin`
- Windows (WSL): `/mnt/c/Users/username/idea-meu-plugin`

2. **Docker文件共享设置**
   
   确保Docker Desktop中已添加项目目录到文件共享列表：
   - 打开Docker Desktop
   - 进入 Settings → Resources → File Sharing
   - 添加项目根目录路径
   - 点击 "Apply & Restart"

3. **验证配置**
   
   ```bash
   # 启动服务后验证路径挂载
   docker exec idea-meu-backend ls -la /app/projects/
   
   # 测试代码执行功能
   curl -X POST http://localhost:3000/api/execute \
     -H "Content-Type: application/json" \
     -d '{"code":"print('Hello World')","language":"python"}'
   ```

### 注意事项

- 路径必须使用绝对路径，不能使用相对路径或 `~` 符号
- Windows用户建议使用WSL2环境进行部署
- 确保Docker有足够权限访问指定目录
- 修改配置后需要重启Docker服务

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
      DOCKER_EXECUTION: "true"
      # 跨设备兼容性：指定项目根目录的绝对路径
      HOST_PROJECT_ROOT: "/path/to/your/idea-meu-plugin"
    ports:
      - "3000:3000"
    depends_on:
      - mongodb
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      # 挂载项目目录以支持代码执行
      - "/path/to/your/idea-meu-plugin/projects:/app/projects"

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

### 日志级别

在 `.env` 文件中设置：

```env
# 开发环境
LOG_LEVEL=debug

# 生产环境
LOG_LEVEL=info
```

## ☁️ 云主机部署

### 1. 云服务器选择

**推荐配置**:
- CPU: 2核心以上
- 内存: 4GB以上
- 存储: 40GB以上 SSD
- 带宽: 5Mbps以上
- 操作系统: Ubuntu 20.04 LTS / CentOS 8

**主流云服务商**:
- 阿里云 ECS
- 腾讯云 CVM
- AWS EC2
- Google Cloud Compute Engine
- 华为云 ECS

### 2. 服务器初始化

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y  # Ubuntu
# 或
sudo yum update -y  # CentOS

# 安装必要工具
sudo apt install -y curl wget git vim htop  # Ubuntu
# 或
sudo yum install -y curl wget git vim htop  # CentOS

# 创建应用用户
sudo useradd -m -s /bin/bash meuapp
sudo usermod -aG sudo meuapp

# 切换到应用用户
su - meuapp
```

### 3. 安装运行环境

```bash
# 安装 Node.js (使用 NodeSource 仓库)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs  # Ubuntu
# 或
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs  # CentOS

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 重新登录以应用 Docker 组权限
exit
su - meuapp
```

### 4. 部署应用

```bash
# 克隆项目
git clone https://github.com/your-username/idea-meu-plugin.git
cd idea-meu-plugin

# 配置环境变量
cp backend/.env.example backend/.env
vim backend/.env
```

**生产环境配置示例**:
```env
# 数据库配置
MONGODB_URI=mongodb://localhost:27017/meu_production

# AI服务配置
DEEPSEEK_API_KEY=your_production_api_key
DEEPSEEK_BASE_URL=https://api.deepseek.com

# 服务配置
PORT=3000
FRONTEND_PORT=3001
NODE_ENV=production

# JWT配置
JWT_SECRET=your_super_secure_jwt_secret_key_here

# 项目路径（云服务器绝对路径）
HOST_PROJECT_ROOT=/home/meuapp/idea-meu-plugin

# 日志配置
LOG_LEVEL=info
LOG_FILE=/home/meuapp/idea-meu-plugin/backend/logs/app.log
```

### 5. 构建和启动服务

```bash
# 安装依赖
npm install
cd backend && npm install && cd ..

# 构建 Docker 镜像
docker build -t meu-executor:latest docker/execution/

# 启动 MongoDB
docker run -d --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  --restart unless-stopped \
  mongo:latest

# 安装 PM2
npm install -g pm2

# 启动后端服务
cd backend
pm2 start server.js --name "meu-backend" --env production
cd ..

# 启动前端服务
pm2 start app.js --name "meu-frontend" --env production

# 保存 PM2 配置
pm2 save
pm2 startup
```

### 6. 域名和SSL配置

**安装 Nginx**:
```bash
sudo apt install nginx  # Ubuntu
# 或
sudo yum install nginx  # CentOS

sudo systemctl start nginx
sudo systemctl enable nginx
```

**配置域名解析**:
- 在域名服务商处添加 A 记录，指向云服务器公网IP
- 等待 DNS 解析生效（通常5-30分钟）

**申请免费SSL证书（Let's Encrypt）**:
```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx  # Ubuntu
# 或
sudo yum install certbot python3-certbot-nginx  # CentOS

# 申请证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

**Nginx配置文件** (`/etc/nginx/sites-available/meu-app`):
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL 配置（Certbot 自动生成）
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # 前端代理
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # API代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 增加超时时间（代码执行可能需要较长时间）
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:3001;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

**启用配置**:
```bash
sudo ln -s /etc/nginx/sites-available/meu-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 7. 防火墙配置

```bash
# Ubuntu (UFW)
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 8. 监控和备份

**设置日志轮转**:
```bash
sudo vim /etc/logrotate.d/meu-app
```

```
/home/meuapp/idea-meu-plugin/backend/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}
```

**数据库备份脚本**:
```bash
#!/bin/bash
# /home/meuapp/backup-db.sh

BACKUP_DIR="/home/meuapp/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份 MongoDB
docker exec mongodb mongodump --out /tmp/backup_$DATE
docker cp mongodb:/tmp/backup_$DATE $BACKUP_DIR/

# 删除7天前的备份
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} +

echo "Backup completed: $BACKUP_DIR/backup_$DATE"
```

**设置定时备份**:
```bash
chmod +x /home/meuapp/backup-db.sh
crontab -e

# 添加以下行（每天凌晨2点备份）
0 2 * * * /home/meuapp/backup-db.sh
```

### 9. 性能优化

**PM2 集群模式**:
```bash
# 创建 PM2 配置文件
vim ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'meu-backend',
      script: 'backend/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'meu-frontend',
      script: 'app.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    }
  ]
};
```

```bash
# 使用配置文件启动
pm2 start ecosystem.config.js
```

**Nginx 性能调优**:
```nginx
# 在 /etc/nginx/nginx.conf 的 http 块中添加
worker_processes auto;
worker_connections 1024;

# 启用 gzip 压缩
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

# 客户端缓存
client_max_body_size 10M;
client_body_timeout 60;
client_header_timeout 60;
keepalive_timeout 65;
send_timeout 60;
```

### 10. 云服务商特定配置

**阿里云 ECS**:
- 在安全组中开放 80、443、22 端口
- 配置弹性公网IP
- 可选：配置负载均衡 SLB

**腾讯云 CVM**:
- 在安全组中开放相应端口
- 配置弹性公网IP
- 可选：配置负载均衡 CLB

**AWS EC2**:
- 配置 Security Groups
- 分配 Elastic IP
- 可选：配置 Application Load Balancer

### 11. 故障排除

**常见云部署问题**:

1. **端口访问问题**
   ```bash
   # 检查端口监听
   sudo netstat -tlnp | grep :3000
   sudo netstat -tlnp | grep :3001
   
   # 检查防火墙
   sudo ufw status  # Ubuntu
   sudo firewall-cmd --list-all  # CentOS
   ```

2. **域名解析问题**
   ```bash
   # 检查DNS解析
   nslookup your-domain.com
   dig your-domain.com
   ```

3. **SSL证书问题**
   ```bash
   # 检查证书状态
   sudo certbot certificates
   
   # 测试证书续期
   sudo certbot renew --dry-run
   ```

4. **服务状态检查**
   ```bash
   # 检查PM2状态
   pm2 status
   pm2 logs
   
   # 检查Nginx状态
   sudo systemctl status nginx
   sudo nginx -t
   
   # 检查Docker容器
   docker ps
   docker logs mongodb
   ```

## 📞 技术支持

如遇到部署问题，请检查：

1. 系统要求是否满足
2. 环境变量是否正确配置
3. Docker服务是否正常运行
4. 网络连接是否正常
5. 查看应用日志获取详细错误信息
6. 云服务商安全组/防火墙配置
7. 域名DNS解析状态
8. SSL证书有效性

---

**注意**: 首次部署建议在测试环境中验证所有功能正常后再部署到生产环境。云主机部署需要额外注意安全配置和性能优化。