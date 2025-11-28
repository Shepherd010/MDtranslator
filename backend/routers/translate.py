import os
import json
import asyncio
import uuid
from typing import List, Dict, Optional, Any, Set
import threading
import time

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from openai import AsyncOpenAI
import httpx

from persistent_storage import store as document_store
from markdown_utils import split_into_chunks

router = APIRouter()

# 全局共享的 OpenAI 客户端 (带连接池)
# 避免每个请求都创建新的 HTTP 连接
_openai_client: Optional[AsyncOpenAI] = None
_client_lock = threading.Lock()

def get_openai_client() -> AsyncOpenAI:
    """获取共享的 OpenAI 客户端"""
    global _openai_client
    if _openai_client is None:
        with _client_lock:
            if _openai_client is None:
                api_key = os.getenv("QWEN_API_KEY")
                base_url = os.getenv("QWEN_API_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
                # 创建带连接池的客户端
                http_client = httpx.AsyncClient(
                    limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
                    timeout=httpx.Timeout(60.0, connect=10.0)
                )
                _openai_client = AsyncOpenAI(
                    api_key=api_key,
                    base_url=base_url,
                    http_client=http_client
                )
    return _openai_client

# --- Request/Response Models ---
class TranslateRequest(BaseModel):
    content: str
    title: Optional[str] = None
    direction: Optional[str] = "en2zh"  # en2zh 或 zh2en

class DocumentResponse(BaseModel):
    id: str
    title: Optional[str]
    status: str
    created_at: str
    updated_at: str
    is_translated: bool

class SettingsRequest(BaseModel):
    settings: Dict[str, Any]

# --- Connection Manager (支持多用户并发) ---
class ConnectionManager:
    def __init__(self):
        # 结构: {doc_id: {connection_id: WebSocket}}
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}
        # 跟踪已关闭的连接，避免重复发送
        self.closed_connections: Set[str] = set()
        self._lock = asyncio.Lock()

    def _conn_key(self, doc_id: str, connection_id: str) -> str:
        return f"{doc_id}/{connection_id}"

    async def connect(self, doc_id: str, connection_id: str, websocket: WebSocket):
        """连接新的 WebSocket 客户端"""
        await websocket.accept()
        async with self._lock:
            if doc_id not in self.active_connections:
                self.active_connections[doc_id] = {}
            self.active_connections[doc_id][connection_id] = websocket
            # 从已关闭列表中移除（如果存在）
            self.closed_connections.discard(self._conn_key(doc_id, connection_id))
            print(f"[WS] Connected: doc={doc_id[:8]}, conn={connection_id[:20]}")

    async def disconnect(self, doc_id: str, connection_id: str):
        """断开 WebSocket 连接"""
        conn_key = self._conn_key(doc_id, connection_id)
        async with self._lock:
            # 标记为已关闭
            self.closed_connections.add(conn_key)
            if doc_id in self.active_connections:
                if connection_id in self.active_connections[doc_id]:
                    del self.active_connections[doc_id][connection_id]
                    print(f"[WS] Disconnected: doc={doc_id[:8]}, conn={connection_id[:20]}")
                if not self.active_connections[doc_id]:
                    del self.active_connections[doc_id]

    def is_connected(self, doc_id: str, connection_id: str) -> bool:
        """检查连接是否仍然有效"""
        conn_key = self._conn_key(doc_id, connection_id)
        if conn_key in self.closed_connections:
            return False
        return (doc_id in self.active_connections and 
                connection_id in self.active_connections[doc_id])

    async def send_message(self, doc_id: str, connection_id: str, message: dict) -> bool:
        """发送消息给特定连接，返回是否成功"""
        # 快速检查连接状态
        if not self.is_connected(doc_id, connection_id):
            return False
        
        try:
            ws = self.active_connections.get(doc_id, {}).get(connection_id)
            if ws:
                await ws.send_json(message)
                return True
        except Exception:
            # 连接已失效，静默处理，标记为关闭
            await self.disconnect(doc_id, connection_id)
        return False

    async def broadcast_to_doc(self, doc_id: str, message: dict):
        """广播消息给文档的所有连接"""
        if doc_id in self.active_connections:
            dead_connections = []
            for conn_id, ws in list(self.active_connections.get(doc_id, {}).items()):
                try:
                    await ws.send_json(message)
                except Exception:
                    dead_connections.append(conn_id)
            for conn_id in dead_connections:
                await self.disconnect(doc_id, conn_id)

    def get_connection_count(self, doc_id: str = None) -> int:
        """获取连接数"""
        if doc_id:
            return len(self.active_connections.get(doc_id, {}))
        return sum(len(conns) for conns in self.active_connections.values())

