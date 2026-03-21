import { CheckCircle2, Circle, Clock3, Truck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'

import LoadingSpinner from '@/components/shared/LoadingSpinner'
import StatusBadge from '@/components/shared/StatusBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/format'
import { trackOrder } from '@/services/tracking.service'
import { OrderStatus } from '@/types'

const trackingFlow = [
  OrderStatus.PENDING_PAYMENT,
  OrderStatus.CONFIRMED,
  OrderStatus.PICKED_UP,
  OrderStatus.IN_TRANSIT,
  OrderStatus.DELIVERED,
]

function statusIcon(status: OrderStatus, reached: boolean) {
  if (status === OrderStatus.IN_TRANSIT) {
    return <Truck className="h-4 w-4" />
  }

  if (status === OrderStatus.PENDING_PAYMENT) {
    return <Clock3 className="h-4 w-4" />
  }

  if (reached) {
    return <CheckCircle2 className="h-4 w-4" />
  }

  return <Circle className="h-4 w-4" />
}

function TrackingPage() {
  const { trackingNumber = '' } = useParams()

  const trackingQuery = useQuery({
    queryKey: ['tracking', trackingNumber],
    queryFn: () => trackOrder(trackingNumber),
    enabled: Boolean(trackingNumber),
  })

  const activeStatus = trackingQuery.data?.order.status
  const activeIndex = activeStatus ? trackingFlow.indexOf(activeStatus) : -1

  return (
    <div className="mx-auto w-full max-w-3xl space-y-7 py-2">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Track your parcel</h1>
        <p className="text-sm text-muted-foreground">Tracking number: {trackingNumber}</p>
      </div>

      {trackingQuery.isLoading ? <LoadingSpinner /> : null}

      {trackingQuery.isError ? (
        <Card className="border-border/85 bg-card/95">
          <CardContent className="p-6 text-sm text-destructive">
            Order not found for this tracking number.
          </CardContent>
        </Card>
      ) : null}

      {trackingQuery.data ? (
        <>
          <Card className="border-border/85 bg-card/95">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <CardTitle>{trackingQuery.data.order.trackingNumber}</CardTitle>
              <StatusBadge status={trackingQuery.data.order.status} />
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {trackingQuery.data.order.pickupAddress.suburb},{' '}
              {trackingQuery.data.order.pickupAddress.city} →{' '}
              {trackingQuery.data.order.deliveryAddress.suburb},{' '}
              {trackingQuery.data.order.deliveryAddress.city}
            </CardContent>
          </Card>

          <Card className="border-border/85 bg-card/95">
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                {trackingFlow.map((status, index) => {
                  const reached = activeIndex >= index
                  return (
                    <li key={status} className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 rounded-full border p-1.5 ${
                          reached
                            ? 'border-primary/30 bg-primary/15 text-primary'
                            : 'border-border bg-muted text-muted-foreground'
                        }`}
                      >
                        {statusIcon(status, reached)}
                      </div>
                      <div>
                        <p className={`font-medium ${reached ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {status.replaceAll('_', ' ')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {
                            trackingQuery.data.timeline.find((entry) => entry.status === status)
                              ?.timestamp
                              ? formatDateTime(
                                  trackingQuery.data.timeline.find(
                                    (entry) => entry.status === status,
                                  )?.timestamp ?? '',
                                )
                              : 'Pending update'
                          }
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}

export default TrackingPage
