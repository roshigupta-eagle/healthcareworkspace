"use client";

import { useEffect, useRef } from 'react';
import { XIcon } from './Icons';

type Props = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'md' | 'lg' | 'xl';
};

/** Large right-side drawer used for documentation-heavy workflows (editor, follow-up, addendum, history). */
export default function Drawer({ title, subtitle, onClose, children, footer, width = 'lg' }: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const widthClass = width === 'xl' ? 'max-w-3xl' : width === 'md' ? 'max-w-md' : 'max-w-xl';

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && panelRef.current) {
        const focusable = panelRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30" role="presentation" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`h-full w-full ${widthClass} bg-white shadow-2xl flex flex-col outline-none animate-[slideIn_180ms_ease-out]`}
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <XIcon size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && <div className="border-t border-slate-100 px-6 py-4">{footer}</div>}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(24px); opacity: 0.6; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
