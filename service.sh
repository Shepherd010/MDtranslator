#!/bin/bash

# MDtranslator 服务管理脚本
# 用于启动、停止、重启服务

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 获取项目根目录
PROJECT_ROOT=$(cd "$(dirname "$0")" && pwd)

# 检查 sudo
if [ "$EUID" -eq 0 ]; then
    SUDO=""
elif command -v sudo &> /dev/null; then
    SUDO="sudo"
else
    log_error "需要 root 权限或 sudo"
    exit 1
fi

case "$1" in
    start)
        log_info "启动 MDtranslator 服务..."
        $SUDO systemctl start mdtranslator-backend
        sleep 2
        $SUDO systemctl start mdtranslator-frontend
        log_success "服务已启动"
        ;;
    stop)
        log_info "停止 MDtranslator 服务..."
        $SUDO systemctl stop mdtranslator-frontend
        $SUDO systemctl stop mdtranslator-backend
        log_success "服务已停止"
        ;;
    restart)
        log_info "重启 MDtranslator 服务..."
        $SUDO systemctl restart mdtranslator-backend
        sleep 2
        $SUDO systemctl restart mdtranslator-frontend
        log_success "服务已重启"
        ;;
    status)
        echo ""
        echo "后端服务状态:"
        $SUDO systemctl status mdtranslator-backend --no-pager || true
        echo ""
        echo "前端服务状态:"
        $SUDO systemctl status mdtranslator-frontend --no-pager || true
        ;;
    logs)
        case "$2" in
            backend)
                $SUDO journalctl -u mdtranslator-backend -f
                ;;
            frontend)
                $SUDO journalctl -u mdtranslator-frontend -f
                ;;
            *)
                log_info "同时显示前后端日志 (Ctrl+C 退出)"
                $SUDO journalctl -u mdtranslator-backend -u mdtranslator-frontend -f
                ;;
        esac
        ;;
    *)
        echo "用法: $0 {start|stop|restart|status|logs [backend|frontend]}"
        echo ""
        echo "命令说明:"
        echo "  start    - 启动所有服务"
        echo "  stop     - 停止所有服务"
        echo "  restart  - 重启所有服务"
        echo "  status   - 查看服务状态"
        echo "  logs     - 查看日志 (可选: backend 或 frontend)"
        exit 1
        ;;
esac
