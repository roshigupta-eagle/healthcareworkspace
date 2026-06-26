'use client';

/**
 * Layer 3 — Component: Card
 *
 * Surface container for grouping related clinical information.
 * Supports optional header slot (title + optional action), body, and
 * footer slot. Three visual styles accommodate different information
 * hierarchy levels.
 *
 * Clinical variants:
 *  - default    : standard patient data section
 *  - flush      : borderless, inline within a larger surface
 *  - outlined   : elevated visual weight for key metrics
 *  - critical   : critical-state card (border accent, tinted background)
 *  - warning    : cautionary card
 */

import React from 'react';
import { cn } from '../utils/cn';

export type CardVariant = 'default' | 'flush' | 'outlined' | 'critical' | 'warning';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  /** Optional structured header — rendered above the body with a bottom border */
  header?: React.ReactNode;
  /** Optional structured footer — rendered below the body with a top border */
  footer?: React.ReactNode;
  /** Remove default body padding — use when card body contains a full-width table or image */
  noPadding?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
  default:
    'bg-white/60 dark:bg-neutral-900/40 backdrop-blur-sm border border-neutral-200/30 shadow-sm',
  flush: 'bg-transparent',
  outlined:
    'bg-white/50 dark:bg-neutral-900/30 backdrop-blur-sm border-2 border-neutral-300/30 shadow-md',
  critical:
    'bg-critical-50/70 dark:bg-critical-900/30 backdrop-blur-sm border border-critical-300/40 shadow-sm',
  warning:
    'bg-warning-50/70 dark:bg-warning-900/30 backdrop-blur-sm border border-warning-300/40 shadow-sm',
};

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  header,
  footer,
  noPadding = false,
  children,
  className,
  ...props
}) => (
  <div
    className={cn(
      'rounded-lg overflow-hidden transition-shadow duration-150 transform-gpu',
      variantClasses[variant],
      'hover:shadow-md',
      className,
    )}
    {...props}
  >
    {header && (
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-neutral-100/30">
        {header}
      </div>
    )}

    <div className={cn(!noPadding && 'px-4 py-3')}>{children}</div>

    {footer && (
      <div className="px-4 py-3 border-t border-neutral-100/30 bg-white/30 dark:bg-neutral-900/20">
        {footer}
      </div>
    )}
  </div>
);

/** Convenience sub-components for structured Card header slots */
export interface CardTitleProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const CardTitle: React.FC<CardTitleProps> = ({ title, subtitle, action }) => (
  <>
    <div className="min-w-0 flex-1">
      <p className="text-sm font-semibold text-neutral-900 truncate">{title}</p>
      {subtitle && (
        <p className="text-xs text-neutral-500 mt-0.5 truncate">{subtitle}</p>
      )}
    </div>
    {action && <div className="flex-shrink-0">{action}</div>}
  </>
);
