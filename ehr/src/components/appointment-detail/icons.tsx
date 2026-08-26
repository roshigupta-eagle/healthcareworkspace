/**
 * Small, consistent stroke-icon set for Appointment Detail. One visual
 * language (24x24 viewbox, 1.5 stroke, currentColor) instead of mixing
 * raw emoji with icon fonts — gives a friendly, non-childish feel.
 */
import React from 'react';

type IconProps = { className?: string; size?: number };

function base(paths: React.ReactNode) {
  return function Icon({ className = '', size = 16 }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        {paths}
      </svg>
    );
  };
}

export const CalendarIcon = base(
  <>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M8 3v4M16 3v4M3 10h18" />
  </>,
);

export const ClockIcon = base(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.5 2" />
  </>,
);

export const DoctorIcon = base(
  <>
    <circle cx="12" cy="8" r="3.2" />
    <path d="M4.5 20c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" />
  </>,
);

export const PinIcon = base(
  <>
    <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.3" />
  </>,
);

export const NoteIcon = base(
  <>
    <path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
    <path d="M14 3.5V8h4M9 12.5h6M9 16h6" />
  </>,
);

export const CheckCircleIcon = base(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.2 12.4l2.6 2.6 5-5.4" />
  </>,
);

export const AlertTriangleIcon = base(
  <>
    <path d="M10.6 3.9 2.9 18a1.6 1.6 0 0 0 1.4 2.4h15.4a1.6 1.6 0 0 0 1.4-2.4L13.4 3.9a1.6 1.6 0 0 0-2.8 0z" />
    <path d="M12 9.5v4.2M12 17h.01" />
  </>,
);

export const MessageIcon = base(
  <>
    <path d="M4 5.5h16v10a1 1 0 0 1-1 1H8l-4 4v-15z" />
  </>,
);

export const TargetIcon = base(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r="0.8" fill="currentColor" />
  </>,
);

export const SparklesIcon = base(
  <>
    <path d="M12 3.5l1.6 4.1L18 9l-4.4 1.4L12 14.5l-1.6-4.1L6 9l4.4-1.4L12 3.5z" />
    <path d="M19 15l.7 1.8L21.5 17.5l-1.8.7L19 20l-.7-1.8-1.8-.7 1.8-.7L19 15z" />
  </>,
);

export const PrintIcon = base(
  <>
    <path d="M6 9V4h12v5" />
    <rect x="4.5" y="9" width="15" height="7" rx="1.2" />
    <path d="M6 15v5h12v-5" />
  </>,
);

export const CopyIcon = base(
  <>
    <rect x="8.5" y="8.5" width="11" height="11" rx="1.5" />
    <path d="M5.5 15.5h-1a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v1" />
  </>,
);

export const SendIcon = base(
  <>
    <path d="M20.5 3.5 3 10.3l6.4 2.6 2.6 6.4 8.5-15.8z" />
    <path d="M9.4 12.9 20.5 3.5" />
  </>,
);

export const PlusIcon = base(<path d="M12 5v14M5 12h14" />);

export const XIcon = base(<path d="M6 6l12 12M18 6L6 18" />);

export const ChevronDownIcon = base(<path d="M6 9l6 6 6-6" />);

export const ChevronUpIcon = base(<path d="M18 15l-6-6-6 6" />);

export const ArrowUpIcon = base(<path d="M12 19V5M6 11l6-6 6 6" />);

export const ArrowDownIcon = base(<path d="M12 5v14M6 13l6 6 6-6" />);

export const CalendarPlusIcon = base(
  <>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M8 3v4M16 3v4M3 10h18M12 13v6M9 16h6" />
  </>,
);
