import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notification alerts"
      className="fixed bottom-24 md:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss
}) => {
  const { id, type, message, duration = 4000 } = toast;

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const config = {
    success: {
      bg: 'bg-emerald-50 border-emerald-300 text-emerald-900',
      icon: 'check_circle',
      iconColor: 'text-emerald-600'
    },
    error: {
      bg: 'bg-rose-50 border-rose-300 text-rose-900',
      icon: 'error',
      iconColor: 'text-rose-600'
    },
    warning: {
      bg: 'bg-amber-50 border-amber-300 text-amber-900',
      icon: 'warning',
      iconColor: 'text-amber-600'
    },
    info: {
      bg: 'bg-indigo-50 border-indigo-300 text-indigo-900',
      icon: 'info',
      iconColor: 'text-indigo-600'
    }
  }[type];

  return (
    <div
      role="alert"
      className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl border shadow-lg transition-all animate-fade-in ${config.bg}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`material-symbols-outlined text-lg shrink-0 ${config.iconColor}`}>
          {config.icon}
        </span>
        <p className="text-xs font-mono-code font-medium leading-tight truncate">
          {message}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="text-slate-400 hover:text-slate-700 shrink-0 p-1 rounded-md transition-colors"
        aria-label="Dismiss notification"
      >
        <span className="material-symbols-outlined text-sm">close</span>
      </button>
    </div>
  );
};
