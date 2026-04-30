import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCentsToZar } from '@/lib/format'
import { getMyInvoices } from '@/services/orders.service'
import { InvoiceStatus } from '@/types'

const PAGE_SIZE = 10

const statusColors: Record<InvoiceStatus, string> = {
  [InvoiceStatus.OPEN]: 'bg-amber-500/15 text-amber-600',
  [InvoiceStatus.PAID]: 'bg-emerald-500/15 text-emerald-600',
  [InvoiceStatus.OVERDUE]: 'bg-rose-500/15 text-rose-600',
  [InvoiceStatus.VOID]: 'bg-muted text-muted-foreground',
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })
  const e = new Date(end).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' })
  return `${s} – ${e}`
}

function BusinessInvoicesPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useQuery({
    queryKey: ['my-invoices', page],
    queryFn: () => getMyInvoices({ page, pageSize: PAGE_SIZE }),
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  return (
    <div className="space-y-6 py-2">
      <div className="rounded-xl border border-border/85 bg-card/80 p-5 sm:p-6">
        <h1 className="text-3xl font-semibold tracking-tight">Invoices</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Each week's bulk-order activity is grouped into one invoice. Settle each open invoice
          with the EFT details we send through.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading invoices…</p>
      ) : !data?.data.length ? (
        <Card className="border-border/85 bg-card/95">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No invoices yet. Submit a bulk order to start a weekly invoice.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.data.map((inv) => (
            <Card key={inv.id} className="border-border/85 bg-card/95">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 gap-3">
                <div>
                  <CardTitle className="text-lg">{inv.invoiceNumber}</CardTitle>
                  <CardDescription>{formatDateRange(inv.weekStart, inv.weekEnd)}</CardDescription>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    statusColors[inv.status]
                  }`}
                >
                  {inv.status}
                </span>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-2xl font-semibold">{formatCentsToZar(inv.totalAmount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.orderCount ?? 0} package{inv.orderCount === 1 ? '' : 's'}
                    {inv.paidAt
                      ? ` · paid ${new Date(inv.paidAt).toLocaleDateString('en-ZA')}`
                      : ''}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  )
}

export default BusinessInvoicesPage
