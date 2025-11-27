"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDocumentStore } from '@/store/useDocumentStore';
import Editor from './Editor';
import Preview from './Preview';
import UploadZone from './UploadZone';
import { 
  Play, Maximize2, Minimize2, RotateCcw, Download, Loader2, 
  Code, Languages, Eye, Settings, FolderOpen, Trash2, X, Save
} from 'lucide-react';

interface HistoryDoc {
  id: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  is_translated: boolean;
}

// Panel expand state: which panel (if any) is expanded to half-screen
type ExpandedPanel = null | 'source-editor' | 'source-preview' | 'translated-editor' | 'translated-preview';

export default function SplitLayout() {
  const { 
    rawContent, translatedContent, layoutMode, isTranslating, chunks, docId,
    setRawContent, setTranslatedContent, setChunks, updateChunk,
    setIsTranslating, setLayoutMode, setDocId
  } = useDocumentStore();

  const wsRef = useRef<WebSocket | null>(null);
  // Which panel is expanded to fill its half of the screen
  const [leftExpanded, setLeftExpanded] = useState<'source-editor' | 'source-preview' | null>(null);
  const [rightExpanded, setRightExpanded] = useState<'translated-editor' | 'translated-preview' | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyDocs, setHistoryDocs] = useState<HistoryDoc[]>([]);
  const [settings, setSettings] = useState({
    llm_provider: 'qwen',
    llm_model: 'qwen-flash',
    temperature: 0.1,
    num_chunks: 3,
    auto_save: true
  });
  const [downloadType, setDownloadType] = useState<'bilingual' | 'translated' | 'original'>('translated');

  // Load history documents
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

  // Load settings
  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }, []);

  // Save settings
  const saveSettings = async () => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings })
      });
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  };

  // Load a document from history
  const loadDocument = async (id: string) => {
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
  };

  // Delete a document
  const deleteDocument = async (id: string) => {
    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      loadHistory();
    } catch (e) {
      console.error('Failed to delete document:', e);
    }
  };

  // Start translation
  const handleTranslate = async () => {
    setIsTranslating(true);
    setLayoutMode('quad');
    setLeftExpanded(null);
    setRightExpanded(null);
    
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: rawContent, title: `文档 ${new Date().toLocaleString()}` })
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

      const ws = new WebSocket(`ws://localhost:8000/ws/translate/${data.docId}`);
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
  };

  // Download
  const handleDownload = () => {
    let content = '';
    let filename = 'document';
    
    switch (downloadType) {
      case 'translated':
        content = translatedContent;
        filename = 'translated.md';
        break;
      case 'original':
        content = rawContent;
        filename = 'original.md';
        break;
      case 'bilingual':
        content = `# 原文 (Original)\n\n${rawContent}\n\n---\n\n# 译文 (Translated)\n\n${translatedContent}`;
        filename = 'bilingual.md';
        break;
    }
    
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Reset
  const handleReset = () => {
    setRawContent('');
    setTranslatedContent('');
    setChunks([]);
    setLayoutMode('split');
    setLeftExpanded(null);
    setRightExpanded(null);
    setIsTranslating(false);
    setDocId('');
    wsRef.current?.close();
  };

  useEffect(() => {
    loadSettings();
    return () => { wsRef.current?.close(); };
  }, [loadSettings]);

  // If no content, show upload zone with option to show history
  if (!rawContent) {
    return (
      <>
        <UploadZone onShowHistory={() => { loadHistory(); setShowHistory(true); }} />
        {/* History Modal on Upload page */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
              }}
              onClick={() => setShowHistory(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: 'white', borderRadius: '12px', padding: '24px', width: '500px',
                  maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>历史记录</h2>
                  <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    <X size={20} color="#64748b" />
                  </button>
                </div>

                {historyDocs.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                    暂无历史记录
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {historyDocs.map((doc) => (
                      <div key={doc.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px', background: '#f8fafc', borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 500, fontSize: '14px', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {doc.title}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                            {new Date(doc.updated_at).toLocaleString()}
                            <span style={{
                              marginLeft: '8px', padding: '2px 6px', borderRadius: '4px',
                              background: doc.is_translated ? '#dcfce7' : '#fef3c7',
                              color: doc.is_translated ? '#166534' : '#92400e',
                              fontSize: '11px'
                            }}>
                              {doc.is_translated ? '已翻译' : '未翻译'}
                            </span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => loadDocument(doc.id)} style={{
                            padding: '6px 12px', background: '#3b82f6', color: 'white',
                            border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
                          }}>载入</button>
                          <button onClick={() => deleteDocument(doc.id)} style={{
                            padding: '6px', background: '#fee2e2', color: '#dc2626',
                            border: 'none', borderRadius: '6px', cursor: 'pointer'
                          }}><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  const isQuad = layoutMode === 'quad';

  // Panel header with expand/collapse button
  const PanelHeader = ({ 
    title, 
    icon, 
    color, 
    panelId, 
    side 
  }: { 
    title: string; 
    icon: React.ReactNode; 
    color: string; 
    panelId: 'source-editor' | 'source-preview' | 'translated-editor' | 'translated-preview';
    side: 'left' | 'right';
  }) => {
    const isLeft = side === 'left';
    const expanded = isLeft ? leftExpanded : rightExpanded;
    const isExpanded = expanded === panelId;
    
    const handleToggle = () => {
      if (isLeft) {
        setLeftExpanded(isExpanded ? null : (panelId as 'source-editor' | 'source-preview'));
      } else {
        setRightExpanded(isExpanded ? null : (panelId as 'translated-editor' | 'translated-preview'));
      }
    };

    // Only show expand button in quad mode
    if (!isQuad) {
      return (
        <div style={{
          height: '36px', background: `${color}08`, borderBottom: `1px solid ${color}15`,
          display: 'flex', alignItems: 'center', padding: '0 12px', gap: '8px'
        }}>
          <div style={{ width: '6px', height: '6px', background: color, borderRadius: '50%' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {icon} {title}
          </span>
        </div>
      );
    }

    return (
      <div style={{
        height: '36px', background: `${color}08`, borderBottom: `1px solid ${color}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '6px', height: '6px', background: color, borderRadius: '50%' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {icon} {title}
          </span>
        </div>
        <button 
          onClick={handleToggle}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer', 
            padding: '4px', borderRadius: '4px', color: '#64748b',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          title={isExpanded ? '缩小' : '放大到半屏'}
        >
          {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>
    );
  };

  // Collapsed panel (shown when other panel on same side is expanded)
  const CollapsedPanel = ({ 
    title, 
    icon, 
    color, 
    panelId,
    side
  }: { 
    title: string; 
    icon: React.ReactNode; 
    color: string;
    panelId: 'source-editor' | 'source-preview' | 'translated-editor' | 'translated-preview';
    side: 'left' | 'right';
  }) => {
    const handleExpand = () => {
      if (side === 'left') {
        setLeftExpanded(panelId as 'source-editor' | 'source-preview');
      } else {
        setRightExpanded(panelId as 'translated-editor' | 'translated-preview');
      }
    };
    
    return (
      <div style={{
        background: `${color}08`, borderRadius: '8px', border: `1px solid ${color}20`,
        padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', flexShrink: 0
      }} onClick={handleExpand}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '6px', height: '6px', background: color, borderRadius: '50%' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {icon} {title}
          </span>
        </div>
        <Maximize2 size={14} color="#64748b" />
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)',
      overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        height: '52px', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 16px', flexShrink: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '30px', height: '30px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: '11px'
          }}>MD</div>
          <span style={{ fontWeight: 600, fontSize: '15px', color: '#1a1a2e' }}>Translator</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {isTranslating && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px',
              background: '#eef2ff', borderRadius: '16px', fontSize: '12px', color: '#4f46e5'
            }}>
              <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
              翻译中 {chunks.filter(c => c.status === 'completed').length}/{chunks.length}
            </div>
          )}

          {!isQuad && (
            <button onClick={handleTranslate} disabled={isTranslating} style={{
              display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 14px',
              background: isTranslating ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white', border: 'none', borderRadius: '6px',
              cursor: isTranslating ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 500
            }}>
              <Play size={12} /> 开始翻译
            </button>
          )}

          {translatedContent && (
            <div style={{ display: 'flex' }}>
              <select value={downloadType} onChange={(e) => setDownloadType(e.target.value as any)}
                style={{
                  padding: '6px 8px', fontSize: '12px', border: '1px solid #e2e8f0',
                  borderRadius: '6px 0 0 6px', background: 'white', cursor: 'pointer'
                }}>
                <option value="translated">译文</option>
                <option value="original">原文</option>
                <option value="bilingual">双语对照</option>
              </select>
              <button onClick={handleDownload} style={{
                padding: '6px 12px', background: '#10b981', color: 'white', border: 'none',
                borderRadius: '0 6px 6px 0', cursor: 'pointer', fontSize: '12px', fontWeight: 500,
                display: 'flex', alignItems: 'center', gap: '4px'
              }}>
                <Download size={12} /> 下载
              </button>
            </div>
          )}

          <button onClick={() => { loadHistory(); setShowHistory(true); }} style={{
            padding: '6px 10px', background: 'white', border: '1px solid #e2e8f0',
            borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
          }} title="历史记录">
            <FolderOpen size={14} color="#64748b" />
          </button>

          <button onClick={() => setShowSettings(true)} style={{
            padding: '6px 10px', background: 'white', border: '1px solid #e2e8f0',
            borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
          }} title="设置">
            <Settings size={14} color="#64748b" />
          </button>

          <button onClick={handleReset} style={{
            padding: '6px 10px', background: 'white', border: '1px solid #e2e8f0',
            borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
          }} title="重置">
            <RotateCcw size={14} color="#64748b" />
          </button>
        </div>
      </header>

      {/* Main Content - 左右分屏 */}
      <main style={{ flex: 1, display: 'flex', gap: '8px', padding: '8px', overflow: 'hidden' }}>
        
        {/* ====== 左半屏 ====== */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
          {/* 二分屏模式: 左边只有英文 MD 编辑 */}
          {!isQuad ? (
            <motion.div layout style={{
              flex: 1, background: 'white', borderRadius: '10px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex',
              flexDirection: 'column', overflow: 'hidden', border: '1.5px solid #3b82f615'
            }}>
              <PanelHeader title="英文 MD" icon={<Code size={14} />} color="#3b82f6" panelId="source-editor" side="left" />
              <div style={{ flex: 1, overflow: 'auto' }}>
                <Editor value={rawContent} onChange={setRawContent} />
              </div>
            </motion.div>
          ) : (
            // 四分屏模式: 左上英文MD，左下中文MD
            <>
              {/* 左上: 英文 MD */}
              {leftExpanded !== 'source-preview' && (
                <motion.div layout style={{
                  flex: leftExpanded === 'source-editor' ? 1 : 1,
                  background: 'white', borderRadius: '10px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex',
                  flexDirection: 'column', overflow: 'hidden', border: '1.5px solid #3b82f615'
                }}>
                  <PanelHeader title="英文 MD" icon={<Code size={14} />} color="#3b82f6" panelId="source-editor" side="left" />
                  <div style={{ flex: 1, overflow: 'auto' }}>
                    <Editor value={rawContent} onChange={setRawContent} />
                  </div>
                </motion.div>
              )}

              {/* 折叠条或左下: 中文 MD */}
              {leftExpanded === 'source-editor' ? (
                <CollapsedPanel title="中文 MD" icon={<Languages size={14} />} color="#10b981" panelId="source-preview" side="left" />
              ) : leftExpanded === 'source-preview' ? (
                <>
                  <CollapsedPanel title="英文 MD" icon={<Code size={14} />} color="#3b82f6" panelId="source-editor" side="left" />
                  <motion.div layout style={{
                    flex: 1, background: 'white', borderRadius: '10px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex',
                    flexDirection: 'column', overflow: 'hidden', border: '1.5px solid #10b98115'
                  }}>
                    <PanelHeader title="中文 MD" icon={<Languages size={14} />} color="#10b981" panelId="source-preview" side="left" />
                    <div style={{ flex: 1, overflow: 'auto' }}>
                      <Editor value={translatedContent} onChange={setTranslatedContent} />
                    </div>
                  </motion.div>
                </>
              ) : (
                <motion.div layout style={{
                  flex: 1, background: 'white', borderRadius: '10px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex',
                  flexDirection: 'column', overflow: 'hidden', border: '1.5px solid #10b98115'
                }}>
                  <PanelHeader title="中文 MD" icon={<Languages size={14} />} color="#10b981" panelId="source-preview" side="left" />
                  <div style={{ flex: 1, overflow: 'auto' }}>
                    <Editor value={translatedContent} onChange={setTranslatedContent} />
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>

        {/* ====== 右半屏 ====== */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
          {/* 二分屏模式: 右边只有英文预览 */}
          {!isQuad ? (
            <motion.div layout style={{
              flex: 1, background: 'white', borderRadius: '10px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex',
              flexDirection: 'column', overflow: 'hidden', border: '1.5px solid #8b5cf615'
            }}>
              <PanelHeader title="英文预览" icon={<Eye size={14} />} color="#8b5cf6" panelId="translated-editor" side="right" />
              <div style={{ flex: 1, overflow: 'auto' }}>
                <Preview content={rawContent} />
              </div>
            </motion.div>
          ) : (
            // 四分屏模式: 右上英文渲染，右下中文渲染
            <>
              {/* 右上: 英文渲染 */}
              {rightExpanded !== 'translated-preview' && (
                <motion.div layout style={{
                  flex: rightExpanded === 'translated-editor' ? 1 : 1,
                  background: 'white', borderRadius: '10px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex',
                  flexDirection: 'column', overflow: 'hidden', border: '1.5px solid #8b5cf615'
                }}>
                  <PanelHeader title="英文渲染" icon={<Eye size={14} />} color="#8b5cf6" panelId="translated-editor" side="right" />
                  <div style={{ flex: 1, overflow: 'auto' }}>
                    <Preview content={rawContent} />
                  </div>
                </motion.div>
              )}

              {/* 折叠条或右下: 中文渲染 */}
              {rightExpanded === 'translated-editor' ? (
                <CollapsedPanel title="中文渲染" icon={<Eye size={14} />} color="#f59e0b" panelId="translated-preview" side="right" />
              ) : rightExpanded === 'translated-preview' ? (
                <>
                  <CollapsedPanel title="英文渲染" icon={<Eye size={14} />} color="#8b5cf6" panelId="translated-editor" side="right" />
                  <motion.div layout style={{
                    flex: 1, background: 'white', borderRadius: '10px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex',
                    flexDirection: 'column', overflow: 'hidden', border: '1.5px solid #f59e0b15'
                  }}>
                    <PanelHeader title="中文渲染" icon={<Eye size={14} />} color="#f59e0b" panelId="translated-preview" side="right" />
                    <div style={{ flex: 1, overflow: 'auto' }}>
                      <Preview content={translatedContent} />
                    </div>
                  </motion.div>
                </>
              ) : (
                <motion.div layout style={{
                  flex: 1, background: 'white', borderRadius: '10px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex',
                  flexDirection: 'column', overflow: 'hidden', border: '1.5px solid #f59e0b15'
                }}>
                  <PanelHeader title="中文渲染" icon={<Eye size={14} />} color="#f59e0b" panelId="translated-preview" side="right" />
                  <div style={{ flex: 1, overflow: 'auto' }}>
                    <Preview content={translatedContent} />
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
            }}
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'white', borderRadius: '12px', padding: '24px', width: '400px',
                maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>设置</h2>
                <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} color="#64748b" />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>
                    LLM 模型
                  </label>
                  <select
                    value={settings.llm_model}
                    onChange={(e) => setSettings({ ...settings, llm_model: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
                  >
                    <option value="qwen-flash">Qwen Flash (快速)</option>
                    <option value="qwen-turbo">Qwen Turbo (标准)</option>
                    <option value="qwen-plus">Qwen Plus (高级)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>
                    温度 (Temperature): {settings.temperature}
                  </label>
                  <input
                    type="range" min="0" max="1" step="0.1"
                    value={settings.temperature}
                    onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>
                    翻译分块数量 (文档将被分成 N 块并行翻译)
                  </label>
                  <input
                    type="number" min="1" max="10"
                    value={settings.num_chunks}
                    onChange={(e) => setSettings({ ...settings, num_chunks: parseInt(e.target.value) || 3 })}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '14px' }}
                  />
                  <p style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                    数值越小，翻译结果越连贯；数值越大，翻译速度越快
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={settings.auto_save}
                    onChange={(e) => setSettings({ ...settings, auto_save: e.target.checked })}
                    id="auto-save"
                  />
                  <label htmlFor="auto-save" style={{ fontSize: '13px', color: '#374151' }}>自动保存翻译历史</label>
                </div>

                <button
                  onClick={() => { saveSettings(); setShowSettings(false); }}
                  style={{
                    padding: '10px 16px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer',
                    fontSize: '14px', fontWeight: 500, marginTop: '8px'
                  }}
                >
                  保存设置
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
            }}
            onClick={() => setShowHistory(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'white', borderRadius: '12px', padding: '24px', width: '500px',
                maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>历史记录</h2>
                <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} color="#64748b" />
                </button>
              </div>

              {historyDocs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  暂无历史记录
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {historyDocs.map((doc) => (
                    <div key={doc.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px', background: '#f8fafc', borderRadius: '8px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: '14px', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {doc.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                          {new Date(doc.updated_at).toLocaleString()}
                          <span style={{
                            marginLeft: '8px', padding: '2px 6px', borderRadius: '4px',
                            background: doc.is_translated ? '#dcfce7' : '#fef3c7',
                            color: doc.is_translated ? '#166534' : '#92400e',
                            fontSize: '11px'
                          }}>
                            {doc.is_translated ? '已翻译' : '未翻译'}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => loadDocument(doc.id)} style={{
                          padding: '6px 12px', background: '#3b82f6', color: 'white',
                          border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px'
                        }}>载入</button>
                        <button onClick={() => deleteDocument(doc.id)} style={{
                          padding: '6px', background: '#fee2e2', color: '#dc2626',
                          border: 'none', borderRadius: '6px', cursor: 'pointer'
                        }}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
