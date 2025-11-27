"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Code, Languages, Eye } from 'lucide-react';
import { useDocumentStore } from '@/store/useDocumentStore';
import { useTranslation, useDocumentHistory, useSettings } from '@/hooks';
import { Header } from './layout';
import { ContentPanel, CollapsedPanel, type PanelId, type PanelSide } from './panels';
import { SettingsModal, HistoryModal } from './modals';
import Editor from './Editor';
import Preview from './Preview';
import UploadZone from './UploadZone';

// 动画配置
const pageTransition = {
  type: "spring",
  stiffness: 300,
  damping: 30
};

const mainVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.4,
      staggerChildren: 0.1
    }
  },
  exit: { 
    opacity: 0, 
    y: -20,
    transition: { duration: 0.3 }
  }
};

const panelContainerVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: pageTransition
  }
};

export default function SplitLayout() {
  const {
    rawContent,
    translatedContent,
    layoutMode,
    setRawContent,
    setTranslatedContent,
    setChunks,
    setIsTranslating,
    setLayoutMode,
    setDocId
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
    closeWebSocket();
  }, [setRawContent, setTranslatedContent, setChunks, setLayoutMode, setIsTranslating, setDocId, closeWebSocket]);

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
    <LayoutGroup>
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
          onTranslate={handleTranslate}
          onDownload={handleDownload}
          onDownloadTypeChange={setDownloadType}
          onOpenHistory={openHistory}
          onOpenSettings={openSettings}
          onReset={handleReset}
        />

        {/* Main Content */}
        <motion.main 
          layout
          transition={pageTransition}
          style={{ flex: 1, display: 'flex', gap: '8px', padding: '8px', overflow: 'hidden' }}
        >
          {/* Left Half */}
          <motion.div 
            layout
            variants={panelContainerVariants}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}
          >
            <AnimatePresence mode="wait">
              {!isQuad ? (
                <motion.div
                  key="split-left"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={pageTransition}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                >
                  <ContentPanel
                    title="英文 MD"
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
                </motion.div>
              ) : (
                <motion.div
                  key="quad-left"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={pageTransition}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}
                >
                  <LeftPanels
                    rawContent={rawContent}
                    translatedContent={translatedContent}
                    leftExpanded={leftExpanded}
                    onRawContentChange={setRawContent}
                    onTranslatedContentChange={setTranslatedContent}
                    onToggle={handlePanelToggle}
                    onExpand={handlePanelExpand}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Right Half */}
          <motion.div 
            layout
            variants={panelContainerVariants}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}
          >
            <AnimatePresence mode="wait">
              {!isQuad ? (
                <motion.div
                  key="split-right"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={pageTransition}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                >
                  <ContentPanel
                    title="英文预览"
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
                </motion.div>
              ) : (
                <motion.div
                  key="quad-right"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={pageTransition}
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}
                >
                  <RightPanels
                    rawContent={rawContent}
                    translatedContent={translatedContent}
                    rightExpanded={rightExpanded}
                    onToggle={handlePanelToggle}
                    onExpand={handlePanelExpand}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.main>

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
    </LayoutGroup>
  );
}

// ==================== Sub-components for Quad Mode ====================

interface LeftPanelsProps {
  rawContent: string;
  translatedContent: string;
  leftExpanded: 'source-editor' | 'source-preview' | null;
  onRawContentChange: (value: string) => void;
  onTranslatedContentChange: (value: string) => void;
  onToggle: (panelId: PanelId, side: PanelSide) => void;
  onExpand: (panelId: PanelId, side: PanelSide) => void;
}

function LeftPanels({
  rawContent,
  translatedContent,
  leftExpanded,
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
          title="英文 MD"
          icon={<Code size={14} />}
          color="#3b82f6"
          panelId="source-editor"
          side="left"
          onExpand={onExpand}
        />
        <ContentPanel
          title="中文 MD"
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
          title="英文 MD"
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
          title="中文 MD"
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
        title="英文 MD"
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
        title="中文 MD"
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
  onToggle: (panelId: PanelId, side: PanelSide) => void;
  onExpand: (panelId: PanelId, side: PanelSide) => void;
}

function RightPanels({
  rawContent,
  translatedContent,
  rightExpanded,
  onToggle,
  onExpand,
}: RightPanelsProps) {
  // Translated Preview expanded
  if (rightExpanded === 'translated-preview') {
    return (
      <>
        <CollapsedPanel
          title="英文渲染"
          icon={<Eye size={14} />}
          color="#8b5cf6"
          panelId="translated-editor"
          side="right"
          onExpand={onExpand}
        />
        <ContentPanel
          title="中文渲染"
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
          title="英文渲染"
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
          title="中文渲染"
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
        title="英文渲染"
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
        title="中文渲染"
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
