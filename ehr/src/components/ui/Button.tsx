"use client"

import React from 'react'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
  className?: string
}

export default function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-md text-sm'
  let variantClass = ''
  if (variant === 'primary') variantClass = 'cal-primary-btn px-4 py-2'
  if (variant === 'secondary') variantClass = 'border px-4 py-2 bg-white'
  if (variant === 'ghost') variantClass = 'bg-white border px-3 py-1'

  return (
    <button className={`${base} ${variantClass} ${className}`.trim()} {...rest}>
      {children}
    </button>
  )
}
