"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ModalWrapper, ModalHeader } from './ModalWrapper';
import type { Settings } from '@/hooks/useSettings';

interface SettingsModalProps {
  isOpen: boolean;
  settings: Settings;
  onClose: () => void;
  onSave: () => void;
  onUpdate: (updates: Partial<Settings>) => void;
}

// 动画变体
const formItemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25
    }
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const buttonVariants = {
  initial: { scale: 1 },
  hover: { 
    scale: 1.02,
    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
  },
  tap: { scale: 0.98 }
};

export function SettingsModal({
  isOpen,
  settings,
  onClose,
  onSave,
  onUpdate,
}: SettingsModalProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 300)); // 模拟保存动画
    onSave();
    setIsSaving(false);
    onClose();
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} width="400px">
      <ModalHeader title="设置" onClose={onClose} />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        <motion.div variants={formItemVariants}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '6px',
            color: '#374151'
          }}>
            LLM 模型
          </label>
          <motion.select
            whileFocus={{ borderColor: '#667eea' }}
            value={settings.llm_model}
            onChange={(e) => onUpdate({ llm_model: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              outline: 'none'
            }}
          >
            <option value="qwen-flash">Qwen Flash (快速)</option>
            <option value="qwen-turbo">Qwen Turbo (标准)</option>
            <option value="qwen-plus">Qwen Plus (高级)</option>
          </motion.select>
        </motion.div>

        <motion.div variants={formItemVariants}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '6px',
            color: '#374151'
          }}>
            温度 (Temperature): 
            <motion.span
              key={settings.temperature}
              initial={{ scale: 1.2, color: '#667eea' }}
              animate={{ scale: 1, color: '#374151' }}
              style={{ marginLeft: '4px', fontWeight: 600 }}
            >
              {settings.temperature}
            </motion.span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => onUpdate({ temperature: parseFloat(e.target.value) })}
              style={{ width: '100%', cursor: 'pointer' }}
            />
            {/* 温度指示条 */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${settings.temperature * 100}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              style={{
                position: 'absolute',
                bottom: '-4px',
                left: 0,
                height: '3px',
                background: `linear-gradient(90deg, #667eea ${settings.temperature * 100}%, #764ba2)`,
                borderRadius: '2px',
                pointerEvents: 'none'
              }}
            />
          </div>
        </motion.div>

        <motion.div variants={formItemVariants}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '6px',
            color: '#374151'
          }}>
            翻译分块数量 (文档将被分成 N 块并行翻译)
          </label>
          <motion.input
            whileFocus={{ borderColor: '#667eea', boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.2)' }}
            type="number"
            min="1"
            max="10"
            value={settings.num_chunks}
            onChange={(e) => onUpdate({ num_chunks: parseInt(e.target.value) || 3 })}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              outline: 'none'
            }}
          />
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}
          >
            数值越小，翻译结果越连贯；数值越大，翻译速度越快
          </motion.p>
        </motion.div>

        <motion.div 
          variants={formItemVariants}
          whileHover={{ scale: 1.01 }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
          onClick={() => onUpdate({ auto_save: !settings.auto_save })}
        >
          <motion.div
            animate={{
              background: settings.auto_save ? '#667eea' : '#e2e8f0',
              borderColor: settings.auto_save ? '#667eea' : '#d1d5db'
            }}
            transition={{ duration: 0.2 }}
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '4px',
              border: '2px solid',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <motion.svg
              initial={false}
              animate={{ 
                scale: settings.auto_save ? 1 : 0,
                opacity: settings.auto_save ? 1 : 0
              }}
              width="12" 
              height="12" 
              viewBox="0 0 12 12"
            >
              <path
                d="M2 6L5 9L10 3"
                stroke="white"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          </motion.div>
          <label style={{ fontSize: '13px', color: '#374151', cursor: 'pointer' }}>
            自动保存翻译历史
          </label>
        </motion.div>

        <motion.button
          variants={buttonVariants}
          initial="initial"
          whileHover="hover"
          whileTap="tap"
          onClick={handleSave}
          disabled={isSaving}
          style={{
            padding: '10px 16px',
            background: isSaving 
              ? '#9ca3af' 
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            marginTop: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {isSaving ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid white',
                  borderTopColor: 'transparent',
                  borderRadius: '50%'
                }}
              />
              保存中...
            </>
          ) : (
            '保存设置'
          )}
        </motion.button>
      </motion.div>
    </ModalWrapper>
  );
}
