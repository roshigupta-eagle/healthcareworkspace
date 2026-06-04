'use client';

/**
 * Layer 3 — Component: Tabs
 *
 * Keyboard-navigable tab set. Follows ARIA Tabs pattern (WAI-ARIA 1.2):
 *  - role="tablist" on container
 *  - role="tab" with aria-selected on each tab
 *  - role="tabpanel" on content panel
 *  - Arrow keys navigate tabs; Enter/Space activate
 *
 * Used throughout the EHR for patient chart sections:
 * Overview | Medications | Labs | Imaging | Notes | Orders
 */

import React, { useCallback, useId, useRef } from 'react';
import { cn } from '../utils/cn';

export interface TabItem {
  id: string;
  label: string;
  /** Optional badge count (e.g. unread notes) */
  count?: number;
  /** Disables the tab */
  disabled?: boolean;
  content: React.ReactNode;
}

export type TabsVariant = 'underline' | 'pills' | 'contained';

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  variant?: TabsVariant;
  className?: string;
}

const listVariant: Record<TabsVariant, string> = {
  underline: 'border-b border-neutral-200 gap-0',
  pills:     'gap-1 p-1 bg-neutral-100 rounded-xl w-fit',
  contained: 'border-b border-neutral-200 gap-0',
};

const tabBase = 'relative inline-flex items-center gap-1.5 text-sm font-medium transition-colors duration-[100ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40';

const tabVariants: Record<TabsVariant, { active: string; inactive: string }> = {
  underline: {
    active:   'text-primary-600 border-b-2 border-primary-600 pb-3 pt-3 px-1 -mb-px',
    inactive: 'text-neutral-500 hover:text-neutral-700 border-b-2 border-transparent pb-3 pt-3 px-1 -mb-px hover:border-neutral-300',
  },
  pills: {
    active:   'bg-white text-neutral-900 shadow-xs rounded-lg px-3 py-1.5',
    inactive: 'text-neutral-500 hover:text-neutral-700 px-3 py-1.5 rounded-lg hover:bg-white/60',
  },
  contained: {
    active:   'text-primary-700 bg-primary-50 border-b-2 border-primary-600 pb-3 pt-3 px-4 -mb-px',
    inactive: 'text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50 border-b-2 border-transparent pb-3 pt-3 px-4 -mb-px',
  },
};

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  className,
}) => {
  const panelId  = useId();
  const tabRefs  = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index: number) => {
      const enabledTabs = tabs.filter((t) => !t.disabled);
      const enabledIdx  = enabledTabs.findIndex((t) => t.id === tabs[index].id);

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const next = enabledTabs[(enabledIdx + 1) % enabledTabs.length];
        const nextIdx = tabs.findIndex((t) => t.id === next.id);
        tabRefs.current[nextIdx]?.focus();
        onChange(next.id);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prev = enabledTabs[(enabledIdx - 1 + enabledTabs.length) % enabledTabs.length];
        const prevIdx = tabs.findIndex((t) => t.id === prev.id);
        tabRefs.current[prevIdx]?.focus();
        onChange(prev.id);
      } else if (e.key === 'Home') {
        e.preventDefault();
        const first = enabledTabs[0];
        tabRefs.current[tabs.findIndex((t) => t.id === first.id)]?.focus();
        onChange(first.id);
      } else if (e.key === 'End') {
        e.preventDefault();
        const last = enabledTabs[enabledTabs.length - 1];
        tabRefs.current[tabs.findIndex((t) => t.id === last.id)]?.focus();
        onChange(last.id);
      }
    },
    [tabs, onChange],
  );

  const activeContent = tabs.find((t) => t.id === activeTab)?.content;

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Tab list */}
      <div
        role="tablist"
        className={cn('flex', listVariant[variant])}
        aria-orientation="horizontal"
      >
        {tabs.map((tab, i) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              ref={(el) => { tabRefs.current[i] = el; }}
              role="tab"
              type="button"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`${panelId}-${tab.id}`}
              disabled={tab.disabled}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={cn(
                tabBase,
                isActive
                  ? tabVariants[variant].active
                  : tabVariants[variant].inactive,
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 text-xs font-semibold text-neutral-600 leading-none">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active panel — tabIndex={-1} per WAI-ARIA 1.2 Tabs pattern; focus managed by JS */}
      <div
        role="tabpanel"
        id={`${panelId}-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={-1}
        className="focus-visible:outline-none"
      >
        {activeContent}
      </div>
    </div>
  );
};
