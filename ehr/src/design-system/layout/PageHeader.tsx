'use client';

/**
 * Layer 5 — Layout: PageHeader
 *
 * Consistent page-level header rendered at the top of content areas.
 * Provides: page title, optional subtitle, breadcrumbs, and action slot.
 *
 * Clinical use: patient chart section headers, admin pages, reports.
 */

import React from 'react';
import { cn } from '../utils/cn';

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  /** Right-aligned — primary actions for this page (e.g. "New Order") */
  actions?: React.ReactNode;
  /** Left-aligned extra content beneath the title (e.g. patient banner) */
  meta?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs,
  actions,
  meta,
  className,
}) => (
  <header
    className={cn(
      'border-b border-neutral-100 bg-white/95 backdrop-blur-sm px-6 py-3 shadow-sm',
      className,
    )}
  >
    {/* Breadcrumbs */}
    {breadcrumbs && breadcrumbs.length > 0 && (
      <nav aria-label="Breadcrumb" className="mb-2">
        <ol className="flex items-center gap-1 text-xs text-neutral-500">
          {breadcrumbs.map((crumb, i) => (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && (
                <svg className="h-3 w-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              )}
              {crumb.href ? (
                <a
                  href={crumb.href}
                  className="hover:text-primary-600 focus-visible:outline-none focus-visible:underline transition-colors"
                >
                  {crumb.label}
                </a>
              ) : (
                <span aria-current={i === breadcrumbs.length - 1 ? 'page' : undefined}>
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    )}

    {/* Title row */}
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-neutral-900 leading-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-neutral-500">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-shrink-0 items-center gap-3">
          {actions}
        </div>
      )}
    </div>

    {meta && <div className="mt-3">{meta}</div>}
  </header>
);
