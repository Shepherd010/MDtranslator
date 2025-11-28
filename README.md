<div align="center">

# ⚡️ MDtranslator

### 下一代 LLM 驱动的所见即所得 (WYSIWYG) Markdown 翻译工作台

**实时交互 · 格式无损 · 并行加速 · 四屏对照**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js_14-black?logo=next.js&style=flat-square)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi&style=flat-square)](https://fastapi.tiangolo.com)
[![OpenAI](https://img.shields.io/badge/Model-LLM_Driven-412991?logo=openai&style=flat-square)](https://openai.com)

[📺 在线演示](#-演示) • [⚡ 核心优势](#-为什么选择-mdtranslator) • [🚀 快速部署](#-快速部署) • [🏗 技术架构](#-技术架构)

---

<br>

<img src="doc/preview.gif" alt="MDtranslator Demo" width="100%" style="border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.15);">

<br>
<br>

**不仅仅是一个翻译器，它是为您打造的「双语技术写作 IDE」。**
<br>摒弃传统的"复制-翻译-粘贴-修复格式"的痛苦循环，体验流一般的创作快感。

</div>

---

## 💥 为什么选择 MDtranslator？

我们重新思考了 Markdown 翻译的每一个环节，只为解决痛点。

| 您的痛点 😫 | MDtranslator 的革命性方案 ⚡️ |
| :--- | :--- |
| **交互割裂**<br>修改译文需要：下载->本地改->再预览，反复折磨。 | **所见即所得 (WYSIWYG) 四分屏**<br>首创 \`原文源码\` \| \`原文渲染\` \| \`译文源码\` \| \`译文渲染\` 四屏联动。<br>直接在网页修改译文，右侧实时渲染，不仅是翻译，更是编辑器。 |
| **格式灾难**<br>公式错乱、图表消失、代码块缩进报错。 | **AST 级格式保护**<br>基于抽象语法树解析，而非正则替换。完美还原 KaTeX 公式、Mermaid 图表及代码高亮。|
| **龟速等待**<br>长文档翻译像挤牙膏，且容易中断。 | **Block-Level 并行加速**<br>智能切分文档块，多线程并发调用 LLM。长文翻译速度提升 500%+，进度条实时可见。 |
| **数据易失**<br>网页一关，所有翻译记录全部丢失。 | **无感自动持久化**<br>内置 SQLite 数据库，每一个字符的修改都实时保存。随时关闭，随时回来，它一直都在。 |

---

## ✨ 核心特性

<div align="center">

<table>
<tr>
<td width="50%" align="center">
<h3>🚀 极速并行翻译</h3>
<p align="left">不再按行翻译。系统自动识别章节结构，将文档拆分为语义块，利用 LLM 并发能力，同时翻译多个段落，保持上下文连贯的同时实现极速响应。</p>
</td>
<td width="50%" align="center">
<h3>🖥️ 沉浸式四分屏 IDE</h3>
<p align="left">左侧代码，右侧预览；上部原文，下部译文。四个面板支持独立放大、缩小。专为校对和二次编辑设计，提供超越 IDE 的对比体验。</p>
</td>
</tr>
<tr>
<td width="50%" align="center">
<h3>🎨 完美渲染引擎</h3>
<p align="left">内置 <b>Mermaid</b> 流程图渲染、<b>KaTeX</b> 数学公式引擎。无论是复杂的学术论文还是带有甘特图的技术文档，都能原样呈现。</p>
</td>
<td width="50%" align="center">
<h3>💾 本地优先存储</h3>
<p align="left">所有数据存储在本地 SQLite。支持历史版本回溯，支持一键导出双语对照 MD、纯中文 MD 或 PDF 文档。</p>
</td>
</tr>
</table>

</div>

---

## 🏗️ 技术架构

MDtranslator 采用现代化的前后端分离架构，确保高性能与可扩展性。

\`\`\`mermaid
graph TD
    subgraph User_Experience [⚡ 前端交互层 - Next.js 14]
        UI[四分屏工作台]
        State[Zustand 状态管理]
        Preview[React-Markdown渲染引擎]
        Socket[WebSocket 实时通信]
        UI --> State
        State --> Preview
        State <--> Socket
    end

    subgraph Core_Logic [🧠 核心逻辑层 - FastAPI]
        API[API 网关]
        Chunker[AST 智能分块器]
        Queue[异步任务队列]
        Merger[上下文合并器]
        
        Socket <--> API
        API --> Chunker
        Chunker --> Queue
        Queue --> Merger
    end

    subgraph Data_Layer [💾 数据持久层]
        SQLite[(SQLite 数据库)]
        History[版本控制]
        API --> SQLite
    end

    subgraph AI_Engine [🤖 LLM 引擎]
        LLM_API[OpenAI / Qwen / Claude]
        Queue <--> LLM_API
    end
\`\`\`

---

## 🚀 快速部署

无需复杂的配置，三步即可拥有您的私人翻译工作台。

### 前置要求

* **Python** 3.10+
* **Node.js** 18+

### 1. 克隆仓库

\`\`\`bash
git clone https://github.com/Shepherd010/MDtranslator.git
cd MDtranslator
\`\`\`

### 2. 配置环境 (一行命令)

我们提供了自动化脚本来处理依赖安装和环境变量配置。

**Windows:**

\`\`\`powershell
# 复制配置文件
cp .env.example .env
# 启动安装脚本
.\start.ps1
\`\`\`

**Linux / Mac:**

\`\`\`bash
cp .env.example .env
bash start.sh
\`\`\`

### 3. 设置 LLM

编辑 \`.env\` 文件，填入您的 API Key（支持 OpenAI, DeepSeek, 阿里云 Qwen 等）。

\`\`\`ini
QWEN_API_KEY=sk-xxxxxxxxxxxxxxxx
QWEN_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL_NAME=qwen-flash
\`\`\`

### 4. 启动！

访问浏览器：\`http://localhost:3000\`

---

## 🗓️ 演进路线 (Roadmap)

我们致力于打造终极的文本处理工具。

- [x] **v1.0**: 核心功能上线（四分屏、并行翻译、AST保护）
- [x] **v1.1**: **双向翻译支持**（中文↔英文切换）
- [ ] **v1.2**: **秒级互译**（支持双向修改，改中文自动修正英文，改英文自动更新中文）
- [ ] **v1.3**: **多模态支持**（OCR 图片转 Markdown，PDF 解析）
- [ ] **v1.4**: **本地模型量化**（集成 Ollama，断网也能跑）
- [ ] **v2.0**: **协作工作流**（多人实时协作编辑，类似 Google Docs 的体验）

---

## 🤝 参与贡献

我们非常欢迎 Pull Request！

无论是修复 Bug、优化 Prompt，还是增加新的 UI 主题，您的每一次提交都在让这个工具变得更好。详见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。这意味着您可以自由地使用、修改和分发。

---

<div align="center">
<br>

**如果 MDtranslator 提升了您的效率，请给项目点个 ⭐ Star！**

Made with ❤️ by [Shepherd010](https://github.com/Shepherd010)

</div>
