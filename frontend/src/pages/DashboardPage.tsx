import { useQuery } from '@tanstack/react-query'

import LoadingSpinner from '@/components/shared/LoadingSpinner'
import StatusBadge from '@/components/shared/StatusBadge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { formatCentsToZar, formatDateTime } from '@/lib/format'
import { getMyOrders } from '@/services/orders.service'

function DashboardPage() {
  const ordersQuery = useQuery({
    queryKey: ['orders', 'mine'],
    queryFn: () => getMyOrders({ page: 1, pageSize: 20 }),
  })

  return (
    <div className="space-y-6 py-2">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">My orders</h1>
        <p className="text-sm text-muted-foreground">
          Track your latest parcel deliveries and payment status.
        </p>
      </div>

      {ordersQuery.isLoading ? <LoadingSpinner /> : null}

      {ordersQuery.isError ? (
        <p className="text-sm text-destructive">Failed to load orders. Please refresh.</p>
      ) : null}

      {ordersQuery.data && ordersQuery.data.data.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            You have no orders yet.
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4">
        {ordersQuery.data?.data.map((order) => (
          <Card key={order.id}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-base">{order.trackingNumber}</CardTitle>
                <CardDescription>{formatDateTime(order.createdAt)}</CardDescription>
              </div>
              <StatusBadge status={order.status} />
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">From:</span> {order.pickupAddress.suburb},{' '}
                {order.pickupAddress.city}
              </p>
              <p>
                <span className="text-muted-foreground">To:</span> {order.deliveryAddress.suburb},{' '}
                {order.deliveryAddress.city}
              </p>
              <p>
                <span className="text-muted-foreground">Amount:</span>{' '}
                {formatCentsToZar(order.quoteAmount)}
              </p>
              <p>
                <span className="text-muted-foreground">Payment:</span> {order.paymentStatus}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default DashboardPage
