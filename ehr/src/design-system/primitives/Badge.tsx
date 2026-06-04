'use client';

/**
 * Layer 2 — Primitive: Badge
 *
 * Compact status label. Used across the design system to convey:
 *  - Clinical severity (critical / warning / stable / info)
 *  - Order/workflow state (primary / neutral)
 *
 * The optional `dot` renders a small color-coded circle before the text,
 * providing a colour-plus-text signal for colour-blind users.
 *
 * Accessibility:
 *  - Colour is never the sole means of conveying information (WCAG 1.4.1)
 *  - Screen-reader text is preserved — do not make content purely visual
 */

import React from 'react';
import { cn } from '../utils/cn';

export type BadgeVariant =
  | 'critical'   // emergency, critical lab value, allergy flag
  | 'warning'    // caution, borderline, pending review
  | 'stable'     // normal range, confirmed stable
  | 'info'       // informational, contextual
  | 'primary'    // primary categorisation / active
  | 'neutral';   // inactive, archived, draft

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Renders a coloured dot before the label text */
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  critical: 'bg-critical-100 text-critical-800 ring-1 ring-inset ring-critical-300',
  warning:  'bg-warning-100  text-warning-800  ring-1 ring-inset ring-warning-300',
  stable:   'bg-stable-100   text-stable-800   ring-1 ring-inset ring-stable-300',
  info:     'bg-info-100     text-info-800     ring-1 ring-inset ring-info-300',
  primary:  'bg-primary-100  text-primary-800  ring-1 ring-inset ring-primary-300',
  neutral:  'bg-neutral-100  text-neutral-700  ring-1 ring-inset ring-neutral-300',
};

const dotColors: Record<BadgeVariant, string> = {
  critical: 'bg-critical-500',
  warning:  'bg-warning-500',
  stable:   'bg-stable-500',
  info:     'bg-info-500',
  primary:  'bg-primary-500',
  neutral:  'bg-neutral-400',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2.5 py-1   text-xs',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  dot = false,
  children,
  className,
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full font-medium',
      sizeClasses[size],
      variantClasses[variant],
      className,
    )}
  >
    {dot && (
      <span
        aria-hidden="true"
        className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', dotColors[variant])}
      />
    )}
    {children}
  </span>
);
