# MDtranslator - Markdown 文档智能翻译工具

<p align="center">
  <img src="doc/logo.png" alt="MDtranslator Logo" width="120">
</p>

<p align="center">
  <strong>🌐 基于大语言模型的 Markdown 文档翻译工具</strong>
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> •
  <a href="#系统架构">系统架构</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#使用说明">使用说明</a> •
  <a href="#配置说明">配置说明</a> •
  <a href="#开发指南">开发指南</a>
</p>

---

## ✨ 功能特性

- 🔄 **智能分块翻译** - 自动将长文档按结构分块，保持文档完整性
- 📝 **实时预览** - 四分屏布局，同时查看原文和译文的源码与渲染效果
- 🎯 **格式保持** - 完美保留 Markdown 格式、代码块、数学公式、Mermaid 图表
- 💾 **自动保存** - 翻译历史自动持久化，随时恢复之前的工作
- ⚙️ **灵活配置** - 可调节分块数量、LLM 模型、温度等参数
- 📥 **多种导出** - 支持导出原文、译文或双语对照版本
- 🎨 **优雅界面** - 现代化 UI 设计，支持面板展开/折叠

## 🏗️ 系统架构

```
┌───────────────────────────────────────────────────────┐
│                        Frontend (Next.js)             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Editor    │  │   Preview   │  │  Settings   │    │
│  │ (CodeMirror)│  │ (Markdown)  │  │   Modal     │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│                           │                           │
│                    Zustand Store                      │
└───────────────────────────┼───────────────────────────┘
                            │ HTTP / WebSocket
┌───────────────────────────┼───────────────────────────┐
│                        Backend (FastAPI)              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │  Translate  │  │  Document   │  │  Settings   │    │
│  │    API      │  │    API      │  │    API      │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│         │                │                │           │
│  ┌──────┴────────────────┴────────────────┴──────┐    │
│  │              Persistent Storage               │    │
│  │           (JSON File / In-Memory)             │    │
│  └───────────────────────────────────────────────┘    │
│                           │                           │
│                    LLM API (Qwen/OpenAI)              │
└───────────────────────────────────────────────────────┘
```

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 14 + React 18 |
| 状态管理 | Zustand |
| 编辑器 | CodeMirror 6 |
| Markdown渲染 | react-markdown + remark/rehype |
| 数学公式 | KaTeX |
| 图表 | Mermaid |
| 动画 | Framer Motion |
| 后端框架 | FastAPI + Uvicorn |
| LLM 接口 | OpenAI SDK (兼容 Qwen API) |
| 持久化 | JSON 文件存储 |

## 🚀 快速开始

### 环境要求

- **Python** >= 3.10
- **Node.js** >= 18
- **Conda** (推荐) 或其他 Python 环境管理工具

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/MDtranslator.git
cd MDtranslator
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 API Key：

```env
QWEN_API_KEY=your_api_key_here
QWEN_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL_NAME=qwen-flash
```

> 💡 支持阿里云通义千问 API 或任何 OpenAI 兼容接口

### 3. 安装依赖

**后端依赖：**

```bash
# 创建 Conda 环境（推荐）
conda create -n mdtranslator python=3.11
conda activate mdtranslator

# 安装 Python 依赖
pip install -r backend/requirements.txt
```

**前端依赖：**

```bash
cd src
npm install
# 或使用 yarn（推荐）
yarn install

```

### 4. 启动服务

```bash
# 确保在项目根目录，且已激活 conda 环境
conda activate mdtranslator
bash start.sh
```

或分别启动：

```bash
# 终端 1 - 后端
uvicorn backend.main:app --host 0.0.0.0 --port 8000

# 终端 2 - 前端
cd src && npm run dev
```

### 5. 访问应用

打开浏览器访问 http://localhost:3000

## 📖 使用说明

### 基本流程

1. **上传文档** - 拖拽或点击上传 Markdown 文件
2. **预览原文** - 左侧编辑器，右侧实时预览
3. **开始翻译** - 点击「开始翻译」按钮
4. **查看结果** - 四分屏显示：左上英文MD、左下中文MD、右上英文渲染、右下中文渲染
5. **导出文档** - 选择导出格式（译文/原文/双语对照）

### 界面说明

| 模式 | 布局 | 说明 |
|------|------|------|
| 二分屏 | 左编辑 + 右预览 | 上传后的初始状态 |
| 四分屏 | 2×2 网格 | 翻译后的完整视图 |

### 快捷操作

- 🔍 **面板放大** - 点击面板标题栏的放大按钮，可将该面板扩展为半屏
- 📁 **历史记录** - 点击文件夹图标，加载之前保存的翻译
- ⚙️ **设置** - 点击齿轮图标，调整翻译参数
- 🔄 **重置** - 点击重置按钮，清空当前内容

## ⚙️ 配置说明

### 设置项

| 设置 | 说明 | 默认值 |
|------|------|--------|
| LLM 模型 | 使用的语言模型 | qwen-flash |
| 温度 | 生成随机性 (0-1) | 0.1 |
| 分块数量 | 文档分成几块并行翻译 | 3 |
| 自动保存 | 是否自动保存翻译历史 | 开启 |

### 分块策略

文档会按以下逻辑分块：

1. 将文档平均分成 N 块（由「分块数量」设置决定）
2. 尽量在段落边界处分割，避免破坏文档结构
3. 各块按顺序依次翻译，保证上下文连贯性

## 🛠️ 开发指南

### 项目结构

```
MDtranslator/
├── backend/                 # 后端代码
│   ├── main.py             # FastAPI 入口
│   ├── routers/
│   │   └── translate.py    # 翻译相关 API
│   ├── markdown_utils.py   # Markdown 分块工具
│   ├── persistent_storage.py # 持久化存储
│   ├── prompts/
│   │   └── system_prompt.txt # 系统提示词
│   └── requirements.txt    # Python 依赖
├── src/                     # 前端代码 (Next.js)
│   ├── src/
│   │   ├── app/            # 页面
│   │   ├── components/     # 组件
│   │   │   ├── Editor.tsx
│   │   │   ├── Preview.tsx
│   │   │   ├── SplitLayout.tsx
│   │   │   └── UploadZone.tsx
│   │   ├── store/          # Zustand 状态
│   │   └── lib/            # 工具函数
│   └── package.json
├── doc/                     # 文档
├── start.sh                 # 启动脚本
├── .env.example            # 环境变量模板
└── README.md               # 本文件
```

### API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/translate` | 创建翻译任务 |
| WS | `/ws/translate/{doc_id}` | 翻译进度 WebSocket |
| GET | `/api/documents` | 获取所有文档 |
| GET | `/api/documents/{id}` | 获取指定文档 |
| DELETE | `/api/documents/{id}` | 删除文档 |
| GET | `/api/settings` | 获取设置 |
| POST | `/api/settings` | 保存设置 |

### 自定义翻译提示词

编辑 `backend/prompts/system_prompt.txt` 可自定义翻译风格和要求。

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## To-Do
- [ ] 添加多语言互译支持
- [ ] 更好用的MD文本编辑器
- [ ] 秒级实时互译修改+渲染
- [ ] 工作区+多文档同时翻译
- [ ] 多样化外观
- [ ] 添加本地模型支持
- [ ] 添加更多参数支持
- [ ] Docker部署
- [ ] 添加更多语言支持
- [ ] LaTex-HTML支持
- [ ] OCR转MD支持

## 📧 联系

如有问题，请提交 [Issue](https://github.com/yourusername/MDtranslator/issues)。

---

<p align="center">
  Made with ❤️ by MDtranslator Team
</p>
