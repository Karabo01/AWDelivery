import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getStats } from '@/services/admin.service'
import { formatCentsToZar } from '@/lib/format'

function StatCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Pending Payment',
  CONFIRMED: 'Confirmed',
  PICKUP_SCHEDULED: 'Pickup Scheduled',
  PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit',
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
  DELAYED: 'Delayed',
}

function FinancialsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  if (isLoading) {
    return <div className="text-muted-foreground">Loading stats...</div>
  }

  if (!data) {
    return <div className="text-muted-foreground">Failed to load stats</div>
  }

  const revenueChange = data.revenue.lastMonth > 0
    ? ((data.revenue.thisMonth - data.revenue.lastMonth) / data.revenue.lastMonth * 100).toFixed(1)
    : null

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Financial Overview</h2>

      {/* Revenue Cards */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Revenue</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Revenue"
            value={formatCentsToZar(data.revenue.total)}
            subtitle="All time"
          />
          <StatCard
            title="This Month"
            value={formatCentsToZar(data.revenue.thisMonth)}
            subtitle={revenueChange ? `${Number(revenueChange) >= 0 ? '+' : ''}${revenueChange}% vs last month` : 'First month'}
          />
          <StatCard
            title="Last Month"
            value={formatCentsToZar(data.revenue.lastMonth)}
          />
        </div>
      </div>

      {/* Order Stats */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Orders</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Orders"
            value={data.orders.total}
          />
          <StatCard
            title="Delivered"
            value={data.orders.delivered}
            subtitle={data.orders.total > 0 
              ? `${((data.orders.delivered / data.orders.total) * 100).toFixed(0)}% completion rate`
              : undefined
            }
          />
          <StatCard
            title="Pending"
            value={data.orders.pending}
            subtitle="Active orders"
          />
          <StatCard
            title="This Month"
            value={data.orders.thisMonth}
          />
        </div>
      </div>

      {/* Driver Stats */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Drivers</h3>
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            title="Total Drivers"
            value={data.drivers.total}
          />
          <StatCard
            title="Active Drivers"
            value={data.drivers.active}
            subtitle={data.drivers.total > 0
              ? `${((data.drivers.active / data.drivers.total) * 100).toFixed(0)}% active`
              : undefined
            }
          />
        </div>
      </div>

      {/* Orders by Status */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Orders by Status</h3>
        <Card>
          <CardContent className="pt-6">
            {data.ordersByStatus.length === 0 ? (
              <div className="text-center text-muted-foreground py-4">No orders yet</div>
            ) : (
              <div className="space-y-3">
                {data.ordersByStatus.map((item) => {
                  const percentage = data.orders.total > 0
                    ? (item.count / data.orders.total) * 100
                    : 0
                  return (
                    <div key={item.status} className="flex items-center gap-4">
                      <div className="w-32 text-sm font-medium">
                        {STATUS_LABELS[item.status] || item.status}
                      </div>
                      <div className="flex-1 h-4 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="w-16 text-sm text-right text-muted-foreground">
                        {item.count} ({percentage.toFixed(0)}%)
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default FinancialsPage
