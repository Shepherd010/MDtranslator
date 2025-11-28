# MDtranslator Ubuntu 22.04 部署指南

本文档详细说明如何在全新的 Ubuntu 22.04 服务器上部署 MDtranslator 项目。

## 目录

- [系统要求](#系统要求)
- [快速部署](#快速部署)
- [手动部署](#手动部署)
- [配置说明](#配置说明)
- [服务管理](#服务管理)
- [故障排查](#故障排查)
- [安全建议](#安全建议)

## 系统要求

### 硬件要求
- **CPU**: 1 核心及以上
- **内存**: 2 GB 及以上
- **磁盘**: 10 GB 可用空间

### 软件要求
- **操作系统**: Ubuntu 22.04 LTS
- **Python**: 3.10+
- **Node.js**: 20.x LTS
- **yarn**: 1.22+

## 快速部署

### 1. 克隆项目

```bash
# 克隆仓库到服务器
git clone https://github.com/Shepherd010/MDtranslator.git
cd MDtranslator
```

### 2. 配置环境变量

创建 `.env` 文件：


> ⚠️ **重要**: 请将 `your_api_key_here` 替换为你的实际 API Key

### 3. 运行部署脚本

```bash
chmod +x deploy.sh
./deploy.sh
```

部署脚本会自动完成以下操作：
- 安装系统依赖 (Python, Node.js, yarn)
- 创建 Python 虚拟环境
- 安装 Python 和 Node.js 依赖
- 构建前端项目
- 配置 systemd 服务
- 启动服务

### 4. 访问应用

部署完成后，通过浏览器访问：

```
http://YOUR_SERVER_IP:8080
```

## 手动部署

如果需要手动部署，请按以下步骤操作：

### 1. 更新系统并安装基础依赖

```bash
sudo apt-get update -y
sudo apt-get install -y curl wget git build-essential python3 python3-pip python3-venv
```

### 2. 安装 Node.js 20.x

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. 安装 yarn

```bash
sudo npm install -g yarn
```

### 4. 克隆项目

```bash
git clone https://github.com/Shepherd010/MDtranslator.git
cd MDtranslator
```

### 5. 配置后端

```bash
cd backend

# 创建虚拟环境
python3 -m venv venv

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
pip install --upgrade pip
pip install -r requirements.txt

# 退出虚拟环境
deactivate

# 创建环境变量文件
cat > .env << 'EOF'
OPENAI_API_KEY=your_api_key_here
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-4
EOF

cd ..
```

### 6. 配置前端

```bash
cd src

# 安装依赖
yarn install

# 构建项目
yarn build

cd ..
```

### 7. 创建 systemd 服务

**后端服务** `/etc/systemd/system/mdtranslator-backend.service`:

```ini
[Unit]
Description=MDtranslator Backend Service
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/path/to/MDtranslator/backend
Environment="PATH=/path/to/MDtranslator/backend/venv/bin"
ExecStart=/path/to/MDtranslator/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

**前端服务** `/etc/systemd/system/mdtranslator-frontend.service`:

```ini
[Unit]
Description=MDtranslator Frontend Service
After=network.target mdtranslator-backend.service

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/path/to/MDtranslator/src
Environment="PORT=8080"
ExecStart=/usr/bin/yarn start -p 8080
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

> 请将 `YOUR_USERNAME` 和 `/path/to/MDtranslator` 替换为实际值

### 8. 启动服务

```bash
sudo systemctl daemon-reload
sudo systemctl enable mdtranslator-backend mdtranslator-frontend
sudo systemctl start mdtranslator-backend
sleep 3
sudo systemctl start mdtranslator-frontend
```

## 配置说明

### 后端环境变量 (`backend/.env`)

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `OPENAI_API_KEY` | OpenAI 或兼容 API 的密钥 | `sk-xxx` |
| `OPENAI_API_BASE` | API 基础地址 | `https://api.openai.com/v1` |
| `OPENAI_MODEL` | 使用的模型名称 | `gpt-4` / `qwen-turbo` |

### 使用其他 LLM 提供商

**阿里云通义千问 (Qwen)**:
```bash
OPENAI_API_KEY=your_dashscope_api_key
OPENAI_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1
OPENAI_MODEL=qwen-turbo
```

**Azure OpenAI**:
```bash
OPENAI_API_KEY=your_azure_api_key
OPENAI_API_BASE=https://your-resource.openai.azure.com
OPENAI_MODEL=gpt-4
```

### 端口配置

默认端口配置：
- **后端 API**: `127.0.0.1:8000` (仅本地访问)
- **前端**: `0.0.0.0:8080` (对外暴露)

如需修改前端端口，编辑 `/etc/systemd/system/mdtranslator-frontend.service` 中的 `PORT` 环境变量和 `-p` 参数。

## 服务管理

### 使用管理脚本

项目提供了便捷的服务管理脚本 `service.sh`:

```bash
# 启动服务
./service.sh start

# 停止服务
./service.sh stop

# 重启服务
./service.sh restart

# 查看状态
./service.sh status

# 查看所有日志
./service.sh logs

# 查看后端日志
./service.sh logs backend

# 查看前端日志
./service.sh logs frontend
```

### 使用 systemctl

```bash
# 查看服务状态
sudo systemctl status mdtranslator-backend
sudo systemctl status mdtranslator-frontend

# 重启服务
sudo systemctl restart mdtranslator-backend
sudo systemctl restart mdtranslator-frontend

# 停止服务
sudo systemctl stop mdtranslator-backend mdtranslator-frontend

# 启动服务
sudo systemctl start mdtranslator-backend mdtranslator-frontend

# 查看日志
sudo journalctl -u mdtranslator-backend -f
sudo journalctl -u mdtranslator-frontend -f
```

## 故障排查

### 1. 服务启动失败

**检查日志**:
```bash
sudo journalctl -u mdtranslator-backend -n 50 --no-pager
sudo journalctl -u mdtranslator-frontend -n 50 --no-pager
```

**常见问题**:

| 问题 | 解决方案 |
|------|----------|
| `ModuleNotFoundError` | 检查虚拟环境路径是否正确 |
| `Port already in use` | 检查端口占用: `sudo lsof -i :8000` |
| `Permission denied` | 检查文件权限和用户设置 |

### 2. 无法访问页面

**检查防火墙**:
```bash
# 查看防火墙状态
sudo ufw status

# 开放 8080 端口
sudo ufw allow 8080/tcp
```

**检查云服务商安全组**:
- AWS: 安全组入站规则
- 阿里云: 安全组规则
- 腾讯云: 安全组规则

确保 8080 端口已开放。

### 3. API 调用失败

**检查 .env 配置**:
```bash
# 查看 .env 文件
cat backend/.env

# 测试 API 连接 (需要安装 curl)
curl -X POST http://localhost:8000/api/translate \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello", "doc_id": "test"}'
```

### 4. 构建失败

**检查 Node.js 版本**:
```bash
node --version  # 应该是 v20.x
```

**清理并重新构建**:
```bash
cd src
rm -rf node_modules .next
yarn install
yarn build
```

## 安全建议

### 1. 使用 Nginx 反向代理

建议在生产环境使用 Nginx 作为反向代理，支持 HTTPS:

```bash
sudo apt-get install -y nginx
```

创建配置文件 `/etc/nginx/sites-available/mdtranslator`:

```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置:
```bash
sudo ln -s /etc/nginx/sites-available/mdtranslator /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 2. 配置 SSL 证书

使用 Let's Encrypt 免费证书:
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your_domain.com
```

### 3. 限制 API 访问

后端默认只监听 `127.0.0.1:8000`，不对外暴露，这是安全的设计。

### 4. 定期更新

```bash
# 更新系统
sudo apt-get update && sudo apt-get upgrade -y

# 更新项目
cd /path/to/MDtranslator
git pull
./deploy.sh
```

## 常见问题 FAQ

**Q: 如何更换翻译模型？**

A: 修改 `backend/.env` 中的 `OPENAI_MODEL` 和 `OPENAI_API_BASE`，然后重启后端服务。

**Q: 如何修改监听端口？**

A: 编辑 systemd 服务文件中的端口设置，然后执行 `sudo systemctl daemon-reload` 并重启服务。

**Q: 支持 Docker 部署吗？**

A: 目前暂未提供 Docker 部署方案，后续版本会添加支持。

**Q: 翻译速度很慢怎么办？**

A: 翻译速度取决于 LLM API 的响应速度，可以尝试更换更快的 API 提供商或使用更小的模型。

---

如有问题，请提交 Issue 到 [GitHub 仓库](https://github.com/Shepherd010/MDtranslator/issues)。
