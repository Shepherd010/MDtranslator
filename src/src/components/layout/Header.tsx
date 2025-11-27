"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, RotateCcw, Download, Loader2,
  Settings, FolderOpen
} from 'lucide-react';

interface HeaderProps {
  isTranslating: boolean;
  isQuad: boolean;
  translationProgress: { completed: number; total: number };
  translatedContent: string;
  downloadType: 'bilingual' | 'translated' | 'original';
  onTranslate: () => void;
  onDownload: () => void;
  onDownloadTypeChange: (type: 'bilingual' | 'translated' | 'original') => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onReset: () => void;
}

// 按钮动画变体
const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 }
};

// 进度条动画变体
const progressVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 }
  },
  exit: { 
    opacity: 0, 
    x: -20,
    transition: { duration: 0.2 }
  }
};

export function Header({
  isTranslating,
  isQuad,
  translationProgress,
  translatedContent,
  downloadType,
  onTranslate,
  onDownload,
  onDownloadTypeChange,
  onOpenHistory,
  onOpenSettings,
  onReset,
}: HeaderProps) {
  return (
    <motion.header 
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
      {/* Logo */}
      <motion.div 
        style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div 
          animate={{ 
            boxShadow: isTranslating 
              ? ['0 0 0px rgba(102, 126, 234, 0)', '0 0 20px rgba(102, 126, 234, 0.5)', '0 0 0px rgba(102, 126, 234, 0)']
              : 'none'
          }}
          transition={{ duration: 1.5, repeat: isTranslating ? Infinity : 0 }}
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
            fontSize: '11px'
          }}
        >
          MD
        </motion.div>
        <span style={{ fontWeight: 600, fontSize: '15px', color: '#1a1a2e' }}>
          Translator
        </span>
      </motion.div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {/* Translation Progress */}
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
              <motion.span
                key={translationProgress.completed}
                initial={{ scale: 1.3, color: '#818cf8' }}
                animate={{ scale: 1, color: '#4f46e5' }}
                transition={{ duration: 0.3 }}
              >
                {translationProgress.completed}/{translationProgress.total}
              </motion.span>
              {/* Progress bar */}
              <div style={{ 
                width: '60px', 
                height: '4px', 
                background: '#c7d2fe',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ 
                    width: `${(translationProgress.completed / translationProgress.total) * 100}%` 
                  }}
                  transition={{ duration: 0.3 }}
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #667eea, #764ba2)',
                    borderRadius: '2px'
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Translate Button */}
        <AnimatePresence mode="wait">
          {!isQuad && (
            <motion.button
              variants={buttonVariants}
              initial="initial"
              whileHover={isTranslating ? undefined : "hover"}
              whileTap={isTranslating ? undefined : "tap"}
              animate={{ 
                opacity: 1,
                background: isTranslating
                  ? '#9ca3af'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              }}
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
              <motion.div
                animate={isTranslating ? {} : { x: [0, 2, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
              >
                <Play size={12} />
              </motion.div>
              开始翻译
            </motion.button>
          )}
        </AnimatePresence>

        {/* Download */}
        <AnimatePresence>
          {translatedContent && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
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

        {/* History Button */}
        <IconButton onClick={onOpenHistory} title="历史记录">
          <FolderOpen size={14} color="#64748b" />
        </IconButton>

        {/* Settings Button */}
        <IconButton onClick={onOpenSettings} title="设置">
          <Settings size={14} color="#64748b" />
        </IconButton>

        {/* Reset Button */}
        <IconButton onClick={onReset} title="重置">
          <RotateCcw size={14} color="#64748b" />
        </IconButton>
      </div>
    </motion.header>
  );
}

interface IconButtonProps {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}

function IconButton({ onClick, title, children }: IconButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.button
      variants={buttonVariants}
      whileHover="hover"
      whileTap="tap"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      style={{
        padding: '6px 10px',
        background: isHovered ? '#f8fafc' : 'white',
        border: `1px solid ${isHovered ? '#cbd5e1' : '#e2e8f0'}`,
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        transition: 'background 0.2s, border-color 0.2s'
      }}
      title={title}
    >
      <motion.div
        animate={{ 
          rotate: isHovered ? [0, -10, 10, 0] : 0 
        }}
        transition={{ duration: 0.3 }}
      >
        {children}
      </motion.div>
    </motion.button>
  );
}
