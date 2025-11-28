"use client";

import React, { useCallback, useState, memo } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Languages, Zap, GitCompare, FolderOpen, BookOpen, ArrowRightLeft } from 'lucide-react';
import { useDocumentStore, TranslationDirection } from '@/store/useDocumentStore';

interface UploadZoneProps {
  onShowHistory?: () => void;
}

// 优化后的动画配置 - 更流畅
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

// 简化的动画变体
const containerVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: smoothTransition
  }
};

const featureIconVariants = {
  initial: { scale: 0.8, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: quickTransition
  }
};

// 保留浮动动画（upload页面动画是OK的）
const floatingVariants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

export default function UploadZone({ onShowHistory }: UploadZoneProps) {
  const setRawContent = useDocumentStore((state) => state.setRawContent);
  const translationDirection = useDocumentStore((state) => state.translationDirection);
  const setTranslationDirection = useDocumentStore((state) => state.setTranslationDirection);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingExample, setIsLoadingExample] = useState(false);

  const loadExample = useCallback(async () => {
    setIsLoadingExample(true);
    try {
      const res = await fetch('/api/example');
      if (res.ok) {
        const data = await res.json();
        setRawContent(data.content);
      }
    } catch (e) {
      console.error('Failed to load example:', e);
    } finally {
      setIsLoadingExample(false);
    }
  }, [setRawContent]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
          // 延迟一下以显示动画
          setTimeout(() => {
            setRawContent(text);
            setIsUploading(false);
          }, 500);
        }
      };
      reader.readAsText(file);
    }
  }, [setRawContent]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
        'text/markdown': ['.md'],
        'text/plain': ['.txt']
    }
  });

  // 提取 dropzone props，排除与 framer-motion 冲突的属性
  const dropzoneProps = getRootProps();
  const { onAnimationStart, onDragStart, onDragEnd, onDrag, ...safeDropzoneProps } = dropzoneProps as any;

  return (
    <motion.div 
      variants={containerVariants}
      initial="initial"
      animate="animate"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Animated background circles */}
      <motion.div
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.1, 0.15, 0.1]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: 'absolute',
          top: '-10%',
          left: '-5%',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          pointerEvents: 'none'
        }} 
      />
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.08, 0.12, 0.08]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        style={{
          position: 'absolute',
          bottom: '-15%',
          right: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          pointerEvents: 'none'
        }} 
      />

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.sin(i) * 20, 0],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 4 + i * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.3
          }}
          style={{
            position: 'absolute',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.4)',
            left: `${15 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
            pointerEvents: 'none'
          }}
        />
      ))}

      {/* Content */}
      <motion.div 
        variants={itemVariants}
        style={{ textAlign: 'center', marginBottom: '48px', zIndex: 10 }}
      >
        <motion.h1 
          variants={floatingVariants}
          animate="animate"
          style={{
            fontSize: '3.5rem',
            fontWeight: 800,
            color: 'white',
            marginBottom: '16px',
            textShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}
        >
          MD<motion.span 
            animate={{ 
              color: ['#ffd700', '#ffec8b', '#ffd700'],
              textShadow: [
                '0 0 10px rgba(255,215,0,0.5)',
                '0 0 20px rgba(255,215,0,0.8)',
                '0 0 10px rgba(255,215,0,0.5)'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ color: '#ffd700' }}
          >Translator</motion.span>
        </motion.h1>
        <motion.p 
          variants={itemVariants}
          style={{
            fontSize: '1.25rem',
            color: 'rgba(255,255,255,0.85)',
            maxWidth: '500px',
            margin: '0 auto'
          }}
        >
          AI-Powered Context-Aware Markdown Translation
        </motion.p>
        
        {/* 翻译方向选择 */}
        <motion.div
          variants={itemVariants}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginTop: '20px'
          }}
        >
          <ArrowRightLeft size={20} color="rgba(255,255,255,0.8)" />
          <motion.select
            whileHover={{ scale: 1.02 }}
            value={translationDirection}
            onChange={(e) => setTranslationDirection(e.target.value as TranslationDirection)}
            style={{
              padding: '10px 20px',
              fontSize: '15px',
              fontWeight: 500,
              background: 'rgba(255,255,255,0.15)',
              border: '2px solid rgba(255,255,255,0.3)',
              borderRadius: '10px',
              color: 'white',
              cursor: 'pointer',
              outline: 'none',
              backdropFilter: 'blur(10px)'
            }}
          >
            <option value="en2zh" style={{ color: '#333', background: 'white' }}>英文 → 中文</option>
            <option value="zh2en" style={{ color: '#333', background: 'white' }}>中文 → 英文</option>
          </motion.select>
        </motion.div>
        
        <motion.div 
          variants={itemVariants}
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '32px',
            marginTop: '24px'
          }}
        >
          {[
            { icon: Zap, color: '#ffd700', text: 'AST Parsing' },
            { icon: Languages, color: '#00d4ff', text: 'Context Aware' },
            { icon: GitCompare, color: '#00ff88', text: 'Smart Diff' }
          ].map((feature, index) => (
            <motion.div 
              key={feature.text}
              variants={featureIconVariants}
              whileHover="hover"
              custom={index}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                color: 'rgba(255,255,255,0.8)',
                cursor: 'default'
              }}
            >
              <feature.icon size={18} color={feature.color} />
              <span>{feature.text}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Upload Box */}
      <motion.div
        variants={itemVariants}
        whileHover={{ 
          scale: 1.02,
          boxShadow: '0 25px 70px rgba(0,0,0,0.4)'
        }}
        whileTap={{ scale: 0.98 }}
        animate={{
          borderColor: isDragActive ? '#ffd700' : 'rgba(255,255,255,0.4)',
          background: isDragActive ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.1)',
          scale: isDragActive ? 1.05 : 1
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '48px',
          borderRadius: '24px',
          border: '3px dashed rgba(255,255,255,0.4)',
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          cursor: 'pointer',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          zIndex: 10
        }}
        {...safeDropzoneProps}
      >
        <input {...getInputProps()} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <motion.div 
            animate={{
              scale: isDragActive ? 1.2 : 1,
              rotate: isDragActive ? [0, -10, 10, 0] : 0,
              background: isDragActive ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.15)'
            }}
            transition={{ 
              scale: { type: "spring", stiffness: 300, damping: 20 },
              rotate: { duration: 0.5 }
            }}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <AnimatePresence mode="wait">
              {isUploading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, rotate: 0 }}
                  animate={{ opacity: 1, rotate: 360 }}
                  exit={{ opacity: 0 }}
                  transition={{ rotate: { duration: 1, repeat: Infinity, ease: "linear" } }}
                >
                  <Upload size={36} color="#ffd700" />
                </motion.div>
              ) : (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  whileHover={{ y: -5 }}
                >
                  <Upload size={36} color={isDragActive ? '#ffd700' : 'white'} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          <div style={{ textAlign: 'center' }}>
            <motion.p 
              animate={{ 
                scale: isDragActive ? 1.1 : 1,
                color: isDragActive ? '#ffd700' : 'white'
              }}
              style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                color: 'white',
                marginBottom: '8px'
              }}
            >
              {isDragActive ? "Drop it like it's hot!" : "Upload Markdown File"}
            </motion.p>
            <p style={{ color: 'rgba(255,255,255,0.7)' }}>
              Drag & drop or click to browse
            </p>
          </div>
          <motion.div 
            whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.15)' }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '16px',
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '20px',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '0.85rem',
              transition: 'background 0.2s'
            }}
          >
            <FileText size={14} />
            Supports .md, .txt
          </motion.div>
        </div>
      </motion.div>

      {/* Load History Button */}
      <AnimatePresence>
        <motion.div
          variants={itemVariants}
          style={{
            display: 'flex',
            gap: '16px',
            marginTop: '24px',
            zIndex: 10
          }}
        >
          {/* 加载示例按钮 */}
          <motion.button
            whileHover={{ 
              scale: 1.05,
              background: 'rgba(255,255,255,0.25)',
              borderColor: 'rgba(255,255,255,0.5)'
            }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => { e.stopPropagation(); loadExample(); }}
            disabled={isLoadingExample}
            style={{
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.15)',
              border: '2px solid rgba(255,255,255,0.3)',
              borderRadius: '12px',
              color: 'white',
              fontSize: '14px',
              fontWeight: 500,
              cursor: isLoadingExample ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: isLoadingExample ? 0.7 : 1
            }}
          >
            <motion.div
              animate={isLoadingExample ? { rotate: 360 } : {}}
              transition={{ duration: 1, repeat: isLoadingExample ? Infinity : 0, ease: "linear" }}
            >
              <BookOpen size={18} />
            </motion.div>
            {isLoadingExample ? '加载中...' : '加载示例'}
          </motion.button>

          {/* 历史记录按钮 */}
          {onShowHistory && (
            <motion.button
              whileHover={{ 
                scale: 1.05,
                background: 'rgba(255,255,255,0.25)',
                borderColor: 'rgba(255,255,255,0.5)'
              }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => { e.stopPropagation(); onShowHistory(); }}
              style={{
                padding: '12px 24px',
                background: 'rgba(255,255,255,0.15)',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <motion.div
                whileHover={{ rotate: [0, -15, 15, 0] }}
                transition={{ duration: 0.4 }}
              >
                <FolderOpen size={18} />
              </motion.div>
              载入历史记录
            </motion.button>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
