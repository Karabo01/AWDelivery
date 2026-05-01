import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getMyWaybills } from '@/services/orders.service'
import { WaybillStatus } from '@/types/order.types'

const PAGE_SIZE = 25

const STATUS_COLORS: Record<WaybillStatus, string> = {
  [WaybillStatus.UNUSED]: 'bg-emerald-500/20 text-emerald-700',
  [WaybillStatus.USED]: 'bg-blue-500/20 text-blue-700',
  [WaybillStatus.VOID]: 'bg-red-500/20 text-red-700',
}

function BusinessWaybillsPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<WaybillStatus | ''>('')

  const { data, isLoading } = useQuery({
    queryKey: ['my-waybills', page, status],
    queryFn: () =>
      getMyWaybills({
        page,
        pageSize: PAGE_SIZE,
        status: status || undefined,
      }),
  })

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1
  const counts = data?.counts ?? { UNUSED: 0, USED: 0, VOID: 0 }

  return (
    <div className="space-y-6 py-2">
      <div className="rounded-xl border border-border/85 bg-card/80 p-5 sm:p-6">
        <h1 className="text-3xl font-semibold tracking-tight">Waybills</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pre-printed sticker codes issued to your account. Allocate one per package on every bulk
          order.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Unused</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-emerald-600">{counts.UNUSED}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Used</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{counts.USED}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Void</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-red-600">{counts.VOID}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as WaybillStatus | '')
            setPage(1)
          }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {Object.values(WaybillStatus).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !data?.data.length ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No waybills yet. Ask the depot to print a batch for your account.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border/70">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Batch</th>
                <th className="px-4 py-2">Allocated to</th>
                <th className="px-4 py-2">Used at</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {data.data.map((w) => (
                <tr key={w.id}>
                  <td className="px-4 py-2 font-mono">{w.code}</td>
                  <td className="px-4 py-2">
                    <Badge className={STATUS_COLORS[w.status]}>{w.status}</Badge>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs">{w.batch?.batchNumber ?? '—'}</td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {w.order?.trackingNumber ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {w.usedAt ? new Date(w.usedAt).toLocaleString('en-ZA') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

export default BusinessWaybillsPage
