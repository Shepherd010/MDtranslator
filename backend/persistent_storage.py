"""
SQLite-based persistent storage for documents and settings.
Uses aiosqlite for async operations.
"""
import json
import aiosqlite
from typing import Dict, Any, Optional, List
from datetime import datetime
from pathlib import Path

# Database file path
DATA_DIR = Path(__file__).resolve().parent / "data"
DATA_DIR.mkdir(exist_ok=True)
DB_PATH = DATA_DIR / "mdtranslator.db"

# SQL statements
CREATE_DOCUMENTS_TABLE = """
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT,
    original_content TEXT,
    translated_content TEXT DEFAULT '',
    chunks_data TEXT DEFAULT '[]',
    status TEXT DEFAULT 'pending',
    created_at TEXT,
    updated_at TEXT
)
"""

CREATE_SETTINGS_TABLE = """
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
)
"""

CREATE_INDEX = """
CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at DESC)
"""


class PersistentStore:
    """Async SQLite storage interface"""
    
    def __init__(self):
        self._initialized = False
    
    def _get_connection(self):
        """Get database connection context manager"""
        return aiosqlite.connect(DB_PATH)
    
    async def _ensure_initialized(self, conn: aiosqlite.Connection):
        """Ensure tables exist (called once per app lifecycle)"""
        if not self._initialized:
            conn.row_factory = aiosqlite.Row
            await conn.execute(CREATE_DOCUMENTS_TABLE)
            await conn.execute(CREATE_SETTINGS_TABLE)
            await conn.execute(CREATE_INDEX)
            await conn.commit()
            self._initialized = True
            print(f"[Storage] SQLite database initialized at {DB_PATH}")
    
    async def create_document(self, doc_id: str, title: str, original_content: str, chunks_data: list) -> Dict:
        """Create a new document"""
        now = datetime.now().isoformat()
        chunks_json = json.dumps(chunks_data, ensure_ascii=False)
        
        async with self._get_connection() as conn:
            conn.row_factory = aiosqlite.Row
            await self._ensure_initialized(conn)
            await conn.execute(
                """INSERT INTO documents (id, title, original_content, translated_content, chunks_data, status, created_at, updated_at)
                   VALUES (?, ?, ?, '', ?, 'processing', ?, ?)""",
                (doc_id, title, original_content, chunks_json, now, now)
            )
            await conn.commit()
        
        return {
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
    
    async def get_document(self, doc_id: str) -> Optional[Dict]:
        """Get a document by ID"""
        async with self._get_connection() as conn:
            conn.row_factory = aiosqlite.Row
            await self._ensure_initialized(conn)
            cursor = await conn.execute(
                "SELECT * FROM documents WHERE id = ?", (doc_id,)
            )
            row = await cursor.fetchone()
            
            if not row:
                return None
            
            return {
                "id": row["id"],
                "title": row["title"],
                "original_content": row["original_content"],
                "translated_content": row["translated_content"] or "",
                "chunks_data": json.loads(row["chunks_data"] or "[]"),
                "status": row["status"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
                "is_translated": bool(row["translated_content"])
            }
    
    async def get_all_documents(self) -> List[Dict]:
        """Get all documents (summary only, sorted by updated_at desc)"""
        async with self._get_connection() as conn:
            conn.row_factory = aiosqlite.Row
            await self._ensure_initialized(conn)
            cursor = await conn.execute(
                """SELECT id, title, status, created_at, updated_at, translated_content
                   FROM documents ORDER BY updated_at DESC"""
            )
            rows = await cursor.fetchall()
            
            return [
                {
                    "id": row["id"],
                    "title": row["title"],
                    "status": row["status"],
                    "created_at": row["created_at"],
                    "updated_at": row["updated_at"],
                    "is_translated": bool(row["translated_content"])
                }
                for row in rows
            ]
    
    async def update_chunk(self, doc_id: str, chunk_index: int, translated_text: str, status: str) -> bool:
        """Update a chunk's translation and rebuild translated content"""
        async with self._get_connection() as conn:
            conn.row_factory = aiosqlite.Row
            await self._ensure_initialized(conn)
            # Get current chunks
            cursor = await conn.execute(
                "SELECT chunks_data FROM documents WHERE id = ?", (doc_id,)
            )
            row = await cursor.fetchone()
            
            if not row:
                return False
            
            chunks = json.loads(row["chunks_data"] or "[]")
            
            # Update the specific chunk
            for chunk in chunks:
                if chunk.get("chunk_index") == chunk_index:
                    chunk["translated_text"] = translated_text
                    chunk["status"] = status
                    break
            
            # Rebuild translated content
            sorted_chunks = sorted(chunks, key=lambda x: x.get("chunk_index", 0))
            translated_parts = [c.get("translated_text", "") for c in sorted_chunks if c.get("translated_text")]
            translated_content = "".join(translated_parts)
            
            # Update database
            now = datetime.now().isoformat()
            await conn.execute(
                """UPDATE documents 
                   SET chunks_data = ?, translated_content = ?, updated_at = ?
                   WHERE id = ?""",
                (json.dumps(chunks, ensure_ascii=False), translated_content, now, doc_id)
            )
            await conn.commit()
            
            return True
    
    async def update_document_status(self, doc_id: str, status: str) -> bool:
        """Update document status"""
        now = datetime.now().isoformat()
        
        async with self._get_connection() as conn:
            conn.row_factory = aiosqlite.Row
            await self._ensure_initialized(conn)
            cursor = await conn.execute(
                "UPDATE documents SET status = ?, updated_at = ? WHERE id = ?",
                (status, now, doc_id)
            )
            await conn.commit()
            return cursor.rowcount > 0
    
    async def delete_document(self, doc_id: str) -> bool:
        """Delete a document"""
        async with self._get_connection() as conn:
            conn.row_factory = aiosqlite.Row
            await self._ensure_initialized(conn)
            cursor = await conn.execute(
                "DELETE FROM documents WHERE id = ?", (doc_id,)
            )
            await conn.commit()
            return cursor.rowcount > 0
    
    async def get_setting(self, key: str) -> Optional[Any]:
        """Get a setting value"""
        async with self._get_connection() as conn:
            conn.row_factory = aiosqlite.Row
            await self._ensure_initialized(conn)
            cursor = await conn.execute(
                "SELECT value FROM settings WHERE key = ?", (key,)
            )
            row = await cursor.fetchone()
            
            if not row:
                return None
            
            try:
                return json.loads(row["value"])
            except json.JSONDecodeError:
                return row["value"]
    
    async def set_setting(self, key: str, value: Any) -> bool:
        """Set a setting value"""
        value_json = json.dumps(value, ensure_ascii=False) if not isinstance(value, str) else value
        
        async with self._get_connection() as conn:
            conn.row_factory = aiosqlite.Row
            await self._ensure_initialized(conn)
            await conn.execute(
                """INSERT INTO settings (key, value) VALUES (?, ?)
                   ON CONFLICT(key) DO UPDATE SET value = excluded.value""",
                (key, value_json)
            )
            await conn.commit()
            return True
    
    async def get_all_settings(self) -> Dict:
        """Get all settings"""
        async with self._get_connection() as conn:
            conn.row_factory = aiosqlite.Row
            await self._ensure_initialized(conn)
            cursor = await conn.execute("SELECT key, value FROM settings")
            rows = await cursor.fetchall()
            
            settings = {}
            for row in rows:
                try:
                    settings[row["key"]] = json.loads(row["value"])
                except json.JSONDecodeError:
                    settings[row["key"]] = row["value"]
            
            return settings
    
    async def set_all_settings(self, settings: Dict) -> bool:
        """Set multiple settings at once"""
        async with self._get_connection() as conn:
            conn.row_factory = aiosqlite.Row
            await self._ensure_initialized(conn)
            for key, value in settings.items():
                value_json = json.dumps(value, ensure_ascii=False) if not isinstance(value, str) else value
                await conn.execute(
                    """INSERT INTO settings (key, value) VALUES (?, ?)
                       ON CONFLICT(key) DO UPDATE SET value = excluded.value""",
                    (key, value_json)
                )
            await conn.commit()
            return True


# Global instance
store = PersistentStore()
