"use client";

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Languages, Zap, GitCompare, FolderOpen } from 'lucide-react';
import { useDocumentStore } from '@/store/useDocumentStore';

interface UploadZoneProps {
  onShowHistory?: () => void;
}

// 动画变体
const containerVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  initial: { opacity: 0, y: 30 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25
    }
  }
};

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

const featureIconVariants = {
  initial: { scale: 0, rotate: -180 },
  animate: { 
    scale: 1, 
    rotate: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  },
  hover: { 
    scale: 1.2, 
    rotate: 10,
    transition: { duration: 0.2 }
  }
};

export default function UploadZone({ onShowHistory }: UploadZoneProps) {
  const setRawContent = useDocumentStore((state) => state.setRawContent);
  const [isUploading, setIsUploading] = useState(false);

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
        {onShowHistory && (
          <motion.button
            variants={itemVariants}
            whileHover={{ 
              scale: 1.05,
              background: 'rgba(255,255,255,0.25)',
              borderColor: 'rgba(255,255,255,0.5)'
            }}
            whileTap={{ scale: 0.95 }}
            onClick={(e) => { e.stopPropagation(); onShowHistory(); }}
            style={{
              marginTop: '24px',
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
              gap: '8px',
              zIndex: 10
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
      </AnimatePresence>
    </motion.div>
  );
}
