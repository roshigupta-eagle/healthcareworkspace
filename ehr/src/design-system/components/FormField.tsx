'use client';

/**
 * Layer 3 — Component: FormField
 *
 * Wrapper composing a form control with its label, optional hint text,
 * and validation error. Wires aria-describedby and aria-labelledby
 * correctly so screen readers announce field context automatically.
 *
 * Usage:
 *   <FormField id="mrn" label="MRN" required error={errors.mrn}>
 *     <Input id="mrn" state={errors.mrn ? 'error' : 'default'} />
 *   </FormField>
 */

import React, { useId } from 'react';
import { cn } from '../utils/cn';

export interface FormFieldProps {
  /** Must match the id of the wrapped input */
  id?: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Visually hides the label — use only when context makes it unambiguous */
  hideLabel?: boolean;
  children: React.ReactElement;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  hint,
  error,
  required = false,
  hideLabel = false,
  children,
  className,
}) => {
  const generatedId = useId();
  const fieldId     = id ?? generatedId;
  const hintId      = `${fieldId}-hint`;
  const errorId     = `${fieldId}-error`;

  const describedBy = [
    hint  && hintId,
    error && errorId,
  ]
    .filter(Boolean)
    .join(' ') || undefined;

  const enrichedChild = React.cloneElement(children, {
    id:                 fieldId,
    'aria-describedby': describedBy,
    'aria-required':    required || undefined,
    ...(error ? { state: 'error', 'aria-invalid': true } : {}),
  } as React.HTMLAttributes<HTMLElement>);

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={fieldId}
        className={cn(
          'text-sm font-medium text-neutral-800',
          hideLabel && 'sr-only',
        )}
      >
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-critical-600">
            *
          </span>
        )}
      </label>

      {enrichedChild}

      {hint && !error && (
        <p id={hintId} className="text-xs text-neutral-500">
          {hint}
        </p>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1 text-xs text-critical-700"
        >
          <svg
            className="h-3.5 w-3.5 flex-shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};
