'use client';

/**
 * Layer 6 — Hook: useKeyboardNav
 *
 * Generic roving-tabindex keyboard navigation for list-like widgets
 * (menus, listboxes, option groups, toolbar buttons).
 *
 * Follows the WAI-ARIA 1.2 "Roving tabindex" pattern:
 *  - Only one element in the group has tabindex="0" at a time
 *  - Arrow keys move focus within the group
 *  - Home/End jump to first/last
 *  - Circular navigation is optional
 *
 * Usage:
 *   const { activeIndex, getItemProps } = useKeyboardNav({ count: items.length });
 *   items.map((item, i) => <button {...getItemProps(i)}>{item.label}</button>)
 */

import { useState, useCallback, KeyboardEvent } from 'react';

export type Orientation = 'horizontal' | 'vertical' | 'both';

export interface UseKeyboardNavOptions {
  count: number;
  orientation?: Orientation;
  circular?: boolean;
  initialIndex?: number;
  onSelect?: (index: number) => void;
}

export interface UseKeyboardNavResult {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  getItemProps: (index: number) => {
    tabIndex: 0 | -1;
    'aria-selected'?: boolean;
    onKeyDown: (e: KeyboardEvent) => void;
    onFocus: () => void;
  };
}

export function useKeyboardNav({
  count,
  orientation = 'vertical',
  circular = true,
  initialIndex = 0,
  onSelect,
}: UseKeyboardNavOptions): UseKeyboardNavResult {
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const moveTo = useCallback(
    (next: number) => {
      const bounded = circular
        ? ((next % count) + count) % count
        : Math.max(0, Math.min(count - 1, next));
      setActiveIndex(bounded);
    },
    [count, circular],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent, index: number) => {
      const isVertical   = orientation === 'vertical'   || orientation === 'both';
      const isHorizontal = orientation === 'horizontal' || orientation === 'both';

      switch (e.key) {
        case 'ArrowDown':
          if (isVertical)   { e.preventDefault(); moveTo(index + 1); }
          break;
        case 'ArrowUp':
          if (isVertical)   { e.preventDefault(); moveTo(index - 1); }
          break;
        case 'ArrowRight':
          if (isHorizontal) { e.preventDefault(); moveTo(index + 1); }
          break;
        case 'ArrowLeft':
          if (isHorizontal) { e.preventDefault(); moveTo(index - 1); }
          break;
        case 'Home':
          e.preventDefault();
          setActiveIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setActiveIndex(count - 1);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onSelect?.(index);
          break;
      }
    },
    // onSelect intentionally in deps — callers must memoize it if referentially stable
    [moveTo, count, orientation, onSelect],
  );

  const getItemProps = useCallback(
    (index: number) => ({
      tabIndex: index === activeIndex ? (0 as const) : (-1 as const),
      'aria-selected': index === activeIndex,
      onKeyDown: (e: KeyboardEvent) => handleKeyDown(e, index),
      onFocus: () => setActiveIndex(index),
    }),
    [activeIndex, handleKeyDown],
  );

  return { activeIndex, setActiveIndex, getItemProps };
}
