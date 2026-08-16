import type { SVGProps } from 'react';

function IconBase(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.6}
      stroke="currentColor"
      aria-hidden="true"
      {...props}
    />
  );
}

export function SparkleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15z" />
    </IconBase>
  );
}

export function ActivityIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h4l2-7 4 14 2-7h6" />
    </IconBase>
  );
}

export function HistoryIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 109-9 9 9 0 00-6.36 2.64L3 8" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4v4h4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
    </IconBase>
  );
}

export function ShieldAlertIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.5h.01" />
    </IconBase>
  );
}

export function ClipboardCheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="6" y="4" width="12" height="17" rx="1.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 13l2 2 4-4" />
    </IconBase>
  );
}

export function CalendarClockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="18" height="15" rx="1.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9h18M8 3v4M16 3v4" />
      <circle cx="15.5" cy="14.5" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 13v1.5l1 1" />
    </IconBase>
  );
}

export function HeartPulseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20s-7-4.35-9.5-9A5.5 5.5 0 0112 6.5 5.5 5.5 0 0121.5 11c-.7 1.4-1.7 2.7-2.9 4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h3l1.5-3 2 5 1.5-3H17" />
    </IconBase>
  );
}

export function TestTubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 2h6M10 2v12.5a4 4 0 108 0V2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14h5" />
    </IconBase>
  );
}

export function FileTextIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 16h6M9 8h2" />
    </IconBase>
  );
}

export function PillIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="3.5" y="9" width="17" height="7" rx="3.5" transform="rotate(-45 12 12)" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l6 6" />
    </IconBase>
  );
}

export function SyringeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 4l-3 3M17.5 6.5L8 16l-1 4 4-1 9.5-9.5-3-3zM12 12l3 3" />
    </IconBase>
  );
}

export function CalendarIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="18" height="15" rx="1.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9h18M8 3v4M16 3v4" />
    </IconBase>
  );
}

export function FileIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" />
    </IconBase>
  );
}

export function ClipboardWarningIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect x="6" y="4" width="12" height="17" rx="1.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v3.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5h.01" />
    </IconBase>
  );
}

export function UsersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="9" cy="8" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 20a5.5 5.5 0 0111 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 20a4.5 4.5 0 018.5-2" />
    </IconBase>
  );
}

export function ArrowRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L13.586 11H4a1 1 0 110-2h9.586l-3.293-3.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
  );
}

export function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" {...props}>
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  );
}
