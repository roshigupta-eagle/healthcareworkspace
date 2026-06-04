'use client';

/**
 * Layer 4 — Clinical Pattern: ClinicalAlert
 *
 * High-priority clinical decision support (CDS) alert. Renders inline
 * within clinical workflows for:
 *  - Drug–drug interactions
 *  - Drug–allergy contraindications
 *  - Clinical guideline recommendations
 *  - Duplicate therapy warnings
 *  - Dose range checks
 *
 * Differs from the generic Alert component:
 *  - Mandatory action buttons (acknowledge / override / cancel)
 *  - Override requires a documented reason (reason input shown inline)
 *  - Critical/high severity cannot be dismissed without acknowledgement
 *  - Audit trail metadata (alert type, rule ID) for downstream logging
 *
 * Accessibility:
 *  - role="alertdialog" for modal-level CDS prompts
 *  - Focus moves to the primary action button on mount
 */

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../utils/cn';
import { Button } from '../primitives/Button';
import { Badge } from '../primitives/Badge';

export type ClinicalAlertType =
  | 'drug-drug'
  | 'drug-allergy'
  | 'dose-range'
  | 'duplicate-therapy'
  | 'guideline-recommendation'
  | 'contraindication';

export type ClinicalAlertSeverity = 'critical' | 'high' | 'moderate' | 'low' | 'info';

/** Audit metadata automatically captured with every acknowledge/override action. */
export interface ClinicalAlertAuditMetadata {
  /** ISO-8601 timestamp at the moment of action */
  timestamp: string;
  /** Alert type for downstream audit logging */
  alertType: ClinicalAlertType;
  /** Severity level at time of action */
  severity: ClinicalAlertSeverity;
  /** Rule/FHIR DetectedIssue ID if provided */
  ruleId?: string;
}

export interface ClinicalAlertProps {
  alertType: ClinicalAlertType;
  severity: ClinicalAlertSeverity;
  title: string;
  message: string;
  /** Clinical detail / evidence link */
  detail?: string;
  /** FHIR DetectedIssue / internal rule ID for audit */
  ruleId?: string;
  /** Called with audit metadata when clinician acknowledges */
  onAcknowledge?: (metadata: ClinicalAlertAuditMetadata) => void;
  /** Called with override reason and audit metadata */
  onOverride?: (reason: string, metadata: ClinicalAlertAuditMetadata) => void;
  onCancel?: () => void;
  /** Whether this alert requires an override reason before proceeding */
  requireOverrideReason?: boolean;
  className?: string;
}

const severityConfig: Record<
  ClinicalAlertSeverity,
  { container: string; header: string; badge: 'critical' | 'warning' | 'info' | 'neutral' }
> = {
  critical: { container: 'border-critical-400 bg-critical-50',  header: 'bg-critical-100',  badge: 'critical' },
  high:     { container: 'border-warning-400  bg-warning-50',   header: 'bg-warning-100',   badge: 'warning' },
  moderate: { container: 'border-warning-300  bg-warning-50',   header: 'bg-warning-50',    badge: 'warning' },
  low:      { container: 'border-info-300     bg-info-50',      header: 'bg-info-50',       badge: 'info' },
  info:     { container: 'border-neutral-300  bg-neutral-50',   header: 'bg-neutral-100',   badge: 'neutral' },
};

const alertTypeLabels: Record<ClinicalAlertType, string> = {
  'drug-drug':                'Drug–Drug Interaction',
  'drug-allergy':             'Drug–Allergy Contraindication',
  'dose-range':               'Dose Range Check',
  'duplicate-therapy':        'Duplicate Therapy',
  'guideline-recommendation': 'Clinical Guideline',
  'contraindication':         'Contraindication',
};

export const ClinicalAlert: React.FC<ClinicalAlertProps> = ({
  alertType,
  severity,
  title,
  message,
  detail,
  ruleId,
  onAcknowledge,
  onOverride,
  onCancel,
  requireOverrideReason = severity === 'critical' || severity === 'high',
  className,
}) => {
  const [showOverrideInput, setShowOverrideInput] = useState(false);
  const [overrideReason,    setOverrideReason]    = useState('');
  const primaryBtnRef = useRef<HTMLButtonElement>(null);
  const cfg = severityConfig[severity];

  /** Builds an audit metadata snapshot at the current instant. */
  const buildMetadata = (): ClinicalAlertAuditMetadata => ({
    timestamp: new Date().toISOString(),
    alertType,
    severity,
    ruleId,
  });

  useEffect(() => {
    primaryBtnRef.current?.focus();
  }, []);

  const handleOverrideSubmit = () => {
    if (!overrideReason.trim()) return;
    onOverride?.(overrideReason.trim(), buildMetadata());
  };

  return (
    <div
      role="alertdialog"
      aria-live={severity === 'critical' ? 'assertive' : 'polite'}
      aria-atomic="true"
      aria-label={`${severityConfig[severity].badge.toUpperCase()} — ${title}`}
      className={cn(
        'rounded-xl border-2 overflow-hidden shadow-md',
        cfg.container,
        className,
      )}
    >
      {/* Header */}
      <div className={cn('flex items-center justify-between gap-3 px-4 py-3', cfg.header)}>
        <div className="flex items-center gap-2">
          {/* Warning icon */}
          <svg
            className={cn(
              'h-5 w-5 flex-shrink-0',
              severity === 'critical' || severity === 'high'
                ? 'text-critical-600'
                : 'text-warning-600',
            )}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-semibold text-neutral-900">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={cfg.badge} size="sm" dot>
            {severity.charAt(0).toUpperCase() + severity.slice(1)}
          </Badge>
          <span className="text-xs text-neutral-500">{alertTypeLabels[alertType]}</span>
          {ruleId && (
            <span className="text-xs text-neutral-400 font-mono">#{ruleId}</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        <p className="text-sm text-neutral-800">{message}</p>
        {detail && (
          <p className="mt-2 text-xs text-neutral-500 border-l-2 border-neutral-300 pl-3">
            {detail}
          </p>
        )}
      </div>

      {/* Override reason input */}
      {showOverrideInput && (
        <div className="px-4 pb-3">
          <label className="block text-xs font-medium text-neutral-700 mb-1">
            Override reason <span aria-hidden="true" className="text-critical-600">*</span>
          </label>
          <textarea
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Document clinical rationale for override…"
            aria-required="true"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600 resize-none"
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-t border-neutral-200 bg-white/60">
        {onAcknowledge && !showOverrideInput && (
          <Button
            ref={primaryBtnRef}
            variant={severity === 'critical' || severity === 'high' ? 'destructive' : 'primary'}
            size="sm"
            onClick={() => onAcknowledge?.(buildMetadata())}
          >
            Acknowledge
          </Button>
        )}

        {onOverride && !showOverrideInput && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (requireOverrideReason) {
                setShowOverrideInput(true);
              } else {
                onOverride?.('', buildMetadata());
              }
            }}
          >
            Override
          </Button>
        )}

        {showOverrideInput && (
          <>
            <Button
              variant="destructive"
              size="sm"
              disabled={!overrideReason.trim()}
              onClick={handleOverrideSubmit}
            >
              Confirm Override
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setShowOverrideInput(false); setOverrideReason(''); }}
            >
              Back
            </Button>
          </>
        )}

        {onCancel && !showOverrideInput && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel Order
          </Button>
        )}
      </div>
    </div>
  );
};
