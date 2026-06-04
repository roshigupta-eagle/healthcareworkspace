'use client';

/**
 * Layer 4 — Clinical Pattern: PatientBanner
 *
 * Persistent patient identity bar rendered at the top of every patient
 * chart view. Provides minimum necessary demographic identifiers for
 * safe clinical context: full name, date of birth, age, sex, MRN, and
 * allergy / isolation precaution indicators.
 *
 * Clinical safety ordering (left → right priority):
 *   1. Allergy flags — highest patient safety risk, always leftmost
 *   2. Patient name + DOB/age/sex — primary identity
 *   3. Isolation precautions — infection control, near identity
 *   4. MRN + additional identifiers — secondary reference
 *   5. Patient verification status — confirmed / unverified
 *
 * Design rules:
 *  - Always visible while viewing patient data (sticky via parent layout)
 *  - Allergy flags MUST be shown first and use critical coloring
 *  - "No Known Allergies" confirmation shown when allergies array is empty
 *  - Unverified identity state renders a visible warning strip
 *  - WCAG 2.1 AA: color + text + icon for all status signals
 */

import React from 'react';
import { cn } from '../utils/cn';
import { Badge } from '../primitives/Badge';

export type IsolationPrecaution =
  | 'contact'
  | 'droplet'
  | 'airborne'
  | 'protective'
  | 'enhanced-contact';

export type PatientVerificationStatus =
  | 'verified'    // patient positively identified before clinical actions
  | 'unverified'  // identity not yet confirmed — warn clinician
  | 'none';       // verification not applicable / not tracked

export interface PatientBannerProps {
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;           // ISO 8601 (YYYY-MM-DD)
  age: number;
  sex: 'Male' | 'Female' | 'Other' | 'Unknown';
  allergies?: string[];
  isolationPrecautions?: IsolationPrecaution[];
  /** Optional additional identifiers (e.g. Health Card No., provincial ID) */
  identifiers?: Array<{ label: string; value: string }>;
  verificationStatus?: PatientVerificationStatus;
  /** Callback when clinician verifies patient identity */
  onVerify?: () => void;
  className?: string;
}

const precautionLabels: Record<IsolationPrecaution, string> = {
  contact:            'Contact Precautions',
  droplet:            'Droplet Precautions',
  airborne:           'Airborne Precautions',
  protective:         'Protective Isolation',
  'enhanced-contact': 'Enhanced Contact',
};

function formatDOB(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString('en-CA', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

export const PatientBanner: React.FC<PatientBannerProps> = ({
  mrn,
  firstName,
  lastName,
  dateOfBirth,
  age,
  sex,
  allergies = [],
  isolationPrecautions = [],
  identifiers = [],
  verificationStatus = 'none',
  onVerify,
  className,
}) => (
  <div
    role="region"
    aria-label="Patient identification banner"
    className={cn(
      'flex flex-col bg-white border-b border-neutral-200 shadow-xs',
      className,
    )}
  >
    {/* Unverified patient warning strip */}
    {verificationStatus === 'unverified' && (
      <div
        role="alert"
        className="flex items-center gap-2 bg-warning-100 border-b border-warning-300 px-5 py-1.5"
      >
        <svg className="h-4 w-4 text-warning-700 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
        <span className="text-xs font-semibold text-warning-800">
          Patient identity not yet verified — confirm before performing clinical actions
        </span>
        {onVerify && (
          <button
            type="button"
            onClick={onVerify}
            className="ml-2 rounded px-2 py-0.5 text-xs font-semibold text-warning-900 underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning-600"
          >
            Mark as Verified
          </button>
        )}
      </div>
    )}

    {/* Main banner row */}
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3">

      {/* ── 1. ALLERGY FLAGS (highest priority — leftmost) ── */}
      <div
        className="flex items-center gap-2 flex-shrink-0"
        aria-label={allergies.length > 0 ? `Allergies: ${allergies.join(', ')}` : 'No known allergies'}
      >
        {allergies.length > 0 ? (
          <>
            <svg
              className="h-4 w-4 text-critical-600 flex-shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <div className="flex flex-wrap gap-1" role="list" aria-label="Allergy list">
              {allergies.map((allergen) => (
                <span key={allergen} role="listitem">
                  <Badge variant="critical" dot>{allergen}</Badge>
                </span>
              ))}
            </div>
          </>
        ) : (
          <Badge variant="stable">No Known Allergies</Badge>
        )}
      </div>

      <div className="h-8 w-px bg-neutral-200 hidden sm:block flex-shrink-0" aria-hidden="true" />

      {/* ── 2. PATIENT NAME + DEMOGRAPHICS ── */}
      <div className="flex flex-col min-w-0">
        <span className="text-base font-bold text-neutral-900 leading-tight">
          {lastName.toUpperCase()}, {firstName}
        </span>
        <span className="text-xs text-neutral-500 mt-0.5">
          DOB: {formatDOB(dateOfBirth)} &bull; Age {age} &bull; {sex}
        </span>
      </div>

      {/* ── 3. ISOLATION PRECAUTIONS ── */}
      {isolationPrecautions.length > 0 && (
        <>
          <div className="h-8 w-px bg-neutral-200 hidden sm:block flex-shrink-0" aria-hidden="true" />
          <div className="flex flex-wrap gap-1" role="list" aria-label="Isolation precautions">
            {isolationPrecautions.map((p) => (
              <span key={p} role="listitem">
                <Badge variant="warning" dot>{precautionLabels[p]}</Badge>
              </span>
            ))}
          </div>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" aria-hidden="true" />

      {/* ── 4. MRN + SECONDARY IDENTIFIERS ── */}
      <div className="flex items-center gap-5 flex-shrink-0">
        <div className="flex flex-col">
          <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">MRN</span>
          <span className="text-sm font-semibold text-neutral-900 font-mono tracking-wider">{mrn}</span>
        </div>
        {identifiers.map((id) => (
          <React.Fragment key={id.label}>
            <div className="h-8 w-px bg-neutral-200 hidden sm:block" aria-hidden="true" />
            <div className="flex flex-col">
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{id.label}</span>
              <span className="text-sm font-semibold text-neutral-900 font-mono tracking-wider">{id.value}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* ── 5. VERIFICATION STATUS BADGE ── */}
      {verificationStatus === 'verified' && (
        <div
          aria-label="Patient identity verified"
          className="flex items-center gap-1 flex-shrink-0"
        >
          <svg className="h-4 w-4 text-stable-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
          <span className="text-xs font-medium text-stable-700">Verified</span>
        </div>
      )}
    </div>
  </div>
);
