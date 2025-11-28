import os
import json
import asyncio
import uuid
from typing import List, Dict, Optional, Any

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from openai import AsyncOpenAI

from persistent_storage import store as document_store
from markdown_utils import split_into_chunks

router = APIRouter()

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
        self._lock = asyncio.Lock()

    async def connect(self, doc_id: str, connection_id: str, websocket: WebSocket):
        """连接新的 WebSocket 客户端"""
        await websocket.accept()
        async with self._lock:
            if doc_id not in self.active_connections:
                self.active_connections[doc_id] = {}
            self.active_connections[doc_id][connection_id] = websocket
            print(f"[WS Manager] Connected: doc={doc_id}, conn={connection_id}, total connections for doc: {len(self.active_connections[doc_id])}")

    async def disconnect(self, doc_id: str, connection_id: str):
        """断开 WebSocket 连接"""
        async with self._lock:
            if doc_id in self.active_connections:
                if connection_id in self.active_connections[doc_id]:
                    del self.active_connections[doc_id][connection_id]
                    print(f"[WS Manager] Disconnected: doc={doc_id}, conn={connection_id}")
                # 如果该文档没有更多连接，清理空字典
                if not self.active_connections[doc_id]:
                    del self.active_connections[doc_id]

    async def send_message(self, doc_id: str, connection_id: str, message: dict):
        """发送消息给特定连接"""
        if doc_id in self.active_connections:
            if connection_id in self.active_connections[doc_id]:
                try:
                    await self.active_connections[doc_id][connection_id].send_json(message)
                except Exception as e:
                    print(f"[WS Manager] Error sending to {doc_id}/{connection_id}: {e}")

    async def broadcast_to_doc(self, doc_id: str, message: dict):
        """广播消息给文档的所有连接（用于协作场景）"""
        if doc_id in self.active_connections:
            dead_connections = []
            for conn_id, ws in self.active_connections[doc_id].items():
                try:
                    await ws.send_json(message)
                except Exception as e:
                    print(f"[WS Manager] Broadcast error to {conn_id}: {e}")
                    dead_connections.append(conn_id)
            # 清理失效连接
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
CONCURRENCY_LIMIT = 5
semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)

# 存储每个文档的翻译方向
doc_directions: Dict[str, str] = {}

async def translate_chunk_task(doc_id: str, connection_id: str, chunk: dict, client: AsyncOpenAI, pre_context: str, post_context: str):
    """翻译单个 chunk，支持指定连接 ID"""
    async with semaphore:
        chunk_index = chunk["chunk_index"]
        direction = doc_directions.get(doc_id, "en2zh")
        
        await manager.send_message(doc_id, connection_id, {
            "type": "chunk_update",
            "chunkIndex": chunk_index,
            "data": {"status": "processing", "translatedText": ""}
        })
        
        try:
            user_content = build_user_prompt(chunk["raw_text"], pre_context, post_context, direction)
            system_content = load_system_prompt(direction)
            
            api_key = os.getenv("QWEN_API_KEY")
            if not api_key or api_key == "your_api_key_here":
                await asyncio.sleep(1)
                mock_prefix = "[Mock EN]" if direction == "zh2en" else "[模拟翻译]"
                mock_text = f"{mock_prefix} {chunk['raw_text'][:50]}..."
                await manager.send_message(doc_id, connection_id, {
                    "type": "chunk_update",
                    "chunkIndex": chunk_index,
                    "data": {"status": "completed", "translatedText": mock_text}
                })
                await document_store.update_chunk(doc_id, chunk_index, mock_text, "completed")
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
            async for part in stream:
                content = part.choices[0].delta.content or ""
                if content:
                    full_text += content
                    await manager.send_message(doc_id, connection_id, {
                        "type": "chunk_update",
                        "chunkIndex": chunk_index,
                        "data": {"translatedText": full_text}
                    })
            
            await manager.send_message(doc_id, connection_id, {
                "type": "chunk_update",
                "chunkIndex": chunk_index,
                "data": {"status": "completed", "translatedText": full_text}
            })
            
            await document_store.update_chunk(doc_id, chunk_index, full_text, "completed")
            
        except Exception as e:
            print(f"Error translating chunk {chunk_index}: {e}")
            await manager.send_message(doc_id, connection_id, {
                "type": "chunk_update",
                "chunkIndex": chunk_index,
                "data": {"status": "error"}
            })
            await document_store.update_chunk(doc_id, chunk_index, "", "error")

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
    """获取系统状态，包括活跃连接数"""
    return {
        "status": "running",
        "active_connections": manager.get_connection_count(),
        "connections_by_doc": {
            doc_id: len(conns) 
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
async def websocket_translate_handler(websocket: WebSocket, doc_id: str, connection_id: str = None):
    """
    WebSocket handler for translation - can be called from main.py
    支持多用户并发：每个连接有唯一 connection_id
    """
    # 生成唯一的连接 ID
    if not connection_id:
        connection_id = str(uuid.uuid4())
    
    await manager.connect(doc_id, connection_id, websocket)
    print(f"[WS] New connection: doc={doc_id}, conn={connection_id}")
    
    try:
        doc = await document_store.get_document(doc_id)
        print(f"[WS] Document lookup for {doc_id}: {'Found' if doc else 'Not Found'}")
        
        if not doc:
            print(f"[WS] Document {doc_id} not found, closing connection")
            await websocket.close(code=4004, reason="Document not found")
            return

        api_key = os.getenv("QWEN_API_KEY")
        base_url = os.getenv("QWEN_API_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
        print(f"[WS] Initializing client with base_url: {base_url}")
        client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        
        chunks = doc["chunks_data"]
        print(f"[WS] Found {len(chunks)} chunks to translate for conn={connection_id}")
        tasks = []
        
        for i, chunk in enumerate(chunks):
            if chunk.get("status") == "pending":
                pre_context = chunks[i-1]["raw_text"][-200:] if i > 0 else ""
                post_context = chunks[i+1]["raw_text"][:200] if i < len(chunks) - 1 else ""
                
                task = asyncio.create_task(
                    translate_chunk_task(doc_id, connection_id, chunk, client, pre_context, post_context)
                )
                tasks.append(task)
        
        print(f"[WS] Starting {len(tasks)} translation tasks for conn={connection_id}")
        if tasks:
            await asyncio.gather(*tasks)
        
        # Update document status
        await document_store.update_document_status(doc_id, "completed")
        
        print(f"[WS] All tasks complete for conn={connection_id}, sending completion message")
        await manager.send_message(doc_id, connection_id, {"type": "complete"})
        
        # Keep connection alive for potential follow-up messages
        while True:
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=60)
            except asyncio.TimeoutError:
                continue
            
    except WebSocketDisconnect:
        print(f"[WS] Client disconnected: doc={doc_id}, conn={connection_id}")
        await manager.disconnect(doc_id, connection_id)
    except Exception as e:
        import traceback
        print(f"[WS] WebSocket error for conn={connection_id}: {e}")
        print(traceback.format_exc())
        await manager.disconnect(doc_id, connection_id)
