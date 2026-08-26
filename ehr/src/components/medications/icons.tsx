/** Small additions to the shared stroke-icon set, specific to Medication History. */
import React from 'react';

type IconProps = { className?: string; size?: number };

function base(paths: React.ReactNode) {
  return function Icon({ className = '', size = 16 }: IconProps) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
        {paths}
      </svg>
    );
  };
}

export const PillIcon = base(
  <>
    <rect x="4" y="10.3" width="16" height="7.4" rx="3.7" transform="rotate(-45 12 14)" />
    <path d="M9.5 9.5l5 5" />
  </>,
);

export const ShieldCheckIcon = base(
  <>
    <path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z" />
    <path d="M9 12.2l2 2 4-4.4" />
  </>,
);

export const RefreshCwIcon = base(
  <>
    <path d="M20 8a8 8 0 00-14-4.9M4 4v4h4" />
    <path d="M4 16a8 8 0 0014 4.9M20 20v-4h-4" />
  </>,
);

export const ClipboardCheckIcon = base(
  <>
    <rect x="5" y="4.5" width="14" height="17" rx="1.5" />
    <path d="M9 4.5V3.8a1.3 1.3 0 011.3-1.3h3.4A1.3 1.3 0 0115 3.8v.7" />
    <path d="M9 13l2 2 4-4.5" />
  </>,
);

export const HistoryIcon = base(
  <>
    <path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.4" />
    <path d="M3 4v4.4h4.4M12 7v5l3.5 2" />
  </>,
);

export const UserIcon = base(
  <>
    <circle cx="12" cy="8" r="3.4" />
    <path d="M5 20c0-3.6 3.1-6.2 7-6.2s7 2.6 7 6.2" />
  </>,
);