manager = ConnectionManager()

# --- Prompt Engineering ---
def load_system_prompt(direction: str = "en2zh"):
    """Load system prompt based on translation direction"""
    try:
        if direction == "zh2en":
            prompt_file = "system_prompt_to_C.txt"  # 中文到英文
        else:
            prompt_file = "system_prompt_to_E.txt"  # 英文到中文
        
        prompt_path = os.path.join(os.path.dirname(__file__), "..", "prompts", prompt_file)
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        print(f"Error loading system prompt: {e}")
        if direction == "zh2en":
            return "You are a translator. Translate the given text to English, preserving all markdown formatting."
        return "You are a translator. Translate the given text to Chinese, preserving all markdown formatting."

def build_user_prompt(content: str, pre_context: str = "", post_context: str = "", direction: str = "en2zh") -> str:
    target_lang = "Chinese" if direction == "en2zh" else "English"
    prompt = ""
    if pre_context:
        prompt += f"[Pre-Context (Do not translate)]:\n{pre_context}\n\n"
    prompt += f"[Task (Translate to {target_lang})]:\n{content}\n\n"
    if post_context:
        prompt += f"[Post-Context (Do not translate)]:\n{post_context}\n"
    return prompt

# --- Translation Logic ---
# 存储每个文档的翻译方向
doc_directions: Dict[str, str] = {}

