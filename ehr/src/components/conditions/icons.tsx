/** Small additions to the shared stroke-icon set, specific to Conditions. */
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

export const HeartPulseIcon = base(
  <path d="M20.5 8.5c0-2.2-1.8-4-4-4-1.5 0-2.8.8-3.5 2-.7-1.2-2-2-3.5-2-2.2 0-4 1.8-4 4 0 .8.2 1.5.6 2.2H3l2.5 4h2l1.5-3 2 5 2-7 1.5 3H19l1.9-3.2c.4-.6.6-1.3.6-2z" />,
);

export const DropletIcon = base(<path d="M12 2.7C9 6.6 6 10.8 6 14.5a6 6 0 0012 0c0-3.7-3-7.9-6-11.8z" />);

export const UsersIcon = base(
  <>
    <circle cx="9" cy="8" r="3" />
    <path d="M2.5 20c0-3 2.9-5.4 6.5-5.4S15.5 17 15.5 20" />
    <path d="M16.5 9.3a2.7 2.7 0 100-5.4M18.5 20c0-2.5-1.9-4.6-4.5-5.2" />
  </>,
);

export const HistoryIcon = base(
  <>
    <path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.4" />
    <path d="M3 4v4.4h4.4M12 7v5l3.5 2" />
  </>,
);

export const ListChecksIcon = base(
  <>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />
  </>,
);

export const ShieldCheckIcon = base(
  <>
    <path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z" />
    <path d="M9 12.2l2 2 4-4.4" />
  </>,
);
