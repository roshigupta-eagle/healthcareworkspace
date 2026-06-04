'use client';

/**
 * Layer 5 — Layout: AppShell
 *
 * Root application shell. Composes the full-screen layout:
 *   ┌─────────────────────────────────────────┐
 *   │              TopBar (56px)              │
 *   ├──────────┬──────────────────────────────┤
 *   │ Sidebar  │       Content Area           │
 *   │  (240px) │   (scrollable, flex-col)     │
 *   └──────────┴──────────────────────────────┘
 *
 * The shell is the single source of truth for:
 *  - Sidebar collapsed state
 *  - Global notification / toast region
 *  - Skip-to-content link (WCAG 2.1 2.4.1)
 */

import React, { useState } from 'react';
import { cn } from '../utils/cn';
import { Sidebar } from './Sidebar';
import type { NavGroup, NavItem } from './Sidebar';

export interface AppShellProps {
  /** Navigation groups passed directly to Sidebar */
  navGroups: NavGroup[];
  /** Top-bar slot — brand logo, global search, user avatar */
  topBar?: React.ReactNode;
  /** Sidebar footer slot */
  sidebarFooter?: React.ReactNode;
  /** Main page content */
  children: React.ReactNode;
  /** Called when a nav item is clicked — receives full NavItem */
  onNavigate?: (item: NavItem) => void;
  className?: string;
}

const MAIN_CONTENT_ID = 'main-content';

export const AppShell: React.FC<AppShellProps> = ({
  navGroups,
  topBar,
  sidebarFooter,
  children,
  onNavigate,
  className,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={cn('flex flex-col h-screen overflow-hidden bg-neutral-50', className)}>
      {/* Skip-to-content link — WCAG 2.4.1 */}
      <a
        href={`#${MAIN_CONTENT_ID}`}
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[600] focus:rounded-lg focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>

      {/* Top bar */}
      {topBar && (
        <header className="flex-shrink-0 h-14 flex items-center px-4 gap-4 bg-white border-b border-neutral-200 shadow-xs z-[200]">
          {/* Sidebar toggle */}
          <button
            type="button"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            aria-controls="app-sidebar"
            onClick={() => setCollapsed((c) => !c)}
            className="flex-shrink-0 rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10zm0 5.25a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 15.25z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">{topBar}</div>
        </header>
      )}

      {/* Body row */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar — id applied to <nav> for aria-controls */}
        <Sidebar
          id="app-sidebar"
          groups={navGroups}
          collapsed={collapsed}
          footer={sidebarFooter}
          onNavigate={onNavigate}
          className="flex-shrink-0"
        />

        {/* Main content area */}
        <main
          id={MAIN_CONTENT_ID}
          tabIndex={-1}
          className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden focus-visible:outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
};