# 每个连接的翻译会话类
class TranslationSession:
    """
    每个翻译会话独立管理自己的并发控制
    支持取消和连接状态检查
    """
    def __init__(self, doc_id: str, connection_id: str, chunks_per_session: int = 5):
        self.doc_id = doc_id
        self.connection_id = connection_id
        self.semaphore = asyncio.Semaphore(chunks_per_session)
        self.direction = doc_directions.get(doc_id, "en2zh")
        self.cancelled = False
        self._tasks: List[asyncio.Task] = []
        # 节流控制：限制消息发送频率
        self._last_send_time: Dict[int, float] = {}
        self._send_interval = 0.05  # 最小发送间隔 50ms

    def is_active(self) -> bool:
        """检查会话是否仍然有效"""
        return not self.cancelled and manager.is_connected(self.doc_id, self.connection_id)

    def cancel(self):
        """取消翻译会话"""
        self.cancelled = True
        for task in self._tasks:
            if not task.done():
                task.cancel()

    async def send_update(self, message: dict, force: bool = False) -> bool:
        """
        发送更新，带节流控制
        force=True 时强制发送（用于状态变更）
        """
        if not self.is_active():
            return False
        
        # 节流：非强制更新时检查发送间隔
        if not force and message.get("type") == "chunk_update":
            chunk_idx = message.get("chunkIndex", 0)
            now = asyncio.get_event_loop().time()
            last_time = self._last_send_time.get(chunk_idx, 0)
            if now - last_time < self._send_interval:
                return True  # 跳过这次发送，但返回成功
            self._last_send_time[chunk_idx] = now
        
        return await manager.send_message(self.doc_id, self.connection_id, message)

    async def translate_chunk(self, chunk: dict, client: AsyncOpenAI, pre_context: str, post_context: str):
        """翻译单个 chunk"""
        if not self.is_active():
            return
            
        async with self.semaphore:
            if not self.is_active():
                return
                
            chunk_index = chunk["chunk_index"]
            
            # 发送处理中状态 (强制发送)
            if not await self.send_update({
                "type": "chunk_update",
                "chunkIndex": chunk_index,
                "data": {"status": "processing", "translatedText": ""}
            }, force=True):
                return
            
            try:
                user_content = build_user_prompt(chunk["raw_text"], pre_context, post_context, self.direction)
                system_content = load_system_prompt(self.direction)
                
                api_key = os.getenv("QWEN_API_KEY")
                if not api_key or api_key == "your_api_key_here":
                    await asyncio.sleep(0.1)
                    if not self.is_active():
                        return
                    mock_prefix = "[Mock EN]" if self.direction == "zh2en" else "[模拟翻译]"
                    mock_text = f"{mock_prefix} {chunk['raw_text'][:50]}..."
                    await self.send_update({
                        "type": "chunk_update",
                        "chunkIndex": chunk_index,
                        "data": {"status": "completed", "translatedText": mock_text}
                    }, force=True)
                    await document_store.update_chunk(self.doc_id, chunk_index, mock_text, "completed")
                    return

                stream = await client.chat.completions.create(
                    model=os.getenv("QWEN_MODEL_NAME", "qwen-flash"),
                    messages=[
                        {"role": "system", "content": system_content},
                        {"role": "user", "content": user_content}
                    ],
                    stream=True,
                    temperature=0.1,
                )
                
                full_text = ""
                token_count = 0
                async for part in stream:
                    if not self.is_active():
                        return
                    
                    content = part.choices[0].delta.content or ""
                    if content:
                        full_text += content
                        token_count += 1
                        # 每 3 个 token 或带节流发送一次更新
                        if token_count % 3 == 0:
                            await self.send_update({
                                "type": "chunk_update",
                                "chunkIndex": chunk_index,
                                "data": {"translatedText": full_text}
                            })
                
                # 最终完成状态 (强制发送)
                await self.send_update({
                    "type": "chunk_update",
                    "chunkIndex": chunk_index,
                    "data": {"status": "completed", "translatedText": full_text}
                }, force=True)
                
                await document_store.update_chunk(self.doc_id, chunk_index, full_text, "completed")
                
            except asyncio.CancelledError:
                raise
            except Exception as e:
                if self.is_active():
                    print(f"[Session] Error chunk {chunk_index}: {e}")
                    await self.send_update({
                        "type": "chunk_update",
                        "chunkIndex": chunk_index,
                        "data": {"status": "error"}
                    }, force=True)
                await document_store.update_chunk(self.doc_id, chunk_index, "", "error")

    async def run_translation(self, chunks: list, client: AsyncOpenAI):
        """运行整个翻译会话"""
        self._tasks = []
        for i, chunk in enumerate(chunks):
            if not self.is_active():
                break
            if chunk.get("status") == "pending":
                pre_context = chunks[i-1]["raw_text"][-200:] if i > 0 else ""
                post_context = chunks[i+1]["raw_text"][:200] if i < len(chunks) - 1 else ""
                task = asyncio.create_task(
                    self.translate_chunk(chunk, client, pre_context, post_context)
                )
                self._tasks.append(task)
        
        if self._tasks:
            # 等待所有任务完成，忽略取消的任务
            await asyncio.gather(*self._tasks, return_exceptions=True)

# --- Document Endpoints ---
@router.post("/api/translate")
async def create_translation_task(request: TranslateRequest):
    doc_id = str(uuid.uuid4())
    
    # 保存翻译方向
    direction = request.direction or "en2zh"
    doc_directions[doc_id] = direction
    
    # Get num_chunks from settings (default: 3)
    settings = await document_store.get_all_settings()
    num_chunks = settings.get("num_chunks", 3)
    
    chunks = split_into_chunks(request.content, num_chunks=num_chunks)
    title = request.title or f"文档 {doc_id[:8]}"
    
    await document_store.create_document(
        doc_id=doc_id,
        title=title,
        original_content=request.content,
        chunks_data=chunks
    )
    
    return {"docId": doc_id, "chunks": chunks, "direction": direction}

