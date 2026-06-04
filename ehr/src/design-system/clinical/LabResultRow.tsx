'use client';

/**
 * Layer 4 — Clinical Pattern: LabResultRow
 *
 * Single lab result row for result list views (e.g. CBC, metabolic panel).
 * Displays: test name, value with units, reference range, abnormality flag,
 * collection date, and result status.
 *
 * Flag system follows standard HL7 v2 / FHIR interpretation codes:
 *  H  = High     L  = Low
 *  HH = Critical high   LL = Critical low
 *  N  = Normal   A  = Abnormal
 */

import React from 'react';
import { cn } from '../utils/cn';
import { Badge } from '../primitives/Badge';
import type { BadgeVariant } from '../primitives/Badge';

export type LabFlag = 'HH' | 'H' | 'N' | 'L' | 'LL' | 'A' | null;
export type LabStatus = 'final' | 'preliminary' | 'corrected' | 'cancelled' | 'pending';

export interface LabResultRowProps {
  testName: string;
  value: string | number;
  unit?: string;
  referenceRange?: string;
  flag?: LabFlag;
  status?: LabStatus;
  collectedAt?: string;   // ISO 8601
  resultedAt?: string;    // ISO 8601
  onSelect?: () => void;
  className?: string;
}

const flagConfig: Record<NonNullable<LabFlag>, { label: string; variant: BadgeVariant; valueClass: string }> = {
  HH: { label: 'Critical ↑', variant: 'critical', valueClass: 'text-critical-700 font-bold' },
  H:  { label: 'High ↑',     variant: 'warning',  valueClass: 'text-warning-700 font-semibold' },
  N:  { label: 'Normal',     variant: 'stable',   valueClass: 'text-stable-700' },
  L:  { label: 'Low ↓',      variant: 'warning',  valueClass: 'text-warning-700 font-semibold' },
  LL: { label: 'Critical ↓', variant: 'critical', valueClass: 'text-critical-700 font-bold' },
  A:  { label: 'Abnormal',   variant: 'warning',  valueClass: 'text-warning-700 font-semibold' },
};

const statusLabels: Record<LabStatus, string> = {
  final:       '',
  preliminary: 'Prelim',
  corrected:   'Corrected',
  cancelled:   'Cancelled',
  pending:     'Pending',
};

function formatDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-CA', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export const LabResultRow: React.FC<LabResultRowProps> = ({
  testName,
  value,
  unit,
  referenceRange,
  flag = null,
  status = 'final',
  collectedAt,
  resultedAt,
  onSelect,
  className,
}) => {
  const flagInfo  = flag ? flagConfig[flag] : null;
  const isCritical = flag === 'HH' || flag === 'LL';
  const Tag       = onSelect ? 'button' : 'div';

  return (
    <Tag
      type={onSelect ? 'button' : undefined}
      onClick={onSelect}
      aria-label={onSelect ? `View detail for ${testName}` : undefined}
      className={cn(
        'w-full flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left',
        'border-b border-neutral-100 last:border-0 bg-white',
        'transition-colors duration-[100ms]',
        isCritical && 'bg-critical-50',
        onSelect && 'cursor-pointer hover:bg-neutral-50 focus-visible:outline-none focus-visible:bg-primary-50',
        className,
      )}
    >
      {/* Critical pulse indicator */}
      {isCritical && (
        <span className="flex-shrink-0 h-2 w-2 rounded-full bg-critical-600 animate-pulse" aria-hidden="true" />
      )}

      {/* Test name */}
      <div className="flex-1 min-w-[140px]">
        <span className={cn('text-sm font-medium', isCritical ? 'text-critical-800' : 'text-neutral-800')}>
          {testName}
        </span>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-1 min-w-[90px]">
        <span
          className={cn(
            'text-sm font-mono tabular-nums',
            flagInfo ? flagInfo.valueClass : 'text-neutral-800',
          )}
        >
          {value}
        </span>
        {unit && <span className="text-xs text-neutral-400">{unit}</span>}
      </div>

      {/* Reference range */}
      <div className="min-w-[100px] text-xs text-neutral-400">
        {referenceRange ? `Ref: ${referenceRange}` : ''}
      </div>

      {/* Flag */}
      <div className="flex items-center gap-2 min-w-[100px]">
        {flagInfo && (
          <Badge variant={flagInfo.variant} size="sm" dot>
            {flagInfo.label}
          </Badge>
        )}
        {status !== 'final' && (
          <span className="text-xs text-neutral-400 italic">{statusLabels[status]}</span>
        )}
      </div>

      {/* Dates */}
      <div className="text-xs text-neutral-400 min-w-[100px] text-right">
        {resultedAt ? formatDate(resultedAt) : formatDate(collectedAt)}
      </div>

      {/* Chevron for clickable rows */}
      {onSelect && (
        <svg
          className="h-4 w-4 text-neutral-300 flex-shrink-0"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
        </svg>
      )}
    </Tag>
  );
};
