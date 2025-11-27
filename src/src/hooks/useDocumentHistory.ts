"use client";

import { useState, useCallback } from 'react';
import { useDocumentStore } from '@/store/useDocumentStore';

export interface HistoryDoc {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  is_translated: boolean;
}

export function useDocumentHistory() {
  const [historyDocs, setHistoryDocs] = useState<HistoryDoc[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const {
    setDocId,
    setRawContent,
    setTranslatedContent,
    setChunks,
    setLayoutMode,
  } = useDocumentStore();

  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setHistoryDocs(data.documents || []);
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }, []);

  const loadDocument = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`);
      if (!res.ok) throw new Error('Load failed');
      const doc = await res.json();

      setDocId(doc.id);
      setRawContent(doc.original_content);
      setTranslatedContent(doc.translated_content || '');

      if (doc.chunks_data) {
        setChunks(doc.chunks_data.map((c: any) => ({
          id: c.chunk_index,
          chunkIndex: c.chunk_index,
          rawText: c.raw_text,
          translatedText: c.translated_text || '',
          status: c.status
        })));
      }

      // Set layout based on translation status
      if (doc.is_translated || doc.translated_content) {
        setLayoutMode('quad');
      } else {
        setLayoutMode('split');
      }

      setShowHistory(false);
    } catch (e) {
      console.error('Failed to load document:', e);
    }
  }, [setChunks, setDocId, setLayoutMode, setRawContent, setTranslatedContent]);

  const deleteDocument = useCallback(async (id: string) => {
    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      loadHistory();
    } catch (e) {
      console.error('Failed to delete document:', e);
    }
  }, [loadHistory]);

  const openHistory = useCallback(() => {
    loadHistory();
    setShowHistory(true);
  }, [loadHistory]);

  const closeHistory = useCallback(() => {
    setShowHistory(false);
  }, []);

  return {
    historyDocs,
    showHistory,
    loadHistory,
    loadDocument,
    deleteDocument,
    openHistory,
    closeHistory,
  };
}