@router.get("/api/documents")
async def get_all_documents():
    """Get all saved documents"""
    docs = await document_store.get_all_documents()
    return {"documents": docs}

@router.get("/api/documents/{doc_id}")
async def get_document(doc_id: str):
    """Get a specific document with full content"""
    doc = await document_store.get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document"""
    success = await document_store.delete_document(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found")
    return {"success": True}

# --- Status/Monitoring Endpoint ---
@router.get("/api/status")
async def get_status():
    """获取系统状态"""
    return {
        "status": "running",
        "active_connections": manager.get_connection_count(),
        "active_sessions": len(active_sessions),
        "connections_by_doc": {
            doc_id[:8]: len(conns) 
            for doc_id, conns in manager.active_connections.items()
        }
    }

# --- Settings Endpoints ---
@router.get("/api/settings")
async def get_settings():
    """Get all settings"""
    settings = await document_store.get_all_settings()
    # Return defaults if not set
    defaults = {
        "llm_provider": "qwen",
        "llm_model": os.getenv("QWEN_MODEL_NAME", "qwen-flash"),
        "temperature": 0.1,
        "num_chunks": 3,
        "auto_save": True
    }
    return {**defaults, **settings}

@router.post("/api/settings")
async def save_settings(request: SettingsRequest):
    """Save settings"""
    for key, value in request.settings.items():
        await document_store.set_setting(key, value)
    return {"success": True}

# --- WebSocket Endpoint ---
# 存储活跃的翻译会话，用于在断开时取消
active_sessions: Dict[str, TranslationSession] = {}

async def websocket_translate_handler(websocket: WebSocket, doc_id: str, connection_id: str = None):
    """
    WebSocket handler for translation
    每个连接创建独立的 TranslationSession，完全并行处理
    支持在断开时取消正在进行的翻译
    """
    if not connection_id:
        connection_id = str(uuid.uuid4())
    
    session_key = f"{doc_id}/{connection_id}"
    session = None
    
    await manager.connect(doc_id, connection_id, websocket)
    print(f"[WS] New connection: doc={doc_id[:8]}, conn={connection_id[:20]}")
    
    try:
        doc = await document_store.get_document(doc_id)
        
        if not doc:
            print(f"[WS] Document {doc_id[:8]} not found")
            await websocket.close(code=4004, reason="Document not found")
            return

        # 使用共享的 OpenAI 客户端 (带连接池)
        client = get_openai_client()
        
        chunks = doc["chunks_data"]
        pending_count = sum(1 for c in chunks if c.get("status") == "pending")
        print(f"[WS] Starting: {pending_count} chunks, conn={connection_id[:16]}")
        
        # 创建独立的翻译会话
        session = TranslationSession(doc_id, connection_id, chunks_per_session=5)
        active_sessions[session_key] = session
        
        # 运行翻译
        await session.run_translation(chunks, client)
        
        # 检查是否被取消
        if session.is_active():
            await document_store.update_document_status(doc_id, "completed")
            await manager.send_message(doc_id, connection_id, {"type": "complete"})
            print(f"[WS] Complete: conn={connection_id[:16]}")
        
        # 保持连接
        while manager.is_connected(doc_id, connection_id):
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=30)
            except asyncio.TimeoutError:
                continue
            except WebSocketDisconnect:
                break
            
    except WebSocketDisconnect:
        pass  # 正常断开，静默处理
    except asyncio.CancelledError:
        pass  # 任务取消，静默处理
    except Exception as e:
        print(f"[WS] Error: {type(e).__name__}: {e}")
    finally:
        # 清理
        if session:
            session.cancel()
        if session_key in active_sessions:
            del active_sessions[session_key]
        await manager.disconnect(doc_id, connection_id)
