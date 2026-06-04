'use client';

/**
 * Layer 2 — Primitive: Divider
 *
 * Horizontal or vertical separator with optional text label.
 * Common uses in healthcare UI: separating patient demographics sections,
 * order groups, medication categories, or sidebar navigation groups.
 */

import React from 'react';
import { cn } from '../utils/cn';

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  /** Optional label rendered centred on the divider line */
  label?: string;
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  label,
  className,
}) => {
  if (orientation === 'vertical') {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={cn('w-px bg-neutral-200 self-stretch flex-shrink-0', className)}
      />
    );
  }

  if (label) {
    return (
      <div
        role="separator"
        aria-label={label}
        className={cn('relative flex items-center gap-3', className)}
      >
        <span className="flex-grow border-t border-neutral-200" aria-hidden="true" />
        <span className="flex-shrink-0 text-xs font-medium text-neutral-500">{label}</span>
        <span className="flex-grow border-t border-neutral-200" aria-hidden="true" />
      </div>
    );
  }

  return (
    <hr
      role="separator"
      className={cn('border-0 border-t border-neutral-200', className)}
    />
  );
};
