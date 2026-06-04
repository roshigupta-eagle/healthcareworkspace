'use client';

/**
 * Layer 4 — Clinical Pattern: MedicationRow
 *
 * Single-row representation of an active medication order.
 * Designed for compact medication list views (MAR, active orders).
 *
 * Fields shown: drug name, dose, route, frequency, prescriber, status.
 * Optional: last administered time, PRN indication, high-alert flag.
 */

import React from 'react';
import { cn } from '../utils/cn';
import { Badge } from '../primitives/Badge';
import type { BadgeVariant } from '../primitives/Badge';

export type MedicationStatus =
  | 'active'
  | 'discontinued'
  | 'held'
  | 'completed'
  | 'pending'
  | 'overridden';

export interface MedicationRowProps {
  drugName: string;
  genericName?: string;
  dose: string;
  route: string;
  frequency: string;
  prescriber?: string;
  status: MedicationStatus;
  /** High-alert medication flag (ISMP list) */
  highAlert?: boolean;
  /** PRN (as needed) flag */
  prn?: boolean;
  /** Last administration time (ISO 8601) */
  lastAdministered?: string;
  onSelect?: () => void;
  className?: string;
}

const statusBadge: Record<MedicationStatus, { variant: BadgeVariant; label: string }> = {
  active:       { variant: 'stable',   label: 'Active' },
  discontinued: { variant: 'neutral',  label: 'D/C' },
  held:         { variant: 'warning',  label: 'Held' },
  completed:    { variant: 'neutral',  label: 'Completed' },
  pending:      { variant: 'info',     label: 'Pending' },
  overridden:   { variant: 'critical', label: 'Override' },
};

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-CA', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export const MedicationRow: React.FC<MedicationRowProps> = ({
  drugName,
  genericName,
  dose,
  route,
  frequency,
  prescriber,
  status,
  highAlert = false,
  prn = false,
  lastAdministered,
  onSelect,
  className,
}) => {
  const badge = statusBadge[status];
  const Tag   = onSelect ? 'button' : 'div';

  return (
    <Tag
      type={onSelect ? 'button' : undefined}
      onClick={onSelect}
      className={cn(
        'w-full flex flex-wrap items-start gap-x-6 gap-y-1 px-4 py-3',
        'border-b border-neutral-100 last:border-0 bg-white text-left',
        'transition-colors duration-[100ms]',
        onSelect && 'cursor-pointer hover:bg-neutral-50 focus-visible:outline-none focus-visible:bg-primary-50',
        status === 'discontinued' && 'opacity-60',
        className,
      )}
    >
      {/* Drug identity */}
      <div className="flex flex-col min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-neutral-900">
            {drugName}
          </span>
          {highAlert && (
            <span
              aria-label="High-alert medication"
              title="High-alert medication (ISMP)"
              className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-critical-600 text-white text-[9px] font-bold flex-shrink-0"
            >
              HA
            </span>
          )}
          {prn && (
            <Badge variant="info" size="sm">PRN</Badge>
          )}
        </div>
        {genericName && (
          <span className="text-xs text-neutral-500 mt-0.5">{genericName}</span>
        )}
      </div>

      {/* Sig */}
      <div className="flex items-center gap-4 text-sm text-neutral-700">
        <span className="font-mono font-medium">{dose}</span>
        <span className="text-neutral-400">{route}</span>
        <span>{frequency}</span>
      </div>

      {/* Meta */}
      <div className="flex flex-col items-end gap-1 min-w-[130px]">
        <Badge variant={badge.variant} size="sm" dot>{badge.label}</Badge>
        {lastAdministered && (
          <span className="text-xs text-neutral-400">
            Last: {formatDateTime(lastAdministered)}
          </span>
        )}
        {prescriber && (
          <span className="text-xs text-neutral-400">Rx: {prescriber}</span>
        )}
      </div>
    </Tag>
  );
};
