"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export type ToastLevel = 'info' | 'success' | 'error' | 'warning';

export type ToastItem = {
  id: string;
  title?: string;
  message: string;
  level?: ToastLevel;
  duration?: number;
};

type ToastContextValue = {
  push: (t: Omit<ToastItem, 'id'>) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((t: Omit<ToastItem, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const item: ToastItem = { id, duration: 4000, level: 'info', ...t };
    setToasts((s) => [item, ...s]);
    if (item.duration && item.duration > 0) {
      setTimeout(() => {
        setToasts((s) => s.filter((x) => x.id !== id));
      }, item.duration);
    }
  }, []);

  const remove = useCallback((id: string) => setToasts((s) => s.filter((t) => t.id !== id)), []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}

      <div aria-live="polite" className="fixed right-4 top-6 z-50 flex flex-col gap-2 max-w-xs">
        {toasts.map((t) => (
          <div key={t.id} className={`rounded-lg p-3 shadow-md border ${toastLevelClass(t.level)} bg-white`}>
            <div className="flex items-start gap-3">
              <div className="flex-1">
                {t.title ? <div className="font-semibold text-sm text-slate-900">{t.title}</div> : null}
                <div className="text-sm text-slate-700">{t.message}</div>
              </div>
              <button onClick={() => remove(t.id)} aria-label="Dismiss" className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function toastLevelClass(level?: ToastLevel) {
  switch (level) {
    case 'success':
      return 'border-emerald-100';
    case 'error':
      return 'border-rose-100';
    case 'warning':
      return 'border-amber-100';
    default:
      return 'border-slate-100';
  }
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export default ToastProvider;
