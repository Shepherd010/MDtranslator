"use client";

import React, { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Maximize2, Minimize2 } from 'lucide-react';

export type PanelId = 'source-editor' | 'source-preview' | 'translated-editor' | 'translated-preview';
export type PanelSide = 'left' | 'right';

// 更快速的简单过渡
const quickTransition = {
  duration: 0.15,
  ease: [0.25, 0.1, 0.25, 1] // cubic-bezier for smooth feel
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

export const PanelHeader = memo(function PanelHeader({
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

  return (
    <div style={{
      height: '36px',
      background: `${color}08`,
      borderBottom: `1px solid ${color}15`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: isQuad ? 'space-between' : 'flex-start',
      padding: '0 12px',
      gap: '8px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <motion.div 
          animate={{ 
            scale: isExpanded ? 1.2 : 1,
            boxShadow: isExpanded ? `0 0 6px ${color}` : '0 0 0px transparent'
          }}
          transition={quickTransition}
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
      {isQuad && (
        <motion.button
          whileHover={{ scale: 1.1, backgroundColor: `${color}15` }}
          whileTap={{ scale: 0.95 }}
          transition={quickTransition}
          onClick={() => onToggle(panelId, side)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title={isExpanded ? '缩小' : '放大到半屏'}
        >
          {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </motion.button>
      )}
    </div>
  );
});

interface CollapsedPanelProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  panelId: PanelId;
  side: PanelSide;
  onExpand: (panelId: PanelId, side: PanelSide) => void;
}

export const CollapsedPanel = memo(function CollapsedPanel({
  title,
  icon,
  color,
  panelId,
  side,
  onExpand,
}: CollapsedPanelProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
        overflow: 'hidden',
        transition: 'all 0.15s ease',
        transform: isHovered ? 'scale(1.01)' : 'scale(1)'
      }}
      onClick={() => onExpand(panelId, side)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '6px',
          height: '6px',
          background: color,
          borderRadius: '50%'
        }} />
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
      <div style={{ 
        transform: isHovered ? 'rotate(45deg)' : 'rotate(0deg)',
        transition: 'transform 0.15s ease'
      }}>
        <Maximize2 size={14} color={isHovered ? color : "#64748b"} />
      </div>
    </div>
  );
});

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

export const ContentPanel = memo(function ContentPanel({
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
  // 翻译时禁用 layout 动画以提高性能
  return (
    <div 
      style={{
        flex: 1,
        background: 'white',
        borderRadius: '10px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: `1.5px solid ${color}15`,
        minHeight: 0,
        transition: 'all 0.2s ease'
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
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {children}
      </div>
    </div>
  );
});
