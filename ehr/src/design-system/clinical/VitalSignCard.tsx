'use client';

/**
 * Layer 4 — Clinical Pattern: VitalSignCard
 *
 * Displays a single vital sign measurement with value, unit, reference
 * range, clinical status, timestamp, and trend indicator.
 *
 * Status derivation is the caller's responsibility — the design system
 * renders status-appropriate colour coding but does not encode clinical
 * thresholds (these vary per patient, age, and context).
 *
 * Usage:
 *   <VitalSignCard
 *     name="Blood Pressure"
 *     value="128/84"
 *     unit="mmHg"
 *     referenceRange="<130/80"
 *     status="warning"
 *     trend="rising"
 *     recordedAt="2026-05-31T09:15:00Z"
 *   />
 */

import React from 'react';
import { cn } from '../utils/cn';
import { Badge } from '../primitives/Badge';

export type VitalStatus = 'critical' | 'warning' | 'stable' | 'info' | 'neutral';
export type VitalTrend  = 'rising' | 'falling' | 'stable' | 'unknown';

export interface VitalSignCardProps {
  name: string;
  value: string | number;
  unit?: string;
  referenceRange?: string;
  status?: VitalStatus;
  trend?: VitalTrend;
  recordedAt?: string;
  /** Compact single-row mode for dense dashboards */
  compact?: boolean;
  className?: string;
}

const statusBorderMap: Record<VitalStatus, string> = {
  critical: 'border-l-4 border-l-critical-500',
  warning:  'border-l-4 border-l-warning-500',
  stable:   'border-l-4 border-l-stable-500',
  info:     'border-l-4 border-l-info-500',
  neutral:  'border-l-4 border-l-neutral-300',
};

const statusValueColor: Record<VitalStatus, string> = {
  critical: 'text-critical-700',
  warning:  'text-warning-700',
  stable:   'text-stable-700',
  info:     'text-info-700',
  neutral:  'text-neutral-800',
};

const trendIcons: Record<VitalTrend, React.ReactElement> = {
  rising: (
    <svg className="h-4 w-4 text-warning-600" viewBox="0 0 20 20" fill="currentColor" aria-label="Trend rising">
      <path fillRule="evenodd" d="M12.577 4.878a.75.75 0 01.919-.53l4.78 1.281a.75.75 0 01.531.919l-1.281 4.78a.75.75 0 01-1.449-.387l.81-3.022a19.407 19.407 0 00-5.594 5.203.75.75 0 01-1.139.093L7 10.06l-4.72 4.72a.75.75 0 01-1.06-1.061l5.25-5.25a.75.75 0 011.06 0l3.074 3.073a20.923 20.923 0 015.545-4.931l-3.042-.815a.75.75 0 01-.53-.918z" clipRule="evenodd" />
    </svg>
  ),
  falling: (
    <svg className="h-4 w-4 text-info-600" viewBox="0 0 20 20" fill="currentColor" aria-label="Trend falling">
      <path fillRule="evenodd" d="M1.22 5.222a.75.75 0 011.06 0L7 9.942l3.768-3.769a.75.75 0 011.113.058 20.908 20.908 0 015.5 4.907l.8-3.022a.75.75 0 011.449.387l-1.28 4.779a.75.75 0 01-.919.53l-4.78-1.28a.75.75 0 11.387-1.45l3.001.804A19.407 19.407 0 0012.48 7.39l-3.79 3.79a.75.75 0 01-1.06 0L2.28 5.832l-.013-.013a.75.75 0 01-.047-1.047z" clipRule="evenodd" />
    </svg>
  ),
  stable: (
    <svg className="h-4 w-4 text-stable-600" viewBox="0 0 20 20" fill="currentColor" aria-label="Trend stable">
      <path fillRule="evenodd" d="M2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" clipRule="evenodd" />
    </svg>
  ),
  unknown: (
    <svg className="h-4 w-4 text-neutral-400" viewBox="0 0 20 20" fill="currentColor" aria-label="Trend unknown">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  ),
};

function formatTime(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export const VitalSignCard: React.FC<VitalSignCardProps> = ({
  name,
  value,
  unit,
  referenceRange,
  status = 'neutral',
  trend,
  recordedAt,
  compact = false,
  className,
}) => {
  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 px-3 py-2 bg-white rounded-lg border border-neutral-200',
          statusBorderMap[status],
          className,
        )}
      >
        <div className="min-w-0 flex-1">
          <span className="text-xs text-neutral-500">{name}</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={cn('text-sm font-bold font-mono tabular-nums', statusValueColor[status])}>
            {value}
          </span>
          {unit && <span className="text-xs text-neutral-400">{unit}</span>}
        </div>
        {trend && <span aria-hidden="true">{trendIcons[trend]}</span>}
        {status !== 'neutral' && status !== 'stable' && (
          <Badge variant={status} size="sm">{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-2 p-4 bg-white rounded-xl border border-neutral-200 shadow-xs',
        statusBorderMap[status],
        className,
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          {name}
        </span>
        {status !== 'neutral' && (
          <Badge variant={status} size="sm" dot>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        )}
      </div>

      {/* Value */}
      <div className="flex items-end gap-2">
        <span
          className={cn(
            'text-3xl font-bold font-mono tabular-nums leading-none',
            statusValueColor[status],
          )}
        >
          {value}
        </span>
        {unit && (
          <span className="text-sm text-neutral-400 mb-0.5">{unit}</span>
        )}
        {trend && (
          <span className="mb-0.5 ml-1" aria-hidden="true">
            {trendIcons[trend]}
          </span>
        )}
      </div>

      {/* Reference & timestamp */}
      <div className="flex items-center justify-between gap-2 mt-auto">
        {referenceRange && (
          <span className="text-xs text-neutral-400">Ref: {referenceRange}</span>
        )}
        {recordedAt && (
          <span className="text-xs text-neutral-400 ml-auto">
            {formatTime(recordedAt)}
          </span>
        )}
      </div>
    </div>
  );
};
