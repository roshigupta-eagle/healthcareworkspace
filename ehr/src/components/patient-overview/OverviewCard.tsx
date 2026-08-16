import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRightIcon } from './icons';

export function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 rounded"
    >
      {label}
      <ArrowRightIcon className="w-3.5 h-3.5" />
    </Link>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p role="status" className="text-sm text-gray-500 py-2">
      {message}
    </p>
  );
}

export function OverviewCard({
  title,
  subtitle,
  icon,
  footer,
  children,
  className = '',
  id,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-heading` : undefined}
      className={`h-full flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6 ${className}`}
    >
      <header className="flex items-start gap-2.5 mb-3">
        {icon && (
          <span className="mt-0.5 text-teal-600 flex-shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h3 id={id ? `${id}-heading` : undefined} className="text-[15px] md:text-base font-semibold text-gray-900 leading-snug">
            {title}
          </h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </header>
      <div className="flex-1 min-w-0">{children}</div>
      {footer && <footer className="mt-4 pt-3 border-t border-gray-100">{footer}</footer>}
    </section>
  );
}
