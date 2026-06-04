'use client';

/**
 * Layer 2 — Primitive: Text
 *
 * Polymorphic typography component. Covers the full typographic scale
 * defined in tokens/typography.ts and renders the semantically correct
 * HTML element by default (h1–h4, p, span, label, code).
 *
 * Usage:
 *   <Text variant="heading2">Patient Summary</Text>
 *   <Text variant="body" color="muted">Last updated 2 hours ago</Text>
 *   <Text variant="overline" as="dt">Blood Pressure</Text>
 *   <Text variant="clinicalValue" as="dd">120/80 mmHg</Text>
 */

import React from 'react';
import { cn } from '../utils/cn';

export type TextVariant =
  | 'display'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'body'
  | 'body-sm'
  | 'caption'
  | 'overline'
  | 'label'
  | 'code'
  | 'clinicalValue'; // monospaced numeric — for vitals, lab results, dosages

export type TextColor =
  | 'primary'    // default — high-contrast body text
  | 'secondary'  // supporting text
  | 'muted'      // de-emphasised, timestamps, metadata
  | 'disabled'   // non-interactive labels
  | 'inverse'    // white — use on dark surfaces
  | 'link'       // hyperlink/action text
  | 'critical'   // critical value or alert label
  | 'warning'    // caution value
  | 'stable'     // normal/healthy value
  | 'info';      // informational

type AsProp =
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'p' | 'span' | 'div' | 'label' | 'dt' | 'dd'
  | 'li' | 'caption' | 'code' | 'pre' | 'strong' | 'em';

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  variant?: TextVariant;
  color?: TextColor;
  as?: AsProp;
  truncate?: boolean;
  srOnly?: boolean;
}

const variantClasses: Record<TextVariant, string> = {
  display:       'text-4xl font-bold   tracking-tight leading-tight',
  heading1:      'text-3xl font-bold   tracking-tight leading-tight',
  heading2:      'text-2xl font-semibold tracking-tight leading-snug',
  heading3:      'text-xl  font-semibold leading-snug',
  heading4:      'text-lg  font-semibold leading-snug',
  body:          'text-sm  font-normal  leading-normal',
  'body-sm':     'text-xs  font-normal  leading-normal',
  caption:       'text-xs  font-normal  leading-normal',
  overline:      'text-xs  font-semibold uppercase tracking-widest leading-none',
  label:         'text-sm  font-medium  leading-none',
  code:          'text-sm  font-normal  font-mono leading-relaxed',
  clinicalValue: 'text-sm  font-medium  font-mono leading-none tabular-nums',
};

const colorClasses: Record<TextColor, string> = {
  primary:   'text-neutral-900',
  secondary: 'text-neutral-700',
  muted:     'text-neutral-500',
  disabled:  'text-neutral-400',
  inverse:   'text-white',
  link:      'text-primary-600',
  critical:  'text-critical-700',
  warning:   'text-warning-700',
  stable:    'text-stable-700',
  info:      'text-info-700',
};

const defaultElements: Record<TextVariant, AsProp> = {
  display:       'h1',
  heading1:      'h1',
  heading2:      'h2',
  heading3:      'h3',
  heading4:      'h4',
  body:          'p',
  'body-sm':     'p',
  caption:       'span',
  overline:      'span',
  label:         'span',
  code:          'code',
  clinicalValue: 'span',
};

export const Text: React.FC<TextProps> = ({
  variant = 'body',
  color = 'primary',
  as,
  truncate = false,
  srOnly = false,
  children,
  className,
  ...props
}) => {
  const Component = as ?? defaultElements[variant];

  return (
    <Component
      className={cn(
        variantClasses[variant],
        colorClasses[color],
        truncate && 'truncate',
        srOnly    && 'sr-only',
        className,
      )}
      {...(props as React.HTMLAttributes<HTMLElement>)}
    >
      {children}
    </Component>
  );
};
