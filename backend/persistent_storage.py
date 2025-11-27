"""
Simple in-memory storage for documents and settings.
Avoids SQLite locking issues in async environment.
"""
import json
from typing import Dict, Any, Optional, List
from datetime import datetime
from pathlib import Path

# File-based persistence (JSON)
DATA_DIR = Path(__file__).resolve().parent / "data"
DATA_DIR.mkdir(exist_ok=True)
DOCS_FILE = DATA_DIR / "documents.json"
SETTINGS_FILE = DATA_DIR / "settings.json"

# In-memory cache
_documents: Dict[str, Dict] = {}
_settings: Dict[str, Any] = {}

def _load_from_disk():
    """Load data from JSON files on startup"""
    global _documents, _settings
    try:
        if DOCS_FILE.exists():
            with open(DOCS_FILE, 'r', encoding='utf-8') as f:
                _documents = json.load(f)
            print(f"[Storage] Loaded {len(_documents)} documents from disk")
    except Exception as e:
        print(f"[Storage] Could not load documents: {e}")
        _documents = {}
    
    try:
        if SETTINGS_FILE.exists():
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                _settings = json.load(f)
            print(f"[Storage] Loaded settings from disk")
    except Exception as e:
        print(f"[Storage] Could not load settings: {e}")
        _settings = {}

def _save_docs():
    """Save documents to disk"""
    try:
        with open(DOCS_FILE, 'w', encoding='utf-8') as f:
            json.dump(_documents, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[Storage] Could not save documents: {e}")

def _save_settings():
    """Save settings to disk"""
    try:
        with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(_settings, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[Storage] Could not save settings: {e}")

# Load on import
_load_from_disk()

class PersistentStore:
    """Async-compatible storage interface using in-memory dict with JSON persistence"""
    
    async def create_document(self, doc_id: str, title: str, original_content: str, chunks_data: list) -> Dict:
        now = datetime.now().isoformat()
        doc = {
            "id": doc_id,
            "title": title,
            "original_content": original_content,
            "translated_content": "",
            "chunks_data": chunks_data,
            "status": "processing",
            "created_at": now,
            "updated_at": now,
            "is_translated": False
        }
        _documents[doc_id] = doc
        _save_docs()
        return doc
    
    async def get_document(self, doc_id: str) -> Optional[Dict]:
        doc = _documents.get(doc_id)
        if doc:
            # Ensure is_translated is set
            doc["is_translated"] = bool(doc.get("translated_content"))
        return doc
    
    async def get_all_documents(self) -> List[Dict]:
        docs = []
        for doc in sorted(_documents.values(), key=lambda x: x.get("updated_at", ""), reverse=True):
            docs.append({
                "id": doc["id"],
                "title": doc.get("title"),
                "status": doc.get("status", "pending"),
                "created_at": doc.get("created_at", ""),
                "updated_at": doc.get("updated_at", ""),
                "is_translated": bool(doc.get("translated_content"))
            })
        return docs
    
    async def update_chunk(self, doc_id: str, chunk_index: int, translated_text: str, status: str) -> bool:
        doc = _documents.get(doc_id)
        if not doc:
            return False
        
        chunks = doc.get("chunks_data", [])
        for chunk in chunks:
            if chunk.get("chunk_index") == chunk_index:
                chunk["translated_text"] = translated_text
                chunk["status"] = status
                break
        
        # Rebuild translated content
        sorted_chunks = sorted(chunks, key=lambda x: x.get("chunk_index", 0))
        translated_parts = [c.get("translated_text", "") for c in sorted_chunks if c.get("translated_text")]
        doc["translated_content"] = "\n\n".join(translated_parts)
        doc["chunks_data"] = chunks
        doc["updated_at"] = datetime.now().isoformat()
        doc["is_translated"] = bool(doc["translated_content"])
        
        _save_docs()
        return True
    
    async def update_document_status(self, doc_id: str, status: str) -> bool:
        doc = _documents.get(doc_id)
        if not doc:
            return False
        doc["status"] = status
        doc["updated_at"] = datetime.now().isoformat()
        _save_docs()
        return True
    
    async def delete_document(self, doc_id: str) -> bool:
        if doc_id in _documents:
            del _documents[doc_id]
            _save_docs()
            return True
        return False
    
    async def get_setting(self, key: str) -> Optional[Any]:
        return _settings.get(key)
    
    async def set_setting(self, key: str, value: Any) -> bool:
        _settings[key] = value
        _save_settings()
        return True
    
    async def get_all_settings(self) -> Dict:
        return _settings.copy()
    
    async def set_all_settings(self, settings: Dict) -> bool:
        _settings.update(settings)
        _save_settings()
        return True

# Global instance
document_store = PersistentStore()
