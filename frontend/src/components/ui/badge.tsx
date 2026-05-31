import * as React from 'react'
import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'muted'

const variants: Record<BadgeVariant, string> = {
  default: 'border-zinc-700 bg-zinc-900 text-zinc-200',
  success: 'border-emerald-900 bg-emerald-950/50 text-emerald-200',
  warning: 'border-amber-900 bg-amber-950/50 text-amber-200',
  muted: 'border-zinc-800 bg-zinc-950 text-zinc-500',
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn('inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium', variants[variant], className)}
      {...props}
    />
  )
}
