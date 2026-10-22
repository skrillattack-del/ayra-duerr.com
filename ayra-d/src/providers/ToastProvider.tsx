'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
export type NotificationStatus = 'OK' | 'ERROR' | 'WARN' | 'INFO';

export interface TerminalNotification {
  id: string;
  status: NotificationStatus;
  title: string;
  message: string;
  sector?: string; // e.g., [GMAIL], [AUTH], [SYSTEM]
}

interface ToastContextType {
  toast: (props: Omit<TerminalNotification, 'id'>) => void;
  dismiss: (id: string) => void;
}

// Legacy interface for backward compatibility
interface LegacyToastProps {
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
}

// Context
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Hook
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  const { toast: contextToast, dismiss } = context;

  // Return a wrapper that handles both old and new API. Memoized so
  // components that put `toast` in a useCallback/useEffect dependency array
  // (e.g. admin/page.tsx's data loaders) don't get a new function identity
  // on every render, which would otherwise re-trigger those effects forever.
  const legacyToast = useCallback((props: LegacyToastProps | Omit<TerminalNotification, 'id'>) => {
    // Check if it's legacy format
    if ('variant' in props || 'description' in props) {
      const legacy = props as LegacyToastProps;
      const statusMap: Record<string, NotificationStatus> = {
        success: 'OK',
        destructive: 'ERROR',
        default: 'INFO'
      };
      contextToast({
        status: statusMap[legacy.variant || 'default'],
        title: legacy.title,
        message: legacy.description || '',
        sector: 'SYSTEM'
      });
    } else {
      contextToast(props as Omit<TerminalNotification, 'id'>);
    }
  }, [contextToast]);

  return { toast: legacyToast, dismiss };
}

// Terminal Notification Component
function TerminalNotificationItem({ 
  notification, 
  onDismiss 
}: { 
  notification: TerminalNotification; 
  onDismiss: (id: string) => void;
}) {
  const statusConfig = {
    OK: {
      border: 'border-emerald-500/60',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.3),inset_0_0_20px_rgba(16,185,129,0.1)]',
      text: 'text-emerald-400',
      label: 'SYSTEM_OK'
    },
    ERROR: {
      border: 'border-red-500/60',
      glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3),inset_0_0_20px_rgba(239,68,68,0.1)]',
      text: 'text-red-400',
      label: 'SYSTEM_ERROR'
    },
    WARN: {
      border: 'border-amber-500/60',
      glow: 'shadow-[0_0_20px_rgba(245,158,11,0.3),inset_0_0_20px_rgba(245,158,11,0.1)]',
      text: 'text-amber-400',
      label: 'SYSTEM_WARN'
    },
    INFO: {
      border: 'border-cyan-500/60',
      glow: 'shadow-[0_0_20px_rgba(6,182,212,0.3),inset_0_0_20px_rgba(6,182,212,0.1)]',
      text: 'text-cyan-400',
      label: 'SYSTEM_INFO'
    }
  };

  const config = statusConfig[notification.status];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: -20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -20 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      onClick={() => onDismiss(notification.id)}
      className={`
        relative cursor-pointer
        bg-zinc-950/95 backdrop-blur-sm
        border-2 ${config.border}
        ${config.glow}
        rounded-sm
        p-4 min-w-[320px] max-w-[420px]
        font-mono
      `}
    >
      {/* Scanline effect */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)'
        }}
      />
      
      {/* Corner accents */}
      <div className={`absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 ${config.border}`} />
      <div className={`absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 ${config.border}`} />
      <div className={`absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 ${config.border}`} />
      <div className={`absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 ${config.border}`} />

      {/* Content */}
      <div className="relative z-10 space-y-2">
        {/* Status header */}
        <div className={`text-[10px] tracking-[0.3em] ${config.text}`}>
          [{config.label}]
        </div>
        
        {/* Title */}
        <div className="text-slate-100 text-sm font-bold tracking-wide uppercase">
          {notification.title}
        </div>
        
        {/* Message with sector */}
        {notification.message && (
          <div className="text-slate-400 text-xs leading-relaxed">
            {notification.message}
            {notification.sector && (
              <span className={`${config.text} ml-1`}>
                [{notification.sector}]
              </span>
            )}
          </div>
        )}
      </div>

      {/* Dismiss hint */}
      <div className="absolute bottom-1 right-2 text-[8px] text-slate-600 tracking-widest">
        CLICK TO DISMISS
      </div>
    </motion.div>
  );
}

// Provider Component
export function ToastProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<TerminalNotification[]>([]);

  const toast = useCallback((props: Omit<TerminalNotification, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 11);
    const newNotification: TerminalNotification = { id, ...props };
    
    setNotifications((prev) => [...prev, newNotification]);

    // Auto dismiss after 6 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 6000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      
      {/* Notification Container - centered top */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-3">
        <AnimatePresence>
          {notifications.map((n) => (
            <TerminalNotificationItem 
              key={n.id} 
              notification={n} 
              onDismiss={dismiss} 
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// Re-export Toast type for backward compatibility
export type Toast = TerminalNotification;
