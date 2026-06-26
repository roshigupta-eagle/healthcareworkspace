'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function LandingMode() {
  const pathname = usePathname();

  useEffect(() => {
    const cls = 'landing-no-sidebar';
    if (typeof document === 'undefined') return;
    if (!pathname) return;
    const shouldHide = pathname === '/' || pathname.startsWith('/login') || pathname.startsWith('/register');
    if (shouldHide) {
      document.body.classList.add(cls);
    } else {
      document.body.classList.remove(cls);
    }
    // If a transition overlay was left visible by an AnimatedLink, remove the show class so it fades out
    let timeoutId: number | undefined;
    const overlay = document.querySelector('.page-transition-overlay') as HTMLElement | null;
    if (overlay && overlay.classList.contains('show')) {
      // Give the browser a frame to render, then remove show to trigger fade-out
      requestAnimationFrame(() => {
        timeoutId = window.setTimeout(() => overlay.classList.remove('show'), 50);
      });
    }

    return () => {
      document.body.classList.remove(cls);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [pathname]);

  return null;
}
