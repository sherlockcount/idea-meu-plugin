#!/bin/bash

# 🚀 Idea to MEU 云主机一键部署脚本
# 适用于 Ubuntu 20.04+ / CentOS 8+

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_error "请不要使用root用户运行此脚本！"
        log_info "建议创建普通用户：sudo useradd -m -s /bin/bash meuapp"
        exit 1
    fi
}

# 检测操作系统
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS=$NAME
        VER=$VERSION_ID
    else
        log_error "无法检测操作系统版本"
        exit 1
    fi
    
    log_info "检测到操作系统: $OS $VER"
}

# 更新系统
update_system() {
    log_info "更新系统包..."
    
    if [[ $OS == *"Ubuntu"* ]]; then
        sudo apt update && sudo apt upgrade -y
        sudo apt install -y curl wget git vim htop unzip
    elif [[ $OS == *"CentOS"* ]] || [[ $OS == *"Red Hat"* ]]; then
        sudo yum update -y
        sudo yum install -y curl wget git vim htop unzip
    else
        log_error "不支持的操作系统: $OS"
        exit 1
    fi
    
    log_success "系统更新完成"
}

# 安装 Node.js
install_nodejs() {
    log_info "安装 Node.js 18..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        log_info "Node.js 已安装: $NODE_VERSION"
        return
    fi
    
    if [[ $OS == *"Ubuntu"* ]]; then
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [[ $OS == *"CentOS"* ]] || [[ $OS == *"Red Hat"* ]]; then
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
    fi
    
    log_success "Node.js 安装完成: $(node --version)"
}

# 安装 Docker
install_docker() {
    log_info "安装 Docker..."
    
    if command -v docker &> /dev/null; then
        log_info "Docker 已安装: $(docker --version)"
        return
    fi
    
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    
    log_success "Docker 安装完成"
    log_warning "请重新登录以应用 Docker 组权限"
}

# 安装 Docker Compose
install_docker_compose() {
    log_info "安装 Docker Compose..."
    
    if command -v docker-compose &> /dev/null; then
        log_info "Docker Compose 已安装: $(docker-compose --version)"
        return
    fi
    
    DOCKER_COMPOSE_VERSION="v2.20.0"
    sudo curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    log_success "Docker Compose 安装完成"
}

# 安装 PM2
install_pm2() {
    log_info "安装 PM2..."
    
    if command -v pm2 &> /dev/null; then
        log_info "PM2 已安装: $(pm2 --version)"
        return
    fi
    
    sudo npm install -g pm2
    log_success "PM2 安装完成"
}

# 克隆项目
clone_project() {
    log_info "克隆项目..."
    
    if [[ -d "idea-meu-plugin" ]]; then
        log_info "项目目录已存在，更新代码..."
        cd idea-meu-plugin
        git pull origin main
        cd ..
    else
        read -p "请输入项目 Git 仓库地址: " REPO_URL
        git clone $REPO_URL
        cd idea-meu-plugin
        cd ..
    fi
    
    log_success "项目代码准备完成"
}

# 配置环境变量
setup_environment() {
    log_info "配置环境变量..."
    
    cd idea-meu-plugin
    
    if [[ ! -f "backend/.env" ]]; then
        if [[ -f ".env.production" ]]; then
            cp .env.production backend/.env
        else
            cp backend/.env.example backend/.env
        fi
        
        log_warning "请编辑 backend/.env 文件配置生产环境参数"
        log_info "重要配置项："
        echo "  - DEEPSEEK_API_KEY: AI服务密钥"
        echo "  - JWT_SECRET: JWT密钥（至少32字符）"
        echo "  - HOST_PROJECT_ROOT: $(pwd)"
        echo "  - MONGODB_URI: 数据库连接字符串"
        
        read -p "是否现在编辑配置文件？(y/n): " EDIT_CONFIG
        if [[ $EDIT_CONFIG == "y" || $EDIT_CONFIG == "Y" ]]; then
            vim backend/.env
        fi
    fi
    
    cd ..
    log_success "环境配置完成"
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    cd idea-meu-plugin
    
    npm install
    cd backend && npm install && cd ..
    
    log_success "依赖安装完成"
    cd ..
}

# 构建 Docker 镜像
build_docker_image() {
    log_info "构建 Docker 执行环境镜像..."
    
    cd idea-meu-plugin
    
    docker build -t meu-executor:latest docker/execution/
    
    log_success "Docker 镜像构建完成"
    cd ..
}

