import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { getOrders, getDrivers, updateOrderStatus, assignDriver } from '@/services/admin.service'
import { OrderStatus, PaymentStatus } from '@/types/order.types'
import { formatCentsToZar } from '@/lib/format'
import type { Order } from '@/types/order.types'
import type { Driver } from '@/types/driver.types'
import PodPanel from '@/components/admin/PodPanel'

const STATUS_OPTIONS = Object.values(OrderStatus)

const STATUS_COLORS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING_PAYMENT]: 'bg-yellow-500/20 text-yellow-600',
  [OrderStatus.CONFIRMED]: 'bg-blue-500/20 text-blue-600',
  [OrderStatus.PICKUP_SCHEDULED]: 'bg-purple-500/20 text-purple-600',
  [OrderStatus.PICKED_UP]: 'bg-indigo-500/20 text-indigo-600',
  [OrderStatus.IN_TRANSIT]: 'bg-cyan-500/20 text-cyan-600',
  [OrderStatus.DELIVERED]: 'bg-green-500/20 text-green-600',
  [OrderStatus.FAILED]: 'bg-red-500/20 text-red-600',
  [OrderStatus.DELAYED]: 'bg-orange-500/20 text-orange-600',
}

interface AdminOrder extends Order {
  driverId?: string | null
  driver: Driver | null
  bulkOrderId?: string | null
  bulkOrder?: { id: string; referenceNumber: string } | null
  invoiceId?: string | null
  invoice?: { id: string; invoiceNumber: string; status: string } | null
}

function OrdersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('')
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | ''>('')
  const [typeFilter, setTypeFilter] = useState<'' | 'SINGLE' | 'BULK'>('')
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null)

  // Ref for the order detail card
  const orderDetailRef = useRef<HTMLDivElement | null>(null)

  // Scroll to the order detail card when selectedOrder changes
  useEffect(() => {
    if (selectedOrder && orderDetailRef.current) {
      orderDetailRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedOrder])

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['admin-orders', search, statusFilter, paymentFilter, typeFilter],
    queryFn: () => getOrders({
      search: search || undefined,
      status: statusFilter || undefined,
      paymentStatus: paymentFilter || undefined,
      type: typeFilter || undefined,
      pageSize: 100,
    }),
  })

  const { data: driversData } = useQuery({
    queryKey: ['admin-drivers-active'],
    queryFn: () => getDrivers({ isActive: true, pageSize: 100 }),
  })

  const statusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) =>
      updateOrderStatus(orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      setSelectedOrder(null)
    },
  })

  const assignMutation = useMutation({
    mutationFn: ({ orderId, driverId }: { orderId: string; driverId: string | null }) =>
      assignDriver(orderId, driverId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      if (selectedOrder) {
        setSelectedOrder(res.order)
      }
    },
  })

  function formatAddress(address: Order['pickupAddress']) {
    return `${address.street}, ${address.suburb || address.city}`
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Orders</h2>
      </div>

      <div className="flex gap-4 flex-wrap">
        <Input
          placeholder="Search tracking # or bulk ref or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as '' | 'SINGLE' | 'BULK')}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          <option value="SINGLE">Single</option>
          <option value="BULK">Bulk</option>
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value as PaymentStatus | '')}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All payments</option>
          {Object.values(PaymentStatus).map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {selectedOrder && (
        <Card className="border-primary/50">
          <div ref={orderDetailRef}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              Order #{selectedOrder.trackingNumber}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setSelectedOrder(null)}>
              Close
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Status</div>
                <Badge className={STATUS_COLORS[selectedOrder.status]}>
                  {selectedOrder.status.replace(/_/g, ' ')}
                </Badge>
              </div>
              <div>
                <div className="text-muted-foreground">Amount</div>
                <div className="font-medium">{formatCentsToZar(selectedOrder.quoteAmount)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Pickup</div>
                <div>{formatAddress(selectedOrder.pickupAddress)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Delivery</div>
                <div>{formatAddress(selectedOrder.deliveryAddress)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Receiver</div>
                <div>{selectedOrder.receiverPhone}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Created</div>
                <div>{formatDate(selectedOrder.createdAt)}</div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-4">
              <div>
                <div className="text-sm font-medium mb-2">Assign Driver</div>
                <select
                  value={selectedOrder.driver?.id || ''}
                  onChange={(e) => assignMutation.mutate({
                    orderId: selectedOrder.id,
                    driverId: e.target.value || null,
                  })}
                  disabled={assignMutation.isPending}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">No driver assigned</option>
                  {driversData?.data.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} - {driver.vehicleType}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-sm font-medium mb-2">Update Status</div>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((status) => (
                    <Button
                      key={status}
                      variant={selectedOrder.status === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => statusMutation.mutate({
                        orderId: selectedOrder.id,
                        status,
                      })}
                      disabled={statusMutation.isPending || selectedOrder.status === status}
                    >
                      {status.replace(/_/g, ' ')}
                    </Button>
                  ))}
                </div>
              </div>

              {selectedOrder.proofOfDelivery ? (
                <PodPanel pod={selectedOrder.proofOfDelivery} />
              ) : null}
            </div>
          </CardContent>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-2">
          {ordersData?.data.map((order) => (
            <Card
              key={order.id}
              className={`cursor-pointer hover:border-primary/50 transition-colors ${
                selectedOrder?.id === order.id ? 'border-primary' : ''
              }`}
              onClick={() => {
                setSelectedOrder(order)
              }}
            >
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-medium">
                        {order.trackingNumber}
                      </span>
                      <Badge className={STATUS_COLORS[order.status]}>
                        {order.status.replace(/_/g, ' ')}
                      </Badge>
                      {order.bulkOrder ? (
                        <Badge className="bg-violet-500/20 text-violet-700">
                          Bulk · {order.bulkOrder.referenceNumber}
                        </Badge>
                      ) : null}
                      {order.paymentStatus === 'INVOICED' ? (
                        <Badge className="bg-amber-500/20 text-amber-700">INVOICED</Badge>
                      ) : null}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatAddress(order.pickupAddress)} → {formatAddress(order.deliveryAddress)}
                    </div>
                    <div className="text-xs text-muted-foreground flex gap-4">
                      <span>{formatDate(order.createdAt)}</span>
                      <span>{formatCentsToZar(order.quoteAmount)}</span>
                      {order.driver && (
                        <span className="text-primary">Driver: {order.driver.name}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {ordersData?.data.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No orders found
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default OrdersPage
