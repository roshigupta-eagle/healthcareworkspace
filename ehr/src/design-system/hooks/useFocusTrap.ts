'use client';

/**
 * Layer 6 — Hook: useFocusTrap
 *
 * Traps keyboard focus within a container element while active.
 * Used by Modal and ClinicalAlert to prevent focus from escaping to
 * background content — required for WCAG 2.1 SC 2.1.2 (No Keyboard Trap)
 * and SC 1.3.1 (Info and Relationships).
 *
 * The trap:
 *  1. Finds all focusable elements within `containerRef`
 *  2. Intercepts Tab / Shift+Tab to cycle within the set
 *  3. Moves focus to the first focusable element on activation
 *  4. Restores focus to the trigger element on deactivation
 */

import { useEffect, useRef, RefObject } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
): void {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    // Save the element that triggered the trap
    previousFocusRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    // Move focus into the trap
    const first = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)[0];
    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
      ).filter((el) => !el.closest('[aria-hidden="true"]'));

      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const firstEl = focusable[0];
      const lastEl  = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus on deactivation
      previousFocusRef.current?.focus();
    };
  }, [active, containerRef]);
}
