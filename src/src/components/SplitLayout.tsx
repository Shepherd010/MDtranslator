"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code, Languages, Eye } from 'lucide-react';
import { useDocumentStore, TranslationDirection } from '@/store/useDocumentStore';
import { useTranslation, useDocumentHistory, useSettings } from '@/hooks';
import { Header } from './layout';
import { ContentPanel, CollapsedPanel, type PanelId, type PanelSide } from './panels';
import { SettingsModal, HistoryModal } from './modals';
import Editor from './Editor';
import Preview from './Preview';
import UploadZone from './UploadZone';

// 优化后的动画配置 - 只在必要时使用
const quickTransition = {
  duration: 0.2,
  ease: [0.25, 0.1, 0.25, 1]
};

const mainVariants = {
  initial: { opacity: 0, y: 15 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: quickTransition
  },
  exit: { 
    opacity: 0, 
    y: -15,
    transition: { duration: 0.15 }
  }
};

export default function SplitLayout() {
  const {
    rawContent,
    translatedContent,
    layoutMode,
    translationDirection,
    setRawContent,
    setTranslatedContent,
    setChunks,
    setIsTranslating,
    setLayoutMode,
    setDocId,
    setTranslationDirection
  } = useDocumentStore();

  // Custom hooks
  const {
    isTranslating,
    translationProgress,
    startTranslation,
    closeWebSocket
  } = useTranslation();

  const {
    historyDocs,
    showHistory,
    loadDocument,
    deleteDocument,
    openHistory,
    closeHistory
  } = useDocumentHistory();

  const {
    settings,
    showSettings,
    updateSettings,
    saveSettings,
    openSettings,
    closeSettings
  } = useSettings();

  // Panel expansion state
  const [leftExpanded, setLeftExpanded] = useState<'source-editor' | 'source-preview' | null>(null);
  const [rightExpanded, setRightExpanded] = useState<'translated-editor' | 'translated-preview' | null>(null);
  const [downloadType, setDownloadType] = useState<'bilingual' | 'translated' | 'original'>('translated');

  const isQuad = layoutMode === 'quad';

  // 根据翻译方向获取标签
  const getLabels = useCallback(() => {
    if (translationDirection === 'zh2en') {
      return {
        sourceEditor: '中文 MD',
        sourcePreview: '中文渲染',
        translatedEditor: '英文 MD',
        translatedPreview: '英文渲染'
      };
    }
    return {
      sourceEditor: '英文 MD',
      sourcePreview: '英文渲染',
      translatedEditor: '中文 MD',
      translatedPreview: '中文渲染'
    };
  }, [translationDirection]);

  const labels = getLabels();

  // Panel toggle handler
  const handlePanelToggle = useCallback((panelId: PanelId, side: PanelSide) => {
    if (side === 'left') {
      setLeftExpanded(prev =>
        prev === panelId ? null : (panelId as 'source-editor' | 'source-preview')
      );
    } else {
      setRightExpanded(prev =>
        prev === panelId ? null : (panelId as 'translated-editor' | 'translated-preview')
      );
    }
  }, []);

  // Panel expand handler (for collapsed panels)
  const handlePanelExpand = useCallback((panelId: PanelId, side: PanelSide) => {
    if (side === 'left') {
      setLeftExpanded(panelId as 'source-editor' | 'source-preview');
    } else {
      setRightExpanded(panelId as 'translated-editor' | 'translated-preview');
    }
  }, []);

  // Start translation
  const handleTranslate = useCallback(() => {
    startTranslation(() => {
      setLeftExpanded(null);
      setRightExpanded(null);
    });
  }, [startTranslation]);

  // Download
  const handleDownload = useCallback(() => {
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
  }, [downloadType, rawContent, translatedContent]);

  // Reset
  const handleReset = useCallback(() => {
    setRawContent('');
    setTranslatedContent('');
    setChunks([]);
    setLayoutMode('split');
    setLeftExpanded(null);
    setRightExpanded(null);
    setIsTranslating(false);
    setDocId('');
    setTranslationDirection('en2zh');
    closeWebSocket();
  }, [setRawContent, setTranslatedContent, setChunks, setLayoutMode, setIsTranslating, setDocId, setTranslationDirection, closeWebSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => closeWebSocket();
  }, [closeWebSocket]);

  // Show upload zone if no content
  if (!rawContent) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="upload"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
        >
          <UploadZone onShowHistory={openHistory} />
          <HistoryModal
            isOpen={showHistory}
            documents={historyDocs}
            onClose={closeHistory}
            onLoad={loadDocument}
            onDelete={deleteDocument}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <>
      <motion.div 
        variants={mainVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          width: '100vw',
          background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%)',
          overflow: 'hidden',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}
      >
        {/* Header */}
        <Header
          isTranslating={isTranslating}
          isQuad={isQuad}
          translationProgress={translationProgress}
          translatedContent={translatedContent}
          downloadType={downloadType}
          translationDirection={translationDirection}
          onTranslate={handleTranslate}
          onDownload={handleDownload}
          onDownloadTypeChange={setDownloadType}
          onDirectionChange={setTranslationDirection}
          onOpenHistory={openHistory}
          onOpenSettings={openSettings}
          onReset={handleReset}
        />

        {/* Main Content - 使用普通 div 避免翻译时动画卡顿 */}
        <main 
          style={{ flex: 1, display: 'flex', gap: '8px', padding: '8px', overflow: 'hidden' }}
        >
          {/* Left Half */}
          <div 
            style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}
          >
            {!isQuad ? (
              <ContentPanel
                title={labels.sourceEditor}
                icon={<Code size={14} />}
                color="#3b82f6"
                panelId="source-editor"
                side="left"
                isQuad={isQuad}
                expanded={leftExpanded}
                onToggle={handlePanelToggle}
              >
                <Editor value={rawContent} onChange={setRawContent} />
              </ContentPanel>
            ) : (
              <LeftPanels
                rawContent={rawContent}
                translatedContent={translatedContent}
                leftExpanded={leftExpanded}
                labels={labels}
                onRawContentChange={setRawContent}
                onTranslatedContentChange={setTranslatedContent}
                onToggle={handlePanelToggle}
                onExpand={handlePanelExpand}
              />
            )}
          </div>

          {/* Right Half */}
          <div 
            style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}
          >
            {!isQuad ? (
              <ContentPanel
                title={labels.sourcePreview}
                icon={<Eye size={14} />}
                color="#8b5cf6"
                panelId="translated-editor"
                side="right"
                isQuad={isQuad}
                expanded={rightExpanded}
                onToggle={handlePanelToggle}
              >
                <Preview content={rawContent} />
              </ContentPanel>
            ) : (
              <RightPanels
                rawContent={rawContent}
                translatedContent={translatedContent}
                rightExpanded={rightExpanded}
                labels={labels}
                onToggle={handlePanelToggle}
                onExpand={handlePanelExpand}
              />
            )}
          </div>
        </main>

        {/* Modals */}
        <SettingsModal
          isOpen={showSettings}
          settings={settings}
          onClose={closeSettings}
          onSave={saveSettings}
          onUpdate={updateSettings}
        />

        <HistoryModal
          isOpen={showHistory}
          documents={historyDocs}
          onClose={closeHistory}
          onLoad={loadDocument}
          onDelete={deleteDocument}
        />
      </motion.div>
    </>
  );
}

