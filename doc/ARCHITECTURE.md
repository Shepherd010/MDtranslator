# MDtranslator 项目架构与实施计划书 (Python Backend Edition)

## 1\. 交互过程 (Interaction Flow)

1.  **上传与解析 (Python处理)**：
      * 用户在前端拖拽上传 `.md` 文件。
      * 前端通过 API 将文件发送给 **Python 后端 (FastAPI)**。
      * **AST 解析与分块**：Python 后端使用 `markdown-it-py` 或 `mistune` 解析 Markdown 语法树。系统根据语义结构（如章节 H1/H2 或代码块边界）智能地将文档划分为多个 **Translation Chunks**，确保不会在代码块或 LaTeX 公式中间截断。
2.  **增量渲染预览**：
      * 前端接收解析后的基础结构，左屏加载编辑器，右屏使用 `react-markdown` + `rehype-katex` 渲染预览。
      * 此时文档状态为 "Raw"，仅显示原文。
3.  **异步并发翻译**：
      * 用户点击翻译，后端启动 **Asyncio 异步任务队列**。
      * Python 使用 `asyncio.Semaphore` 控制并发量，将 Chunks 并行发送给 LLM。
      * **WebSocket / SSE 推送**：后端通过 WebSocket 或 Server-Sent Events (SSE) 实时将翻译好的 Chunk 推送给前端。
      * 前端收到数据后，动态更新 DOM，用户会看到中文内容像流一样一段段出现，而不是死等。
4.  **四分屏交互**：
      * 当翻译进度开始更新，前端界面触发“英雄动画”，平滑过渡到四分屏模式。
      * 四屏内容实时同步更新。

## 2\. 前端布局 (Frontend UI/UX)

**核心技术栈**：`Next.js 14` + `Shadcn/ui` + `Framer Motion` + `Zustand` + `Socket.io-client`

1.  **主页设计**：
      * **极简主义风格**：中心为上传区域，支持拖拽。
      * **状态管理**：使用 Zustand 管理全局的 `isTranslating`, `layoutMode` (split/quad), `syncScrollPos`。
2.  **工作区布局（响应式四分屏）**：
      * **布局架构**：使用 CSS Grid (`grid-cols-2 grid-rows-2`)。
      * **动效核心**：利用 **Framer Motion** 的 `layout` 属性。
          * 从 `Split View` (左右) -\> `Quad View` (四格) 的切换必须是连续的变形动画，而非突兀的跳转。
3.  **智能缩放与“胶囊”交互**：
      * **放大逻辑**：点击“右上英文渲染”放大按钮 -\> 设置该 Grid Item 的 `col-span-2 row-span-2` -\> 触发 Layout Animation。
      * **胶囊化收缩**：
          * 被挤占的空间（如右下角）内的组件检测到布局变化，自动挂载 `AnimatePresence` 的 exit 动画，缩小为一个小巧的 **Pill Badge (胶囊标签)** 悬浮在边缘。
          * **交互细节**：鼠标悬停胶囊时，显示预览缩略图；点击胶囊，恢复四分屏。
4.  **双向同步滚动 (Sync Scroll)**：
      * **行号映射**：前端渲染时，利用 `remark-rehype` 插件将 Markdown 的行号 (`line-number`) 注入到 HTML 标签的 `data-line` 属性中。
      * **滚动监听**：监听主视口的滚动事件，计算当前中心行号，查找其他三个视口对应的 `data-line` 元素并执行 `scrollIntoView({ behavior: 'smooth' })`。
5.  **控制中心**：
      * **悬浮工具栏**：保存、载入、下载。
      * **下载增强**：前端生成下载文件，支持导出 `.md` (双语对照或纯中文) 和 `.pdf` (通过浏览器打印样式优化)。

## 3\. 后端 LLM (Backend Architecture - Python)

**核心技术栈**：`FastAPI` + `Asyncio` + `SQLAlchemy (Async)` + `SQLite` + `Markdown-it-py`

1.  **API 服务架构**：
      * 使用 **FastAPI** 构建高性能异步接口。
      * **Websocket Endpoint**: `/ws/translate/{doc_id}` 用于实时双向通信。
2.  **智能分块策略 (Smart Chunking with AST)**：
      * **库选型**：使用 `markdown-it-py` 获取 Token 流。
      * **逻辑**：
          * 遍历 Token 流，寻找顶级 Block (Paragraph, Heading, List, CodeFence)。
          * **累积法**：将 Token 还原为文本，累积到约 1000 Tokens 或遇到 H1/H2 时切分。
          * **元数据记录**：记录每个 Chunk 在原文中的 `start_line` 和 `end_line`，保证拼装顺序。
