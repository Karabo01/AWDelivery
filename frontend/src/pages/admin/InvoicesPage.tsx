import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCentsToZar } from '@/lib/format'
import { getInvoice, getInvoices, markInvoicePaid } from '@/services/admin.service'
import { InvoiceStatus } from '@/types/order.types'

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  [InvoiceStatus.OPEN]: 'bg-amber-500/20 text-amber-700',
  [InvoiceStatus.PAID]: 'bg-green-500/20 text-green-700',
  [InvoiceStatus.OVERDUE]: 'bg-red-500/20 text-red-700',
  [InvoiceStatus.VOID]: 'bg-muted text-muted-foreground',
}

function formatRange(start: string, end: string) {
  const s = new Date(start).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })
  const e = new Date(end).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
  return `${s} – ${e}`
}

function InvoicesPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-invoices', statusFilter],
    queryFn: () =>
      getInvoices({ status: statusFilter || undefined, pageSize: 100 }),
  })

  const detail = useQuery({
    queryKey: ['admin-invoice', selectedId],
    queryFn: () => getInvoice(selectedId!),
    enabled: !!selectedId,
  })

  const markPaid = useMutation({
    mutationFn: (id: string) => markInvoicePaid(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-invoices'] })
      qc.invalidateQueries({ queryKey: ['admin-invoice'] })
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Weekly Invoices</h2>
      </div>

      <div className="flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | '')}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {Object.values(InvoiceStatus).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {selectedId && detail.data ? (
        <Card className="border-primary/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{detail.data.invoice.invoiceNumber}</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setSelectedId(null)}>
              Close
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Business</div>
                <div className="font-medium">
                  {detail.data.invoice.business.companyName ??
                    `${detail.data.invoice.business.name} ${detail.data.invoice.business.surname}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  {detail.data.invoice.business.email}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Week</div>
                <div>{formatRange(detail.data.invoice.weekStart, detail.data.invoice.weekEnd)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Total</div>
                <div className="text-xl font-semibold">
                  {formatCentsToZar(detail.data.invoice.totalAmount)}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Status</div>
                <Badge className={STATUS_COLORS[detail.data.invoice.status]}>
                  {detail.data.invoice.status}
                </Badge>
              </div>
            </div>

            <div className="border-t pt-3">
              <div className="text-sm font-medium mb-2">
                Packages ({detail.data.invoice.orders.length})
              </div>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {detail.data.invoice.orders.map((o) => (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded-md border border-border/70 bg-card/60 px-3 py-2 text-sm"
                  >
                    <span className="font-mono">{o.trackingNumber}</span>
                    <span className="text-muted-foreground">
                      → {o.deliveryAddress.suburb || o.deliveryAddress.city || o.deliveryAddress.street}
                    </span>
                    <span className="font-medium">{formatCentsToZar(o.quoteAmount)}</span>
                  </div>
                ))}
              </div>
            </div>

            {detail.data.invoice.status === InvoiceStatus.OPEN ||
            detail.data.invoice.status === InvoiceStatus.OVERDUE ? (
              <Button
                onClick={() => markPaid.mutate(detail.data!.invoice.id)}
                disabled={markPaid.isPending}
              >
                Mark as paid
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {isLoading ? (
        <div className="text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-2">
          {data?.data.map((inv) => (
            <Card
              key={inv.id}
              className={`cursor-pointer hover:border-primary/50 transition-colors ${
                selectedId === inv.id ? 'border-primary' : ''
              }`}
              onClick={() => setSelectedId(inv.id)}
            >
              <CardContent className="py-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{inv.invoiceNumber}</span>
                      <Badge className={STATUS_COLORS[inv.status]}>{inv.status}</Badge>
                    </div>
                    <div className="text-sm">
                      {inv.business.companyName ?? `${inv.business.name} ${inv.business.surname}`}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatRange(inv.weekStart, inv.weekEnd)} · {inv.orderCount ?? 0} packages
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">{formatCentsToZar(inv.totalAmount)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {data?.data.length === 0 && (
            <div className="text-center text-muted-foreground py-8">No invoices found</div>
          )}
        </div>
      )}
    </div>
  )
}

export default InvoicesPage
