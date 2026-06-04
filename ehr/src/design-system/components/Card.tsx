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
  default:  'bg-white border border-neutral-200 shadow-xs',
  flush:    'bg-white',
  outlined: 'bg-white border-2 border-neutral-300 shadow-sm',
  critical: 'bg-critical-50 border border-critical-300 shadow-xs',
  warning:  'bg-warning-50  border border-warning-300  shadow-xs',
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
    className={cn('rounded-xl overflow-hidden', variantClasses[variant], className)}
    {...props}
  >
    {header && (
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-neutral-200">
        {header}
      </div>
    )}

    <div className={cn(!noPadding && 'px-5 py-4')}>{children}</div>

    {footer && (
      <div className="px-5 py-3 border-t border-neutral-200 bg-neutral-50">
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
