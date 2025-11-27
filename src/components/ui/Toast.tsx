// src/components/ui/Toast.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/utils/utils';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = { id, message, type };

    setToasts((prev) => [...prev, newToast]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container - Z-Index alto para estar sobre todo */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastItem
              key={toast.id}
              toast={toast}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const typeConfig = {
    success: {
      bg: 'bg-white',
      border: 'border-l-4 border-green-500',
      text: 'text-secondary-900',
      iconColor: 'text-green-500',
      icon: CheckCircle,
    },
    error: {
      bg: 'bg-white',
      border: 'border-l-4 border-red-500',
      text: 'text-secondary-900',
      iconColor: 'text-red-500',
      icon: XCircle,
    },
    warning: {
      bg: 'bg-white',
      border: 'border-l-4 border-yellow-500',
      text: 'text-secondary-900',
      iconColor: 'text-yellow-500',
      icon: AlertTriangle,
    },
    info: {
      bg: 'bg-white',
      border: 'border-l-4 border-blue-500',
      text: 'text-secondary-900',
      iconColor: 'text-blue-500',
      icon: Info,
    },
  };

  const config = typeConfig[toast.type];
  const IconComponent = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={cn(
        'pointer-events-auto flex items-start gap-3 p-4 rounded-lg shadow-xl min-w-[320px] max-w-md',
        config.bg,
        config.border
      )}
      role="alert"
    >
      <IconComponent className={cn("w-6 h-6 flex-shrink-0", config.iconColor)} />
      
      <p className={cn('flex-1 font-medium text-sm mt-0.5', config.text)}>
        {toast.message}
      </p>
      
      <button
        onClick={onClose}
        className="text-secondary-400 hover:text-secondary-600 transition-colors"
        aria-label="Cerrar notificación"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}