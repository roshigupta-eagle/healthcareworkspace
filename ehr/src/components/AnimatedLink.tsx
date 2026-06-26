"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
};

export default function AnimatedLink({ href, children, className, ...props }: Props) {
  const router = useRouter();
  const [animating, setAnimating] = useState(false);
  const overlayRef = React.useRef<HTMLElement | null>(null);
  const createdRef = React.useRef(false);
  const timeoutRef = React.useRef<number | undefined>(undefined);

  const ensureOverlay = () => {
    if (typeof document === 'undefined') return null;
    // In development mode (local debugging) avoid creating a global overlay
    // which can produce visible flashes when in-dev HMR triggers frequent
    // mount/unmount cycles. This is reversible and only affects dev.
    if (process.env.NODE_ENV === 'development') {
      return document.querySelector('.page-transition-overlay') as HTMLElement | null;
    }

    let overlay = document.querySelector('.page-transition-overlay') as HTMLElement | null;
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'page-transition-overlay';
      overlay.setAttribute('aria-hidden', 'true');
      document.body.appendChild(overlay);
      createdRef.current = true;
    }
    overlayRef.current = overlay;
    return overlay;
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // allow open-in-new-tab / modifier clicks
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    setAnimating(true);

    const overlay = ensureOverlay();
    if (overlay) {
      // force a reflow so the transition runs reliably
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      overlay.offsetHeight;
      overlay.classList.add('show');
    }

    // wait for the overlay to fade in, then navigate
    timeoutRef.current = window.setTimeout(() => {
      router.push(href);
    }, 360);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const overlay = overlayRef.current || document.querySelector('.page-transition-overlay') as HTMLElement | null;
      if (overlay) {
        overlay.classList.remove('show');
        if (createdRef.current) overlay.remove();
      }
    };
  }, []);

  return (
    <a href={href} onClick={handleClick} className={className} {...props}>
      {children}
    </a>
  );
}
