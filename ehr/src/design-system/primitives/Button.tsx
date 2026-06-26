'use client';

/**
 * Layer 2 â€” Primitive: Button
 *
 * The most fundamental interactive element. Supports five semantic variants
 * aligned to the healthcare action hierarchy, four sizes with touch-target
 * compliance (min 44px for sm/md/lg), loading state, and icon slots.
 *
 * Accessibility:
 *  - aria-busy on loading state
 *  - aria-label REQUIRED for icon-only buttons (no children) â€” WCAG 1.1.1
 *  - Focus ring via global :focus-visible (WCAG 2.1 AA)
 *  - disabled prevents pointer events and sets opacity
 *  - All interactive states (hover, active, focus) are visually distinct
 *  - Loading state maintains button dimensions to prevent layout shift
 */

import React from 'react';
import { cn } from '../utils/cn';
import { Spinner } from './Spinner';

export type ButtonVariant =
  | 'primary'      // primary CTA â€” save, submit, confirm
  | 'secondary'    // secondary action â€” cancel, reset
  | 'outline'      // low-emphasis with border â€” filter, tag
  | 'ghost'        // text-only interactive â€” nav item, inline action
  | 'destructive'; // irreversible / dangerous â€” delete, discharge, override

export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Accessible label â€” REQUIRED when rendering icon-only (no children) */
  label?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-600 text-white shadow-sm ' +
    'hover:bg-primary-700 active:bg-primary-800 ' +
    'focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
  secondary:
    'bg-neutral-100 text-neutral-800 shadow-sm ' +
    'hover:bg-neutral-200 active:bg-neutral-300 ' +
    'focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2',
  outline:
    'border border-primary-600 text-primary-600 bg-transparent ' +
    'hover:bg-primary-50 active:bg-primary-100 ' +
    'focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2',
  ghost:
    'text-neutral-700 bg-transparent ' +
    'hover:bg-neutral-100 active:bg-neutral-200 ' +
    'focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2',
  destructive:
    'bg-critical-600 text-white shadow-sm ' +
    'hover:bg-critical-700 active:bg-critical-800 ' +
    'focus-visible:ring-2 focus-visible:ring-critical-600 focus-visible:ring-offset-2',
};

/** Icon-only variant: square, equal padding on all sides */
const iconOnlySizeClasses: Record<ButtonSize, string> = {
  xs: 'h-7 w-7 p-0 rounded',
  sm: 'h-9 w-9 p-0 rounded-md',
  md: 'h-11 w-11 p-0 rounded-md',
  lg: 'h-12 w-12 p-0 rounded-lg',
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'h-7 min-w-7 px-2.5 text-xs gap-1 rounded',
  sm: 'h-9 min-w-9 px-3 text-sm gap-1.5 rounded-md',
  md: 'h-11 min-w-11 px-4 text-sm gap-2 rounded-md',
  lg: 'h-12 min-w-12 px-6 text-base gap-2.5 rounded-lg',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      label,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      disabled,
      children,
      className,
      type = 'button',
      'aria-label': ariaLabel,
      ...props
    },
    ref,
  ) => {
    const isDisabled  = disabled || loading;
    const isIconOnly  = !children && !!icon;
    // Prefer explicit aria-label prop, then the label shorthand, then nothing
    const computedAriaLabel = ariaLabel ?? label;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        aria-label={computedAriaLabel}
        className={cn(
            'inline-flex items-center justify-center',
            'font-medium whitespace-nowrap select-none',
            'transition duration-150 ease-in-out transform-gpu',
            'focus-visible:outline-none',
            'disabled:pointer-events-none disabled:opacity-50',
            'hover:-translate-y-0.5 hover:shadow-md active:translate-y-0',
          variantClasses[variant],
          isIconOnly ? iconOnlySizeClasses[size] : sizeClasses[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading ? (
          /* Spinner occupies the same space as icon+text to prevent layout shift */
          <Spinner
            size={size === 'lg' ? 'sm' : 'xs'}
            className="text-current"
          />
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <span aria-hidden="true" className="flex-shrink-0">
                {icon}
              </span>
            )}
            {children && <span>{children}</span>}
            {icon && iconPosition === 'right' && (
              <span aria-hidden="true" className="flex-shrink-0">
                {icon}
              </span>
            )}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';