3.  **并发与速率限制 (Concurrency Control)**：
      * **Semaphore**：使用 `asyncio.Semaphore(5)` 限制同时进行的 LLM 请求不超过 5 个。
      * **Rate Limiter**：实现一个简单的令牌桶装饰器，防止 API 调用过快触发 429 错误。
4.  **数据持久化 (SQLite)**：
      * **ORM**: 使用 **SQLAlchemy (AsyncIO version)**。
      * **模型设计**：
        ```python
        class Document(Base):
            __tablename__ = "documents"
            id = Column(String, primary_key=True)
            original_content = Column(Text)
            # 存储分块数据的 JSON，包含已翻译和未翻译的部分
            chunks_data = Column(JSON) 
            status = Column(String) # 'processing', 'completed'
        ```
      * **自动保存**：每完成一个 Chunk 的翻译，立即 `await db.commit()` 更新 JSON 字段。

## 4\. Prompt 设置思考 (Prompt Engineering)

1.  **System Prompt**:
    ```text
    Role: You are a strict Markdown syntax preserver and translator.
    Task: Translate the English text content into Simplified Chinese.
    Constraint 1: NEVER translate or alter LaTeX equations ($...$), HTML tags, or Mermaid diagrams.
    Constraint 2: Keep Markdown structure (headers, tables, links) EXACTLY consistent.
    Constraint 3: Only translate comments inside code blocks; do not translate code logic.
    Constraint 4: Use the provided Glossary for terminology.
    ```
2.  **Context Injection (上下文注入)**:
      * 利用 Python 的字符串操作，构建如下 Prompt：
        ```text
        [Context Before]: ... (summary of prev chunk)
        [Context After]: ... (first 50 words of next chunk)
        [Glossary]: {"RAG": "检索增强生成", "Fine-tuning": "微调"}

        [Content to Translate]:
        {chunk_text}
        ```
3.  **校验与重试 (Self-Correction)**:
      * Python 后端在收到 LLM 响应后，使用 `markdown-it-py` 解析响应文本。
      * **比对检查**：检查译文的 Block 类型数量（如链接数量、图片数量）是否与原文匹配。如果不匹配，自动触发一次重试。

## 5\. 开源组件选型表 (Tech Stack Strategy)

| 模块 | 组件/库 | 选择理由 |
| :--- | :--- | :--- |
| **前端框架** | **Next.js 14** | React 最佳实践，负责界面渲染与路由。 |
| **UI 组件** | **Shadcn/ui** | 美观、可定制的 Tailwind 组件库。 |
| **动效库** | **Framer Motion** | 处理复杂的 Layout Animation (四分屏切换/胶囊化)。 |
| **后端框架** | **FastAPI** | Python 高性能异步 Web 框架，完美契合并发 LLM 调用。 |
| **MD 解析 (Py)**| **markdown-it-py** | 兼容 CommonMark，提供 Token 级别的控制，便于分块。 |
| **ORM** | **SQLAlchemy (Async)**| Python 界最成熟的 ORM，支持异步 SQLite 操作。 |
| **LLM SDK** | **OpenAI Python SDK** | 官方异步客户端 (`AsyncOpenAI`)。 |
| **通信协议** | **WebSockets** | 实现真正的流式传输，优于轮询。 |

## 6\. 限制与优化 (Constraints & Optimization)

1.  **后端限制**：
      * **Token 预计算**：使用 `tiktoken` 库在 Python 端预计算 Token 数，若预估费用过高，在前端弹出警告确认。
      * **超时控制**：设置 API 请求超时时间（如 60秒），防止某个 Chunk 翻译卡死阻塞队列。
2.  **安全性**：
      * **Prompt 注入防御**：将用户内容用特殊 Tag 包裹（如 `<user_input>`），并在 System Prompt 中声明忽略 Tag 内的指令。
      * **路径遍历防护**：上传文件仅保存在临时内存或哈希命名的存储桶中，不直接使用文件名。
3.  **体验优化**：
      * **流式打字机效果**：虽然 LLM 返回是按 Chunk 的，但在前端显示时，可以模拟打字机效果，让文本显现更丝滑。
      * **Diff 模式**：点击翻译后的代码块，前端弹出 Monaco Diff Editor，直观对比修改情况。
      * **本地缓存**：前端使用 `localStorage` 缓存最近打开的文档 ID，防止误关闭标签页后找不到文档。