# 启动数据库
start_database() {
    log_info "启动 MongoDB 数据库..."
    
    if docker ps | grep -q "mongodb"; then
        log_info "MongoDB 已在运行"
        return
    fi
    
    docker run -d --name mongodb \
        -p 27017:27017 \
        -v mongodb_data:/data/db \
        --restart unless-stopped \
        mongo:latest
    
    # 等待数据库启动
    log_info "等待数据库启动..."
    sleep 10
    
    log_success "MongoDB 启动完成"
}

# 启动应用服务
start_services() {
    log_info "启动应用服务..."
    
    cd idea-meu-plugin
    
    # 创建日志目录
    mkdir -p backend/logs
    mkdir -p logs
    
    # 启动后端服务
    cd backend
    pm2 start server.js --name "meu-backend" --env production
    cd ..
    
    # 启动前端服务
    pm2 start app.js --name "meu-frontend" --env production
    
    # 保存 PM2 配置
    pm2 save
    pm2 startup
    
    log_success "应用服务启动完成"
    cd ..
}

# 配置防火墙
setup_firewall() {
    log_info "配置防火墙..."
    
    if [[ $OS == *"Ubuntu"* ]]; then
        if command -v ufw &> /dev/null; then
            sudo ufw allow ssh
            sudo ufw allow 80/tcp
            sudo ufw allow 443/tcp
            sudo ufw allow 3000/tcp
            sudo ufw allow 3001/tcp
            sudo ufw --force enable
            log_success "UFW 防火墙配置完成"
        fi
    elif [[ $OS == *"CentOS"* ]] || [[ $OS == *"Red Hat"* ]]; then
        if command -v firewall-cmd &> /dev/null; then
            sudo firewall-cmd --permanent --add-service=ssh
            sudo firewall-cmd --permanent --add-service=http
            sudo firewall-cmd --permanent --add-service=https
            sudo firewall-cmd --permanent --add-port=3000/tcp
            sudo firewall-cmd --permanent --add-port=3001/tcp
            sudo firewall-cmd --reload
            log_success "Firewalld 防火墙配置完成"
        fi
    fi
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    sleep 5
    
    # 检查后端服务
    if curl -f http://localhost:3000/health &> /dev/null; then
        log_success "后端服务运行正常"
    else
        log_error "后端服务检查失败"
    fi
    
    # 检查前端服务
    if curl -f http://localhost:3001 &> /dev/null; then
        log_success "前端服务运行正常"
    else
        log_error "前端服务检查失败"
    fi
    
    # 检查 PM2 状态
    pm2 status
}

# 显示部署信息
show_deployment_info() {
    log_success "🎉 部署完成！"
    echo ""
    echo "============================================"
    echo "📋 部署信息"
    echo "============================================"
    echo "前端地址: http://$(curl -s ifconfig.me):3001"
    echo "后端API: http://$(curl -s ifconfig.me):3000"
    echo "项目路径: $(pwd)/idea-meu-plugin"
    echo ""
    echo "============================================"
    echo "🔧 常用命令"
    echo "============================================"
    echo "查看服务状态: pm2 status"
    echo "查看日志: pm2 logs"
    echo "重启服务: pm2 restart all"
    echo "停止服务: pm2 stop all"
    echo "查看数据库: docker logs mongodb"
    echo ""
    echo "============================================"
    echo "📝 下一步"
    echo "============================================"
    echo "1. 配置域名解析指向服务器IP"
    echo "2. 安装SSL证书 (推荐使用 Let's Encrypt)"
    echo "3. 配置Nginx反向代理"
    echo "4. 设置定时备份"
    echo ""
    log_info "详细文档请参考 DEPLOY.md 文件"
}

# 主函数
main() {
    echo "🚀 Idea to MEU 云主机部署脚本"
    echo "=============================="
    
    check_root
    detect_os
    
    log_info "开始部署流程..."
    
    update_system
    install_nodejs
    install_docker
    install_docker_compose
    install_pm2
    clone_project
    setup_environment
    install_dependencies
    build_docker_image
    start_database
    start_services
    setup_firewall
    health_check
    show_deployment_info
    
    log_success "部署流程完成！"
}

# 执行主函数
main "$@"