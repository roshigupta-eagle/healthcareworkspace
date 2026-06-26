'use client';

import React from 'react';
import AnimatedLink from '@/components/AnimatedLink';

type Props = {
  href: string;
  title: string;
  value?: string;
  description?: string;
};

export default function LinkCard({ href, title, value, description }: Props) {
  return (
    <AnimatedLink href={href} className="block">
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition transform hover:-translate-y-1">
        <div className="flex items-start justify-between">
          <h3 className="text-sm font-medium text-sky-600 dark:text-sky-300">{title}</h3>
        </div>

        <p className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white">{value ?? '—'}</p>

        {description && <p className="mt-2 text-sm text-gray-500 dark:text-slate-300">{description}</p>}
      </div>
    </AnimatedLink>
  );
}
