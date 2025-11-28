"use client";

import React, { memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, RotateCcw, Download, Loader2,
  Settings, FolderOpen, ArrowRightLeft
} from 'lucide-react';

type TranslationDirection = 'en2zh' | 'zh2en';

interface HeaderProps {
  isTranslating: boolean;
  isQuad: boolean;
  translationProgress: { completed: number; total: number };
  translatedContent: string;
  downloadType: 'bilingual' | 'translated' | 'original';
  translationDirection: TranslationDirection;
  onTranslate: () => void;
  onDownload: () => void;
  onDownloadTypeChange: (type: 'bilingual' | 'translated' | 'original') => void;
  onDirectionChange: (direction: TranslationDirection) => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onReset: () => void;
}

// 优化后的动画配置 - 更流畅，减少果冻效果
const smoothTransition = { 
  type: "spring" as const, 
  stiffness: 400, 
  damping: 35, 
  mass: 0.8 
};

const quickTransition = { 
  duration: 0.15, 
  ease: [0.25, 0.1, 0.25, 1] 
};

// 按钮动画变体 - 更细微的缩放
const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.02, transition: quickTransition },
  tap: { scale: 0.98, transition: quickTransition }
};

// 进度条动画变体 - 更快的过渡
const progressVariants = {
  initial: { opacity: 0, x: 10 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: quickTransition
  },
  exit: { 
    opacity: 0, 
    x: -10,
    transition: { duration: 0.1 }
  }
};

export const Header = memo(function Header({
  isTranslating,
  isQuad,
  translationProgress,
  translatedContent,
  downloadType,
  translationDirection,
  onTranslate,
  onDownload,
  onDownloadTypeChange,
  onDirectionChange,
  onOpenHistory,
  onOpenSettings,
  onReset,
}: HeaderProps) {
  return (
    <motion.header 
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={smoothTransition}
      style={{
        height: '52px',
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0,
        zIndex: 100
      }}
    >
      {/* Logo - 简化动画 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div 
          style={{
            width: '30px',
            height: '30px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 700,
            fontSize: '11px',
            boxShadow: isTranslating ? '0 0 12px rgba(102, 126, 234, 0.4)' : 'none',
            transition: 'box-shadow 0.3s ease'
          }}
        >
          MD
        </div>
        <span style={{ fontWeight: 600, fontSize: '15px', color: '#1a1a2e' }}>
          Translator
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {/* Translation Progress - 简化动画 */}
        <AnimatePresence mode="wait">
          {isTranslating && (
            <motion.div
              variants={progressVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                background: '#eef2ff',
                borderRadius: '16px',
                fontSize: '12px',
                color: '#4f46e5'
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 size={12} />
              </motion.div>
              <span>翻译中</span>
              <span style={{ fontWeight: 500 }}>
                {translationProgress.completed}/{translationProgress.total}
              </span>
              {/* Progress bar - 使用 CSS transition */}
              <div style={{ 
                width: '60px', 
                height: '4px', 
                background: '#c7d2fe',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div
                  style={{
                    height: '100%',
                    width: `${(translationProgress.completed / translationProgress.total) * 100}%`,
                    background: 'linear-gradient(90deg, #667eea, #764ba2)',
                    borderRadius: '2px',
                    transition: 'width 0.2s ease-out'
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Translation Direction Selector - 翻译方向选择 */}
        {!isQuad && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <ArrowRightLeft size={14} color="#64748b" />
            <select
              value={translationDirection}
              onChange={(e) => onDirectionChange(e.target.value as TranslationDirection)}
              disabled={isTranslating}
              style={{
                padding: '6px 8px',
                fontSize: '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                background: 'white',
                cursor: isTranslating ? 'not-allowed' : 'pointer',
                opacity: isTranslating ? 0.6 : 1
              }}
            >
              <option value="en2zh">英文 → 中文</option>
              <option value="zh2en">中文 → 英文</option>
            </select>
          </div>
        )}

        {/* Translate Button - 简化 */}
        {!isQuad && (
          <motion.button
            variants={buttonVariants}
            initial="initial"
            whileHover={isTranslating ? undefined : "hover"}
            whileTap={isTranslating ? undefined : "tap"}
            onClick={onTranslate}
            disabled={isTranslating}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '6px 14px',
              background: isTranslating
                ? '#9ca3af'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isTranslating ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: 500
            }}
          >
            <Play size={12} />
            开始翻译
          </motion.button>
        )}

        {/* Download - 使用更快的过渡 */}
        <AnimatePresence>
          {translatedContent && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={quickTransition}
              style={{ display: 'flex' }}
            >
              <select
                value={downloadType}
                onChange={(e) => onDownloadTypeChange(e.target.value as any)}
                style={{
                  padding: '6px 8px',
                  fontSize: '12px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px 0 0 6px',
                  background: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="translated">译文</option>
                <option value="original">原文</option>
                <option value="bilingual">双语对照</option>
              </select>
              <motion.button
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                onClick={onDownload}
                style={{
                  padding: '6px 12px',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0 6px 6px 0',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Download size={12} /> 下载
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Icon Buttons - 简化，使用 CSS hover */}
        <IconButton onClick={onOpenHistory} title="历史记录">
          <FolderOpen size={14} color="#64748b" />
        </IconButton>

        <IconButton onClick={onOpenSettings} title="设置">
          <Settings size={14} color="#64748b" />
        </IconButton>

        <IconButton onClick={onReset} title="重置">
          <RotateCcw size={14} color="#64748b" />
        </IconButton>
      </div>
    </motion.header>
  );
});

interface IconButtonProps {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

// 简化 IconButton，移除复杂的 hover 动画，使用 CSS
const IconButton = memo(function IconButton({ onClick, title, children }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: '6px 10px',
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        transition: 'background 0.15s ease, border-color 0.15s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = '#f8fafc';
        e.currentTarget.style.borderColor = '#cbd5e1';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'white';
        e.currentTarget.style.borderColor = '#e2e8f0';
      }}
    >
      {children}
    </button>
  );
});
