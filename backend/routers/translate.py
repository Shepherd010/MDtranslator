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

class DocumentResponse(BaseModel):
    id: str
    title: Optional[str]
    status: str
    created_at: str
    updated_at: str
    is_translated: bool

class SettingsRequest(BaseModel):
    settings: Dict[str, Any]

# --- Connection Manager ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, doc_id: str, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[doc_id] = websocket

    def disconnect(self, doc_id: str):
        if doc_id in self.active_connections:
            del self.active_connections[doc_id]

    async def send_message(self, doc_id: str, message: dict):
        if doc_id in self.active_connections:
            try:
                await self.active_connections[doc_id].send_json(message)
            except Exception as e:
                print(f"Error sending message to {doc_id}: {e}")

manager = ConnectionManager()

# --- Prompt Engineering ---
def load_system_prompt():
    try:
        prompt_path = os.path.join(os.path.dirname(__file__), "..", "prompts", "system_prompt.txt")
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        print(f"Error loading system prompt: {e}")
        return "You are a translator. Translate the given text to Chinese, preserving all markdown formatting."

SYSTEM_PROMPT = load_system_prompt()

def build_user_prompt(content: str, pre_context: str = "", post_context: str = "") -> str:
    prompt = ""
    if pre_context:
        prompt += f"[Pre-Context (Do not translate)]:\n{pre_context}\n\n"
    prompt += f"[Task (Translate to Chinese)]:\n{content}\n\n"
    if post_context:
        prompt += f"[Post-Context (Do not translate)]:\n{post_context}\n"
    return prompt

# --- Translation Logic ---
CONCURRENCY_LIMIT = 5
semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)

async def translate_chunk_task(doc_id: str, chunk: dict, client: AsyncOpenAI, pre_context: str, post_context: str):
    async with semaphore:
        chunk_index = chunk["chunk_index"]
        
        await manager.send_message(doc_id, {
            "type": "chunk_update",
            "chunkIndex": chunk_index,
            "data": {"status": "processing", "translatedText": ""}
        })
        
        try:
            user_content = build_user_prompt(chunk["raw_text"], pre_context, post_context)
            system_content = SYSTEM_PROMPT
            
            api_key = os.getenv("QWEN_API_KEY")
            if not api_key or api_key == "your_api_key_here":
                await asyncio.sleep(1)
                mock_text = f"[模拟翻译] {chunk['raw_text'][:50]}..."
                await manager.send_message(doc_id, {
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
                    await manager.send_message(doc_id, {
                        "type": "chunk_update",
                        "chunkIndex": chunk_index,
                        "data": {"translatedText": full_text}
                    })
            
            await manager.send_message(doc_id, {
                "type": "chunk_update",
                "chunkIndex": chunk_index,
                "data": {"status": "completed", "translatedText": full_text}
            })
            
            await document_store.update_chunk(doc_id, chunk_index, full_text, "completed")
            
        except Exception as e:
            print(f"Error translating chunk {chunk_index}: {e}")
            await manager.send_message(doc_id, {
                "type": "chunk_update",
                "chunkIndex": chunk_index,
                "data": {"status": "error"}
            })
            await document_store.update_chunk(doc_id, chunk_index, "", "error")

# --- Document Endpoints ---
@router.post("/api/translate")
async def create_translation_task(request: TranslateRequest):
    doc_id = str(uuid.uuid4())
    
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
    
    return {"docId": doc_id, "chunks": chunks}

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
async def websocket_translate_handler(websocket: WebSocket, doc_id: str):
    """WebSocket handler for translation - can be called from main.py"""
    await manager.connect(doc_id, websocket)
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
        print(f"[WS] Found {len(chunks)} chunks to translate")
        tasks = []
        
        for i, chunk in enumerate(chunks):
            if chunk.get("status") == "pending":
                pre_context = chunks[i-1]["raw_text"][-200:] if i > 0 else ""
                post_context = chunks[i+1]["raw_text"][:200] if i < len(chunks) - 1 else ""
                
                task = asyncio.create_task(
                    translate_chunk_task(doc_id, chunk, client, pre_context, post_context)
                )
                tasks.append(task)
        
        print(f"[WS] Starting {len(tasks)} translation tasks")
        if tasks:
            await asyncio.gather(*tasks)
        
        # Update document status
        await document_store.update_document_status(doc_id, "completed")
        
        print(f"[WS] All tasks complete, sending completion message")
        await manager.send_message(doc_id, {"type": "complete"})
        
        while True:
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=60)
            except asyncio.TimeoutError:
                continue
            
    except WebSocketDisconnect:
        print(f"[WS] Client disconnected: {doc_id}")
        manager.disconnect(doc_id)
    except Exception as e:
        import traceback
        print(f"[WS] WebSocket error: {e}")
        print(traceback.format_exc())
        manager.disconnect(doc_id)
