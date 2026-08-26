"use client";

import React, { useEffect, useRef } from 'react';

export default function WorkspaceDrawer({ title, open, onClose, children, width = '640px' }: { title: string; open: boolean; onClose: () => void; children: React.ReactNode; width?: string }) {
  const drawerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    function keydown(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); return; }
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = Array.from(drawerRef.current.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea')).filter((element) => !element.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', keydown);
    return () => { document.removeEventListener('keydown', keydown); document.body.style.overflow = previousOverflow; previous?.focus(); };
  }, [open]);
  if (!open) return null;
  return <div className="doctor-workspace-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={drawerRef} role="dialog" aria-modal="true" aria-labelledby="workspace-drawer-title" className="doctor-workspace-drawer" style={{ maxWidth: width }} onMouseDown={(event) => event.stopPropagation()}><div className="doctor-workspace-drawer-header"><h2 id="workspace-drawer-title">{title}</h2><button ref={closeRef} type="button" onClick={onClose} aria-label={`Close ${title}`} className="doctor-workspace-icon-button"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg></button></div><div className="doctor-workspace-drawer-body">{children}</div></section></div>;
}
