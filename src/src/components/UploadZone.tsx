"use client";

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Languages, Zap, GitCompare, FolderOpen } from 'lucide-react';
import { useDocumentStore } from '@/store/useDocumentStore';

interface UploadZoneProps {
  onShowHistory?: () => void;
}

export default function UploadZone({ onShowHistory }: UploadZoneProps) {
  const setRawContent = useDocumentStore((state) => state.setRawContent);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
          setRawContent(text);
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

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      width: '100vw',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative circles */}
      <div style={{
        position: 'absolute',
        top: '-10%',
        left: '-5%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-15%',
        right: '-10%',
        width: '500px',
        height: '500px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)',
        pointerEvents: 'none'
      }} />

      {/* Content */}
      <div style={{ textAlign: 'center', marginBottom: '48px', zIndex: 10 }}>
        <h1 style={{
          fontSize: '3.5rem',
          fontWeight: 800,
          color: 'white',
          marginBottom: '16px',
          textShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          MD<span style={{ color: '#ffd700' }}>Translator</span>
        </h1>
        <p style={{
          fontSize: '1.25rem',
          color: 'rgba(255,255,255,0.85)',
          maxWidth: '500px',
          margin: '0 auto'
        }}>
          AI-Powered Context-Aware Markdown Translation
        </p>
        
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '32px',
          marginTop: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.8)' }}>
            <Zap size={18} color="#ffd700" />
            <span>AST Parsing</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.8)' }}>
            <Languages size={18} color="#00d4ff" />
            <span>Context Aware</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.8)' }}>
            <GitCompare size={18} color="#00ff88" />
            <span>Smart Diff</span>
          </div>
        </div>
      </div>

      {/* Upload Box */}
      <div
        {...getRootProps()}
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '48px',
          borderRadius: '24px',
          border: isDragActive ? '3px solid #ffd700' : '3px dashed rgba(255,255,255,0.4)',
          background: isDragActive ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          transform: isDragActive ? 'scale(1.02)' : 'scale(1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          zIndex: 10
        }}
      >
        <input {...getInputProps()} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: isDragActive ? 'rgba(255,215,0,0.3)' : 'rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease'
          }}>
            <Upload size={36} color={isDragActive ? '#ffd700' : 'white'} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: 'white',
              marginBottom: '8px'
            }}>
              {isDragActive ? "Drop it like it's hot!" : "Upload Markdown File"}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.7)' }}>
              Drag & drop or click to browse
            </p>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '16px',
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '20px',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.85rem'
          }}>
            <FileText size={14} />
            Supports .md, .txt
          </div>
        </div>
      </div>

      {/* Load History Button */}
      {onShowHistory && (
        <button
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
            transition: 'all 0.2s',
            zIndex: 10
          }}
        >
          <FolderOpen size={18} />
          载入历史记录
        </button>
      )}
    </div>
  );
}
