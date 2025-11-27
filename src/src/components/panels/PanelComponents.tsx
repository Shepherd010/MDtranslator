"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, Minimize2 } from 'lucide-react';

export type PanelId = 'source-editor' | 'source-preview' | 'translated-editor' | 'translated-preview';
export type PanelSide = 'left' | 'right';

// 动画配置
const springTransition = {
  type: "spring",
  stiffness: 300,
  damping: 30
};

const buttonHoverVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.1 },
  tap: { scale: 0.95 }
};

interface PanelHeaderProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  panelId: PanelId;
  side: PanelSide;
  isQuad: boolean;
  expanded: PanelId | null;
  onToggle: (panelId: PanelId, side: PanelSide) => void;
}

export function PanelHeader({
  title,
  icon,
  color,
  panelId,
  side,
  isQuad,
  expanded,
  onToggle,
}: PanelHeaderProps) {
  const isExpanded = expanded === panelId;
  const [isHovered, setIsHovered] = useState(false);

  // Only show expand button in quad mode
  if (!isQuad) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          height: '36px',
          background: `${color}08`,
          borderBottom: `1px solid ${color}15`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          gap: '8px'
        }}
      >
        <motion.div 
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          style={{
            width: '6px',
            height: '6px',
            background: color,
            borderRadius: '50%'
          }} 
        />
        <span style={{
          fontSize: '12px',
          fontWeight: 600,
          color,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {icon} {title}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div 
      layout
      transition={springTransition}
      style={{
        height: '36px',
        background: `${color}08`,
        borderBottom: `1px solid ${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 12px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <motion.div 
          animate={{ 
            scale: isExpanded ? [1, 1.3, 1] : 1,
            boxShadow: isExpanded ? `0 0 8px ${color}` : 'none'
          }}
          transition={{ duration: 0.5 }}
          style={{
            width: '6px',
            height: '6px',
            background: color,
            borderRadius: '50%'
          }} 
        />
        <span style={{
          fontSize: '12px',
          fontWeight: 600,
          color,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {icon} {title}
        </span>
      </div>
      <motion.button
        variants={buttonHoverVariants}
        initial="initial"
        whileHover="hover"
        whileTap="tap"
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onClick={() => onToggle(panelId, side)}
        style={{
          background: isHovered ? `${color}15` : 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '4px',
          color: isHovered ? color : '#64748b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s, color 0.2s'
        }}
        title={isExpanded ? '缩小' : '放大到半屏'}
      >
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </motion.div>
      </motion.button>
    </motion.div>
  );
}

interface CollapsedPanelProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  panelId: PanelId;
  side: PanelSide;
  onExpand: (panelId: PanelId, side: PanelSide) => void;
}

// 胶囊面板动画变体
const collapsedPanelVariants = {
  initial: { 
    opacity: 0, 
    scale: 0.8,
    y: -20 
  },
  animate: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.8,
    y: -20,
    transition: { duration: 0.2 }
  },
  hover: {
    scale: 1.02,
    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    transition: { duration: 0.2 }
  },
  tap: { scale: 0.98 }
};

export function CollapsedPanel({
  title,
  icon,
  color,
  panelId,
  side,
  onExpand,
}: CollapsedPanelProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      layout
      variants={collapsedPanelVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover="hover"
      whileTap="tap"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      style={{
        background: isHovered ? `${color}12` : `${color}08`,
        borderRadius: '8px',
        border: `1px solid ${isHovered ? `${color}40` : `${color}20`}`,
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 0.2s, border-color 0.2s'
      }}
      onClick={() => onExpand(panelId, side)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <motion.div 
          animate={{ 
            scale: isHovered ? 1.3 : 1,
            boxShadow: isHovered ? `0 0 8px ${color}` : 'none'
          }}
          transition={{ duration: 0.2 }}
          style={{
            width: '6px',
            height: '6px',
            background: color,
            borderRadius: '50%'
          }} 
        />
        <span style={{
          fontSize: '12px',
          fontWeight: 600,
          color,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {icon} {title}
        </span>
      </div>
      <motion.div
        animate={{ 
          rotate: isHovered ? 90 : 0,
          scale: isHovered ? 1.2 : 1
        }}
        transition={{ duration: 0.2 }}
      >
        <Maximize2 size={14} color={isHovered ? color : "#64748b"} />
      </motion.div>
    </motion.div>
  );
}

interface ContentPanelProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  panelId: PanelId;
  side: PanelSide;
  isQuad: boolean;
  expanded: PanelId | null;
  onToggle: (panelId: PanelId, side: PanelSide) => void;
  children: React.ReactNode;
}

// 内容面板动画变体
const contentPanelVariants = {
  initial: { 
    opacity: 0, 
    scale: 0.95 
  },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.2 }
  }
};

export function ContentPanel({
  title,
  icon,
  color,
  panelId,
  side,
  isQuad,
  expanded,
  onToggle,
  children,
}: ContentPanelProps) {
  return (
    <motion.div 
      layout
      layoutId={panelId}
      variants={contentPanelVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={springTransition}
      style={{
        flex: 1,
        background: 'white',
        borderRadius: '10px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: `1.5px solid ${color}15`
      }}
    >
      <PanelHeader
        title={title}
        icon={icon}
        color={color}
        panelId={panelId}
        side={side}
        isQuad={isQuad}
        expanded={expanded}
        onToggle={onToggle}
      />
      <motion.div 
        layout
        style={{ flex: 1, overflow: 'auto' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
