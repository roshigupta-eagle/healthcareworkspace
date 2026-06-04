'use client';

/**
 * Layer 5 — Layout: Sidebar
 *
 * Vertical navigation sidebar. Supports:
 *  - Nav item groups with optional section labels
 *  - Active state per item
 *  - Collapsible to icon-only mode (collapsed)
 *  - Notification badge per item
 *  - Bottom slot for user profile / settings
 *
 * Navigation items use <a> tags to support Next.js Link wrapping via
 * the `as` pattern or direct href usage.
 */

import React from 'react';
import { cn } from '../utils/cn';

export interface NavItem {
  id: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
  badge?: number;
  active?: boolean;
  disabled?: boolean;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export interface SidebarProps {
  /** Applied to the <nav> element — consumed by AppShell aria-controls */
  id?: string;
  groups: NavGroup[];
  /** Width collapses to icon-only — consumer controls this state */
  collapsed?: boolean;
  /** Bottom slot — typically user avatar + name + logout */
  footer?: React.ReactNode;
  className?: string;
  onNavigate?: (item: NavItem) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  id,
  groups,
  collapsed = false,
  footer,
  className,
  onNavigate,
}) => (
  <nav
    id={id}
    aria-label="Main navigation"
    className={cn(
      'flex flex-col h-full bg-white border-r border-neutral-200',
      'transition-[width] duration-[200ms] ease-out',
      collapsed ? 'w-14' : 'w-60',
      className,
    )}
  >
    <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-4">
      {groups.map((group, gi) => (
        <div key={gi} className="px-2">
          {group.label && !collapsed && (
            <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-widest text-neutral-400">
              {group.label}
            </p>
          )}
          <ul role="list" className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.id}>
                <a
                  href={item.href ?? '#'}
                  aria-current={item.active ? 'page' : undefined}
                  aria-disabled={item.disabled || undefined}
                  aria-label={collapsed ? item.label : undefined}
                  onClick={(e) => {
                    if (item.disabled) { e.preventDefault(); return; }
                    if (onNavigate) { e.preventDefault(); onNavigate(item); }
                  }}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-2 py-2',
                    'text-sm font-medium transition-colors duration-[100ms]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600',
                    item.active
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900',
                    item.disabled && 'pointer-events-none opacity-40',
                  )}
                >
                  {item.icon && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex-shrink-0 h-5 w-5',
                        item.active ? 'text-primary-600' : 'text-neutral-400 group-hover:text-neutral-600',
                      )}
                    >
                      {item.icon}
                    </span>
                  )}

                  {!collapsed && (
                    <span className="flex-1 truncate">{item.label}</span>
                  )}

                  {!collapsed && item.badge !== undefined && item.badge > 0 && (
                    <span
                      aria-label={`${item.badge} notifications`}
                      className="ml-auto rounded-full bg-primary-600 px-1.5 py-0.5 text-xs font-semibold text-white leading-none"
                    >
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>

    {footer && (
      <div
        className={cn(
          'flex-shrink-0 border-t border-neutral-200 px-2 py-3',
          collapsed && 'flex justify-center',
        )}
      >
        {footer}
      </div>
    )}
  </nav>
);
