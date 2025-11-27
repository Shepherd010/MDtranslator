# 贡献指南

感谢您对 MDtranslator 项目的关注！我们欢迎任何形式的贡献。

## 如何贡献

### 报告 Bug

1. 在 GitHub Issues 中搜索是否已有相同问题
2. 如果没有，创建新 Issue，包含：
   - 清晰的问题描述
   - 复现步骤
   - 预期行为 vs 实际行为
   - 环境信息（OS、浏览器、Node.js 版本等）

### 提交功能建议

1. 在 Issues 中创建 Feature Request
2. 描述您希望的功能及其用途
3. 如可能，提供实现思路

### 提交代码

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 提交更改：`git commit -m 'Add some feature'`
4. 推送分支：`git push origin feature/your-feature`
5. 创建 Pull Request

### 代码规范

- **前端**：遵循 ESLint 配置，使用 TypeScript
- **后端**：遵循 PEP 8，使用类型注解
- **提交信息**：使用清晰、简洁的描述

## 开发环境设置

```bash
# 克隆仓库
git clone https://github.com/yourusername/MDtranslator.git
cd MDtranslator

# 配置环境
cp .env.example .env
# 编辑 .env 填入 API Key

# 安装后端依赖
conda create -n mdtranslator python=3.11
conda activate mdtranslator
pip install -r backend/requirements.txt

# 安装前端依赖
cd src && npm install

# 启动开发服务
cd .. && bash start.sh
```

## 项目结构

```
backend/          # FastAPI 后端
src/src/          # Next.js 前端源码
  ├── app/        # 页面和 API 路由
  ├── components/ # React 组件
  ├── store/      # Zustand 状态管理
  └── lib/        # 工具函数
```

## 联系我们

如有问题，欢迎在 Issues 中讨论！
