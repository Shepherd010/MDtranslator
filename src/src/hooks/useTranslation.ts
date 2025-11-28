"use client";

import { useRef, useCallback } from 'react';
import { useDocumentStore } from '@/store/useDocumentStore';

export function useTranslation() {
  const wsRef = useRef<WebSocket | null>(null);
  
  const {
    rawContent,
    docId,
    chunks,
    isTranslating,
    translationDirection,
    setChunks,
    updateChunk,
    setIsTranslating,
    setLayoutMode,
    setDocId,
  } = useDocumentStore();

  const startTranslation = useCallback(async (
    onStart?: () => void
  ) => {
    setIsTranslating(true);
    setLayoutMode('quad');
    onStart?.();

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: rawContent,
          title: `文档 ${new Date().toLocaleString()}`,
          direction: translationDirection
        })
      });

      if (!response.ok) throw new Error('Translation failed');

      const data = await response.json();
      setDocId(data.docId);
      setChunks(data.chunks.map((c: any) => ({
        id: c.chunk_index,
        chunkIndex: c.chunk_index,
        rawText: c.raw_text,
        translatedText: c.translated_text || '',
        status: c.status
      })));

      const wsHost = process.env.NEXT_PUBLIC_WS_HOST || `${window.location.hostname}:8000`;
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${wsProtocol}//${wsHost}/ws/translate/${data.docId}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === 'chunk_update') {
          updateChunk(msg.chunkIndex, {
            translatedText: msg.data.translatedText,
            status: msg.data.status || 'processing'
          });
        } else if (msg.type === 'complete') {
          setIsTranslating(false);
        }
      };

      ws.onerror = () => setIsTranslating(false);
      ws.onclose = () => setIsTranslating(false);

    } catch (e) {
      console.error(e);
      setIsTranslating(false);
    }
  }, [rawContent, translationDirection, setChunks, setDocId, setIsTranslating, setLayoutMode, updateChunk]);

  const closeWebSocket = useCallback(() => {
    wsRef.current?.close();
  }, []);

  const translationProgress = {
    completed: chunks.filter(c => c.status === 'completed').length,
    total: chunks.length
  };

  return {
    isTranslating,
    translationProgress,
    startTranslation,
    closeWebSocket,
  };
}