// ==================== Sub-components for Quad Mode ====================

interface PanelLabels {
  sourceEditor: string;
  sourcePreview: string;
  translatedEditor: string;
  translatedPreview: string;
}

interface LeftPanelsProps {
  rawContent: string;
  translatedContent: string;
  leftExpanded: 'source-editor' | 'source-preview' | null;
  labels: PanelLabels;
  onRawContentChange: (value: string) => void;
  onTranslatedContentChange: (value: string) => void;
  onToggle: (panelId: PanelId, side: PanelSide) => void;
  onExpand: (panelId: PanelId, side: PanelSide) => void;
}

function LeftPanels({
  rawContent,
  translatedContent,
  leftExpanded,
  labels,
  onRawContentChange,
  onTranslatedContentChange,
  onToggle,
  onExpand,
}: LeftPanelsProps) {
  // Source Preview expanded: show collapsed source-editor + expanded source-preview
  if (leftExpanded === 'source-preview') {
    return (
      <>
        <CollapsedPanel
          title={labels.sourceEditor}
          icon={<Code size={14} />}
          color="#3b82f6"
          panelId="source-editor"
          side="left"
          onExpand={onExpand}
        />
        <ContentPanel
          title={labels.translatedEditor}
          icon={<Languages size={14} />}
          color="#10b981"
          panelId="source-preview"
          side="left"
          isQuad={true}
          expanded={leftExpanded}
          onToggle={onToggle}
        >
          <Editor value={translatedContent} onChange={onTranslatedContentChange} />
        </ContentPanel>
      </>
    );
  }

  // Source Editor expanded: show expanded source-editor + collapsed source-preview
  if (leftExpanded === 'source-editor') {
    return (
      <>
        <ContentPanel
          title={labels.sourceEditor}
          icon={<Code size={14} />}
          color="#3b82f6"
          panelId="source-editor"
          side="left"
          isQuad={true}
          expanded={leftExpanded}
          onToggle={onToggle}
        >
          <Editor value={rawContent} onChange={onRawContentChange} />
        </ContentPanel>
        <CollapsedPanel
          title={labels.translatedEditor}
          icon={<Languages size={14} />}
          color="#10b981"
          panelId="source-preview"
          side="left"
          onExpand={onExpand}
        />
      </>
    );
  }

  // Default: both panels shown equally
  return (
    <>
      <ContentPanel
        title={labels.sourceEditor}
        icon={<Code size={14} />}
        color="#3b82f6"
        panelId="source-editor"
        side="left"
        isQuad={true}
        expanded={leftExpanded}
        onToggle={onToggle}
      >
        <Editor value={rawContent} onChange={onRawContentChange} />
      </ContentPanel>
      <ContentPanel
        title={labels.translatedEditor}
        icon={<Languages size={14} />}
        color="#10b981"
        panelId="source-preview"
        side="left"
        isQuad={true}
        expanded={leftExpanded}
        onToggle={onToggle}
      >
        <Editor value={translatedContent} onChange={onTranslatedContentChange} />
      </ContentPanel>
    </>
  );
}

