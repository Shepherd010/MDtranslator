#!/bin/bash

# 检查是否在 conda 环境中
if [[ -z "${CONDA_DEFAULT_ENV}" ]]; then
    echo "警告: 未检测到激活的 Conda 环境。"
    echo "请先运行: conda activate mdtranslator"
    # 尝试激活 (这通常在脚本中不起作用，除非 source 了 conda.sh)
    # source ~/anaconda3/etc/profile.d/conda.sh
    # conda activate mdtranslator
else
    echo "当前 Conda 环境: ${CONDA_DEFAULT_ENV}"
fi

# 杀死可能存在的旧进程 (可选，避免端口冲突)
echo "正在清理旧进程..."
pkill -9 -f "uvicorn"
pkill -9 -f "next-server"
pkill -9 -f "next dev"
pkill -9 -f "node node_modules/next/dist/bin/next"
# 等待进程退出
sleep 2

# 启动后端
echo "正在启动后端..."
# 在根目录下运行，以便正确处理 backend 包的相对导入
# 移除 --reload 以避免可能的数据库锁定问题
uvicorn backend.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# 等待几秒让后端启动
sleep 3

# 启动前端
echo "正在启动前端..."
cd src
# 由于使用了 --no-bin-links，直接调用 next 的可执行文件
node node_modules/next/dist/bin/next dev &
FRONTEND_PID=$!
cd ..

echo "项目已启动!"
echo "后端 PID: $BACKEND_PID"
echo "前端 PID: $FRONTEND_PID"
echo "按 Ctrl+C 停止所有服务"

# 等待子进程，以便 Ctrl+C 可以同时停止它们
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT
wait
