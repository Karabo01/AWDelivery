import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils'

function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[0.69rem] font-semibold uppercase tracking-[0.06em] transition-colors',
        className,
      )}
      {...props}
    />
  )
}

export { Badge }
