#!/bin/bash

# MDtranslator 一键部署脚本
# 适用于全新的 Ubuntu 22.04 服务器
# 使用方法: chmod +x deploy.sh && ./deploy.sh

set -e  # 遇到错误立即退出

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

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为 root 用户或有 sudo 权限
check_sudo() {
    if [ "$EUID" -eq 0 ]; then
        SUDO=""
    elif command -v sudo &> /dev/null; then
        SUDO="sudo"
    else
        log_error "需要 root 权限或 sudo 来安装依赖"
        exit 1
    fi
}

# 获取项目根目录
PROJECT_ROOT=$(cd "$(dirname "$0")" && pwd)
log_info "项目根目录: $PROJECT_ROOT"

# 检查 sudo
check_sudo

# 更新系统包
log_info "更新系统包..."
$SUDO apt-get update -y

# 安装基础依赖
log_info "安装基础依赖..."
$SUDO apt-get install -y curl wget git build-essential

# 安装 Python 3.10+ 和 pip
log_info "检查 Python 版本..."
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
    log_info "当前 Python 版本: $PYTHON_VERSION"
else
    log_info "安装 Python..."
    $SUDO apt-get install -y python3 python3-pip python3-venv
fi

# 确保安装 python3-venv
$SUDO apt-get install -y python3-venv python3-pip

# 安装 Node.js 20.x (LTS)
log_info "检查 Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    log_info "当前 Node.js 版本: $NODE_VERSION"
else
    log_info "安装 Node.js 20.x LTS..."
    if [ -n "$SUDO" ]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO -E bash -
    else
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    fi
    $SUDO apt-get install -y nodejs
fi

# 安装 yarn
log_info "检查 yarn..."
if ! command -v yarn &> /dev/null; then
    log_info "安装 yarn..."
    $SUDO npm install -g yarn
fi

# 创建 Python 虚拟环境
log_info "创建 Python 虚拟环境..."
cd "$PROJECT_ROOT/backend"
if [ ! -d "venv" ] || [ ! -f "venv/bin/pip" ]; then
    log_info "创建新的 Python 虚拟环境..."
    rm -rf venv 2>/dev/null || true
    python3 -m venv venv
    log_success "Python 虚拟环境创建成功"
else
    log_info "Python 虚拟环境已存在"
fi

# 使用 venv 的 pip 直接安装依赖（避免 source 在某些环境下失效）
log_info "安装 Python 依赖..."
"$PROJECT_ROOT/backend/venv/bin/pip" install --upgrade pip
"$PROJECT_ROOT/backend/venv/bin/pip" install -r requirements.txt
log_success "Python 依赖安装完成"

# 验证 uvicorn 已安装
if [ ! -f "$PROJECT_ROOT/backend/venv/bin/uvicorn" ]; then
    log_error "uvicorn 未正确安装到虚拟环境"
    exit 1
fi
log_info "验证: uvicorn 已安装到虚拟环境"

# 安装前端依赖
log_info "安装前端依赖..."
cd "$PROJECT_ROOT/src"
yarn install
log_success "前端依赖安装完成"

# 构建前端
log_info "构建前端..."
yarn build
log_success "前端构建完成"

# 创建 systemd 服务文件 - 后端
log_info "创建 systemd 服务文件..."

# 后端服务 (单 worker 但优化了并发处理)
$SUDO tee /etc/systemd/system/mdtranslator-backend.service > /dev/null << EOF
[Unit]
Description=MDtranslator Backend Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_ROOT/backend
Environment="PATH=$PROJECT_ROOT/backend/venv/bin"
ExecStart=$PROJECT_ROOT/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --timeout-keep-alive 120
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# 前端服务 (使用 3000 端口，通过 iptables 转发 80->3000)
$SUDO tee /etc/systemd/system/mdtranslator-frontend.service > /dev/null << EOF
[Unit]
Description=MDtranslator Frontend Service
After=network.target mdtranslator-backend.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_ROOT/src
Environment="PORT=3000"
Environment="HOSTNAME=0.0.0.0"
ExecStart=$(which yarn) start -p 3000 -H 0.0.0.0
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# 设置端口转发 (80 -> 3000)
log_info "配置端口转发 80 -> 3000..."
$SUDO iptables -t nat -D PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3000 2>/dev/null || true
$SUDO iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3000
# 保存 iptables 规则
if command -v netfilter-persistent &> /dev/null; then
    $SUDO netfilter-persistent save
else
    $SUDO apt-get install -y iptables-persistent
    $SUDO netfilter-persistent save
fi

# 重新加载 systemd
$SUDO systemctl daemon-reload

# 启用并启动服务
log_info "启动服务..."
$SUDO systemctl enable mdtranslator-backend
$SUDO systemctl enable mdtranslator-frontend
$SUDO systemctl start mdtranslator-backend
sleep 3  # 等待后端启动
$SUDO systemctl start mdtranslator-frontend

# 检查服务状态
log_info "检查服务状态..."
if $SUDO systemctl is-active --quiet mdtranslator-backend; then
    log_success "后端服务运行正常"
else
    log_error "后端服务启动失败"
    $SUDO systemctl status mdtranslator-backend --no-pager
fi

if $SUDO systemctl is-active --quiet mdtranslator-frontend; then
    log_success "前端服务运行正常"
else
    log_error "前端服务启动失败"
    $SUDO systemctl status mdtranslator-frontend --no-pager
fi

# 配置防火墙 (如果 ufw 存在)
if command -v ufw &> /dev/null; then
    log_info "配置防火墙..."
    $SUDO ufw allow 80/tcp
    log_success "防火墙已开放 80 端口"
fi

# 获取服务器 IP
SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "=========================================="
log_success "MDtranslator 部署完成!"
echo "=========================================="
echo ""
echo "访问地址: http://${SERVER_IP}"
echo ""
echo "常用命令:"
echo "  查看后端日志: sudo journalctl -u mdtranslator-backend -f"
echo "  查看前端日志: sudo journalctl -u mdtranslator-frontend -f"
echo "  重启后端: sudo systemctl restart mdtranslator-backend"
echo "  重启前端: sudo systemctl restart mdtranslator-frontend"
echo "  停止服务: sudo systemctl stop mdtranslator-backend mdtranslator-frontend"
echo ""
