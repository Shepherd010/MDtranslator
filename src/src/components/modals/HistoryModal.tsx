"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { ModalWrapper, ModalHeader } from './ModalWrapper';
import type { HistoryDoc } from '@/hooks/useDocumentHistory';

interface HistoryModalProps {
  isOpen: boolean;
  documents: HistoryDoc[];
  onClose: () => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}

// 列表动画变体
const listVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { 
    opacity: 1, 
    x: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25
    }
  },
  exit: { 
    opacity: 0, 
    x: 20,
    transition: { duration: 0.2 }
  }
};

const buttonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 }
};

export function HistoryModal({
  isOpen,
  documents,
  onClose,
  onLoad,
  onDelete,
}: HistoryModalProps) {
  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} width="500px">
      <ModalHeader title="历史记录" onClose={onClose} />

      {documents.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}
        >
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            暂无历史记录
          </motion.div>
        </motion.div>
      ) : (
        <motion.div 
          variants={listVariants}
          initial="hidden"
          animate="show"
          style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
        >
          <AnimatePresence>
            {documents.map((doc, index) => (
              <HistoryItem
                key={doc.id}
                doc={doc}
                index={index}
                onLoad={() => onLoad(doc.id)}
                onDelete={() => onDelete(doc.id)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </ModalWrapper>
  );
}

interface HistoryItemProps {
  doc: HistoryDoc;
  index: number;
  onLoad: () => void;
  onDelete: () => void;
}

function HistoryItem({ doc, index, onLoad, onDelete }: HistoryItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div 
      variants={itemVariants}
      exit="exit"
      layout
      whileHover={{ 
        scale: 1.02,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px',
        background: isHovered ? '#f1f5f9' : '#f8fafc',
        borderRadius: '8px',
        border: `1px solid ${isHovered ? '#cbd5e1' : '#e2e8f0'}`,
        transition: 'background 0.2s, border-color 0.2s'
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <motion.div 
          style={{
            fontWeight: 500,
            fontSize: '14px',
            color: '#1e293b',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {doc.title}
        </motion.div>
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{new Date(doc.updated_at).toLocaleString()}</span>
          <motion.span 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.05 + 0.2 }}
            style={{
              padding: '2px 6px',
              borderRadius: '4px',
              background: doc.is_translated ? '#dcfce7' : '#fef3c7',
              color: doc.is_translated ? '#166534' : '#92400e',
              fontSize: '11px'
            }}
          >
            {doc.is_translated ? '已翻译' : '未翻译'}
          </motion.span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <motion.button
          variants={buttonVariants}
          initial="initial"
          whileHover="hover"
          whileTap="tap"
          onClick={onLoad}
          style={{
            padding: '6px 12px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          载入
        </motion.button>
        <motion.button
          variants={buttonVariants}
          initial="initial"
          whileHover={{ scale: 1.1, background: '#fecaca' }}
          whileTap="tap"
          onClick={onDelete}
          style={{
            padding: '6px',
            background: '#fee2e2',
            color: '#dc2626',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          <Trash2 size={14} />
        </motion.button>
      </div>
    </motion.div>
  );
}
