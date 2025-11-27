"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface ModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  width?: string;
  children: React.ReactNode;
}

// 动画变体
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.2 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2, delay: 0.1 }
  }
};

const modalVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.8,
    y: 50
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.8,
    y: 50,
    transition: { duration: 0.2 }
  }
};

export function ModalWrapper({ isOpen, onClose, width = '400px', children }: ModalWrapperProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200
          }}
          onClick={onClose}
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: '16px',
              padding: '24px',
              width,
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
            }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
}

export function ModalHeader({ title, onClose }: ModalHeaderProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}
    >
      <motion.h2 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 300 }}
        style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}
      >
        {title}
      </motion.h2>
      <motion.button
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={onClose}
        style={{ 
          background: isHovered ? '#f1f5f9' : 'none', 
          border: 'none', 
          cursor: 'pointer',
          padding: '6px',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s'
        }}
      >
        <X size={20} color={isHovered ? '#374151' : '#64748b'} />
      </motion.button>
    </motion.div>
  );
}
