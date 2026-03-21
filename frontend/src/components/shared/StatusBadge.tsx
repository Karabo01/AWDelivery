import { Badge } from '@/components/ui/badge'
import { OrderStatus } from '@/types'

type StatusBadgeProps = {
  status: OrderStatus
}

const statusClassMap: Record<OrderStatus, string> = {
  [OrderStatus.PENDING_PAYMENT]: 'border-border bg-secondary text-secondary-foreground',
  [OrderStatus.CONFIRMED]: 'border-primary/35 bg-primary/15 text-primary',
  [OrderStatus.PICKUP_SCHEDULED]: 'border-border bg-accent text-accent-foreground',
  [OrderStatus.PICKED_UP]: 'border-border bg-muted text-muted-foreground',
  [OrderStatus.IN_TRANSIT]: 'border-primary/35 bg-primary/15 text-primary',
  [OrderStatus.DELIVERED]: 'border-foreground bg-foreground text-background',
  [OrderStatus.FAILED]: 'border-destructive/35 bg-destructive/10 text-destructive',
  [OrderStatus.DELAYED]: 'border-border bg-secondary text-secondary-foreground',
}

function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge className={statusClassMap[status]}>
      {status.replaceAll('_', ' ')}
    </Badge>
  )
}

export default StatusBadge
