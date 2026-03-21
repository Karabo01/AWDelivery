import { Badge } from '@/components/ui/badge'
import { OrderStatus } from '@/types'

type StatusBadgeProps = {
  status: OrderStatus
}

const statusClassMap: Record<OrderStatus, string> = {
  [OrderStatus.PENDING_PAYMENT]: 'bg-secondary text-secondary-foreground',
  [OrderStatus.CONFIRMED]: 'bg-primary/15 text-primary border-primary/20',
  [OrderStatus.PICKUP_SCHEDULED]: 'bg-accent text-accent-foreground',
  [OrderStatus.PICKED_UP]: 'bg-muted text-muted-foreground',
  [OrderStatus.IN_TRANSIT]: 'bg-primary/15 text-primary border-primary/20',
  [OrderStatus.DELIVERED]: 'bg-primary text-primary-foreground border-primary',
  [OrderStatus.FAILED]: 'bg-destructive/15 text-destructive border-destructive/30',
  [OrderStatus.DELAYED]: 'bg-secondary text-secondary-foreground',
}

function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge className={statusClassMap[status]}>
      {status.replaceAll('_', ' ')}
    </Badge>
  )
}

export default StatusBadge
