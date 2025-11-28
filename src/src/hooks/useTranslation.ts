"use client";

import { useRef, useCallback, useMemo } from 'react';
import { useDocumentStore } from '@/store/useDocumentStore';

// 生成唯一的连接 ID（每个浏览器标签页一个）
function generateConnectionId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export function useTranslation() {
  const wsRef = useRef<WebSocket | null>(null);
  // 每个 hook 实例保持一个唯一的连接 ID
  const connectionId = useMemo(() => generateConnectionId(), []);
  
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

      // 构建 WebSocket URL，包含 connection_id 以支持多用户并发
      const wsHost = process.env.NEXT_PUBLIC_WS_HOST || `${window.location.hostname}:8000`;
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${wsProtocol}//${wsHost}/ws/translate/${data.docId}?conn_id=${connectionId}`);
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
  }, [rawContent, translationDirection, connectionId, setChunks, setDocId, setIsTranslating, setLayoutMode, updateChunk]);

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
