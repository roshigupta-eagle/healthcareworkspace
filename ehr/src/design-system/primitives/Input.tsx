'use client';

/**
 * Layer 2 — Primitive: Input
 *
 * Base text input with healthcare-appropriate validation states.
 * Supports left/right addons (icon, prefix, unit label), four sizes,
 * and four visual states for clinical form validation feedback.
 *
 * Accessibility:
 *  - Always use with <FormField> for associated <label> and error messaging
 *  - aria-invalid is set automatically when state === 'error'
 *  - aria-describedby wired via FormField
 */

import React from 'react';
import { cn } from '../utils/cn';

export type InputSize  = 'sm' | 'md' | 'lg';
export type InputState = 'default' | 'error' | 'warning' | 'success';

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  inputSize?: InputSize;
  state?: InputState;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  fullWidth?: boolean;
}

const stateClasses: Record<InputState, string> = {
  default: 'border-neutral-300 focus:border-primary-600 focus:ring-primary-600',
  error:   'border-critical-500 focus:border-critical-600 focus:ring-critical-600',
  warning: 'border-warning-500  focus:border-warning-600  focus:ring-warning-600',
  success: 'border-stable-500   focus:border-stable-600   focus:ring-stable-600',
};

const sizeClasses: Record<InputSize, string> = {
  sm: 'h-8  px-3 text-xs',
  md: 'h-10 px-3 text-sm',
  lg: 'h-12 px-4 text-base',
};

const addonSizeClasses: Record<InputSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      inputSize = 'md',
      state = 'default',
      leftAddon,
      rightAddon,
      fullWidth = false,
      className,
      'aria-invalid': ariaInvalid,
      ...props
    },
    ref,
  ) => (
    <div className={cn('relative inline-flex items-center', fullWidth && 'w-full')}>
      {leftAddon && (
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute left-3 flex items-center text-neutral-400',
            addonSizeClasses[inputSize],
          )}
        >
          {leftAddon}
        </span>
      )}

      <input
        ref={ref}
        aria-invalid={ariaInvalid ?? (state === 'error' ? true : undefined)}
        className={cn(
          'block w-full rounded-md border bg-white',
          'text-neutral-900 placeholder:text-neutral-400',
          'transition-colors duration-[100ms]',
          'focus:outline-none focus:ring-2 focus:ring-offset-0',
          'read-only:bg-neutral-50 read-only:text-neutral-600',
          'disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400',
          stateClasses[state],
          sizeClasses[inputSize],
          leftAddon  ? 'pl-9' : undefined,
          rightAddon ? 'pr-9' : undefined,
          !fullWidth && 'w-auto',
          className,
        )}
        {...props}
      />

      {rightAddon && (
        <span
          aria-hidden="true"
          className={cn(
            'pointer-events-none absolute right-3 flex items-center text-neutral-400',
            addonSizeClasses[inputSize],
          )}
        >
          {rightAddon}
        </span>
      )}
    </div>
  ),
);

Input.displayName = 'Input';