interface RightPanelsProps {
  rawContent: string;
  translatedContent: string;
  rightExpanded: 'translated-editor' | 'translated-preview' | null;
  labels: PanelLabels;
  onToggle: (panelId: PanelId, side: PanelSide) => void;
  onExpand: (panelId: PanelId, side: PanelSide) => void;
}

function RightPanels({
  rawContent,
  translatedContent,
  rightExpanded,
  labels,
  onToggle,
  onExpand,
}: RightPanelsProps) {
  // Translated Preview expanded
  if (rightExpanded === 'translated-preview') {
    return (
      <>
        <CollapsedPanel
          title={labels.sourcePreview}
          icon={<Eye size={14} />}
          color="#8b5cf6"
          panelId="translated-editor"
          side="right"
          onExpand={onExpand}
        />
        <ContentPanel
          title={labels.translatedPreview}
          icon={<Eye size={14} />}
          color="#f59e0b"
          panelId="translated-preview"
          side="right"
          isQuad={true}
          expanded={rightExpanded}
          onToggle={onToggle}
        >
          <Preview content={translatedContent} />
        </ContentPanel>
      </>
    );
  }

  // Translated Editor expanded
  if (rightExpanded === 'translated-editor') {
    return (
      <>
        <ContentPanel
          title={labels.sourcePreview}
          icon={<Eye size={14} />}
          color="#8b5cf6"
          panelId="translated-editor"
          side="right"
          isQuad={true}
          expanded={rightExpanded}
          onToggle={onToggle}
        >
          <Preview content={rawContent} />
        </ContentPanel>
        <CollapsedPanel
          title={labels.translatedPreview}
          icon={<Eye size={14} />}
          color="#f59e0b"
          panelId="translated-preview"
          side="right"
          onExpand={onExpand}
        />
      </>
    );
  }

  // Default: both panels shown equally
  return (
    <>
      <ContentPanel
        title={labels.sourcePreview}
        icon={<Eye size={14} />}
        color="#8b5cf6"
        panelId="translated-editor"
        side="right"
        isQuad={true}
        expanded={rightExpanded}
        onToggle={onToggle}
      >
        <Preview content={rawContent} />
      </ContentPanel>
      <ContentPanel
        title={labels.translatedPreview}
        icon={<Eye size={14} />}
        color="#f59e0b"
        panelId="translated-preview"
        side="right"
        isQuad={true}
        expanded={rightExpanded}
        onToggle={onToggle}
      >
        <Preview content={translatedContent} />
      </ContentPanel>
    </>
  );
}
