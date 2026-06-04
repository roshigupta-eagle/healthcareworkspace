'use client';

/**
 * Layer 6 — Hook: useAnnouncer
 *
 * Manages an ARIA live region for programmatic announcements to
 * screen readers. Prevents duplicate announcements with debouncing.
 *
 * Usage:
 *   const { announce } = useAnnouncer();
 *   announce('Patient saved successfully');   // polite
 *   announce('Critical alert: high potassium', 'assertive');
 *
 * The live region element is created once and injected into the body.
 * Multiple `useAnnouncer` instances share the same singleton regions.
 */

import { useCallback, useEffect, useRef } from 'react';

type Politeness = 'polite' | 'assertive';

const REGION_ID = {
  polite:    'ds-announcer-polite',
  assertive: 'ds-announcer-assertive',
} as const;

function getOrCreateRegion(politeness: Politeness): HTMLElement {
  const id = REGION_ID[politeness];
  let el = document.getElementById(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', politeness);
    el.setAttribute('aria-atomic', 'true');
    el.setAttribute('aria-relevant', 'additions text');
    // Visually hidden but accessible to screen readers
    Object.assign(el.style, {
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0',
      overflow: 'hidden',
      clip: 'rect(0,0,0,0)',
      whiteSpace: 'nowrap',
      border: '0',
    });
    document.body.appendChild(el);
  }
  return el;
}

export interface UseAnnouncerResult {
  announce: (message: string, politeness?: Politeness) => void;
}

export function useAnnouncer(): UseAnnouncerResult {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const announce = useCallback((message: string, politeness: Politeness = 'polite') => {
    if (typeof document === 'undefined') return;

    const region = getOrCreateRegion(politeness);

    // Clear first so repeat messages are re-announced
    region.textContent = '';

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      region.textContent = message;
    }, 50);
  }, []);

  return { announce };
}
