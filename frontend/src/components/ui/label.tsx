import type { LabelHTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn('text-sm font-semibold leading-none tracking-[0.01em] text-foreground/90', className)}
      {...props}
    />
  )
}

export { Label }
