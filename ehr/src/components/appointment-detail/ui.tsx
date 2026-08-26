/**
 * Shared visual primitives for Appointment Detail: semantic color tones,
 * badges, section cards and buttons. Kept intentionally small — calm
 * neutral surfaces, sparing color, no gradients/glassmorphism.
 */
import React from 'react';

export type Tone = 'teal' | 'green' | 'amber' | 'red' | 'violet' | 'neutral';

export const toneClasses: Record<Tone, { bg: string; border: string; text: string; icon: string; dot: string }> = {
  teal: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-800', icon: 'text-teal-600', dot: 'bg-teal-500' },
  green: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', icon: 'text-emerald-600', dot: 'bg-emerald-500' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', icon: 'text-amber-600', dot: 'bg-amber-500' },
  red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: 'text-red-600', dot: 'bg-red-500' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-800', icon: 'text-violet-600', dot: 'bg-violet-500' },
  neutral: { bg: 'bg-gray-100', border: 'border-gray-200', text: 'text-gray-700', icon: 'text-gray-500', dot: 'bg-gray-400' },
};

export function Badge({
  tone = 'neutral',
  children,
  className = '',
  dot = false,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  const t = toneClasses[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${t.bg} ${t.border} ${t.text} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} aria-hidden="true" />}
      {children}
    </span>
  );
}

export function SectionCard({
  title,
  icon,
  eyebrow,
  headerRight,
  emphasis = false,
  children,
  className = '',
  bodyClassName = '',
  id,
}: {
  title?: string;
  icon?: React.ReactNode;
  eyebrow?: string;
  headerRight?: React.ReactNode;
  emphasis?: boolean;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`bg-white rounded-[14px] border ${emphasis ? 'border-teal-200 ring-1 ring-teal-100' : 'border-[#E4EAF0]'} shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5 sm:p-6 ${className}`}
    >
      {(title || headerRight) && (
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            {eyebrow && <div className="text-[11px] font-semibold tracking-wide uppercase text-gray-400 mb-0.5">{eyebrow}</div>}
            {title && (
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#121A2D]">
                {icon && <span className="text-gray-400" aria-hidden="true">{icon}</span>}
                {title}
              </h2>
            )}
          </div>
          {headerRight}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost' | 'ai';
type ButtonSize = 'sm' | 'md';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-teal-700 text-white hover:bg-teal-800 border border-teal-700 shadow-sm',
  secondary: 'bg-white text-[#1E4B6E] border border-[#DDE7F0] hover:bg-[#F3F8FB]',
  destructive: 'bg-white text-red-600 border border-red-200 hover:bg-red-50',
  ghost: 'bg-transparent text-gray-600 hover:bg-gray-100 border border-transparent',
  ai: 'bg-white text-violet-700 border border-violet-200 hover:bg-violet-50',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
};

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; icon?: React.ReactNode }>(
  ({ variant = 'secondary', size = 'md', icon, children, className = '', ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-1 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

export function EmptyRow({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-gray-400 italic py-2">{children}</div>;
}
