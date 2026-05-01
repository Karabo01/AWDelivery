import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  createWaybillBatch,
  downloadBatchCsvUrl,
  getUsers,
  getWaybillBatch,
  getWaybillBatches,
  markBatchPrinted,
  voidWaybill,
} from '@/services/admin.service'
import { WaybillStatus } from '@/types/order.types'

const STATUS_COLORS: Record<WaybillStatus, string> = {
  [WaybillStatus.UNUSED]: 'bg-emerald-500/20 text-emerald-700',
  [WaybillStatus.USED]: 'bg-blue-500/20 text-blue-700',
  [WaybillStatus.VOID]: 'bg-red-500/20 text-red-700',
}

function WaybillsPage() {
  const qc = useQueryClient()
  const [businessSearch, setBusinessSearch] = useState('')
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('')
  const [size, setSize] = useState<number>(50)
  const [notes, setNotes] = useState('')
  const [generatedCodes, setGeneratedCodes] = useState<string[] | null>(null)
  const [generatedBatchId, setGeneratedBatchId] = useState<string | null>(null)
  const [openBatchId, setOpenBatchId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const usersQuery = useQuery({
    queryKey: ['admin-users-business-search', businessSearch],
    queryFn: () => getUsers({ search: businessSearch || undefined, pageSize: 25 }),
  })

  const businessUsers = useMemo(
    () => (usersQuery.data?.data ?? []).filter((u: any) => u.isBusiness),
    [usersQuery.data],
  )

  const batchesQuery = useQuery({
    queryKey: ['admin-waybill-batches'],
    queryFn: () => getWaybillBatches({ pageSize: 50 }),
  })

  const batchDetail = useQuery({
    queryKey: ['admin-waybill-batch', openBatchId],
    queryFn: () => getWaybillBatch(openBatchId!),
    enabled: !!openBatchId,
  })

  const createMutation = useMutation({
    mutationFn: createWaybillBatch,
    onSuccess: (res) => {
      setGeneratedCodes(res.codes)
      setGeneratedBatchId(res.batch.id)
      setActionError(null)
      qc.invalidateQueries({ queryKey: ['admin-waybill-batches'] })
    },
    onError: (err: any) => {
      setActionError(err?.response?.data?.message ?? 'Failed to generate batch.')
    },
  })

  const printedMutation = useMutation({
    mutationFn: (batchId: string) => markBatchPrinted(batchId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-waybill-batches'] })
      qc.invalidateQueries({ queryKey: ['admin-waybill-batch'] })
    },
  })

  const voidMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => voidWaybill(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-waybill-batches'] })
      qc.invalidateQueries({ queryKey: ['admin-waybill-batch'] })
    },
    onError: (err: any) => {
      setActionError(err?.response?.data?.message ?? 'Failed to void waybill.')
    },
  })

  const handleGenerate = () => {
    setActionError(null)
    if (!selectedBusinessId) {
      setActionError('Pick a business first.')
      return
    }
    if (!size || size < 1) {
      setActionError('Size must be at least 1.')
      return
    }
    createMutation.mutate({ businessId: selectedBusinessId, size, notes: notes || undefined })
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Waybills</h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Generate batch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Business</Label>
              <Input
                placeholder="Search business by name or email..."
                value={businessSearch}
                onChange={(e) => setBusinessSearch(e.target.value)}
              />
              <select
                value={selectedBusinessId}
                onChange={(e) => setSelectedBusinessId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select a business…</option>
                {businessUsers.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.companyName ?? `${u.name} ${u.surname}`} — {u.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Batch size</Label>
              <Input
                type="number"
                min={1}
                max={2000}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
              />
              <Label>Notes (optional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          {actionError ? <p className="text-sm text-destructive">{actionError}</p> : null}

          <Button onClick={handleGenerate} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Generating…' : 'Generate'}
          </Button>

          {generatedCodes && generatedBatchId ? (
            <div className="rounded-md border border-border/70 bg-muted/30 p-3 space-y-2">
              <p className="text-sm font-medium">
                Generated {generatedCodes.length} codes. Print these onto stickers.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(downloadBatchCsvUrl(generatedBatchId), '_blank')}
                >
                  Download CSV
                </Button>
                <Button
                  size="sm"
                  onClick={() => printedMutation.mutate(generatedBatchId)}
                  disabled={printedMutation.isPending}
                >
                  Mark as printed
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setGeneratedCodes(null)}>
                  Hide
                </Button>
              </div>
              <pre className="max-h-40 overflow-auto rounded bg-background/60 p-2 text-xs">
                {generatedCodes.join('\n')}
              </pre>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Recent batches</h3>
        {batchesQuery.isLoading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-2">
            {batchesQuery.data?.data.map((b) => (
              <Card
                key={b.id}
                className={`cursor-pointer hover:border-primary/50 transition-colors ${
                  openBatchId === b.id ? 'border-primary' : ''
                }`}
                onClick={() => setOpenBatchId(openBatchId === b.id ? null : b.id)}
              >
                <CardContent className="py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium">{b.batchNumber}</span>
                        {b.printedAt ? (
                          <Badge className="bg-blue-500/20 text-blue-700">Printed</Badge>
                        ) : (
                          <Badge className="bg-amber-500/20 text-amber-700">Not printed</Badge>
                        )}
                      </div>
                      <div className="text-sm">
                        {b.business.companyName ?? `${b.business.name} ${b.business.surname}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {b.size} codes · {b.counts.unused} unused / {b.counts.used} used /{' '}
                        {b.counts.void} void · created{' '}
                        {new Date(b.createdAt).toLocaleDateString('en-ZA')}
                      </div>
                    </div>
                  </div>

                  {openBatchId === b.id && batchDetail.data ? (
                    <div className="mt-4 border-t pt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(downloadBatchCsvUrl(b.id), '_blank')}
                        >
                          Download CSV
                        </Button>
                        {!b.printedAt ? (
                          <Button
                            size="sm"
                            onClick={() => printedMutation.mutate(b.id)}
                            disabled={printedMutation.isPending}
                          >
                            Mark as printed
                          </Button>
                        ) : null}
                      </div>
                      <div className="overflow-x-auto rounded-md border border-border/70">
                        <table className="w-full text-sm">
                          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                            <tr>
                              <th className="px-3 py-2">Code</th>
                              <th className="px-3 py-2">Status</th>
                              <th className="px-3 py-2">Order</th>
                              <th className="px-3 py-2 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/70">
                            {batchDetail.data.batch.waybills.map((w) => (
                              <tr key={w.id}>
                                <td className="px-3 py-2 font-mono">{w.code}</td>
                                <td className="px-3 py-2">
                                  <Badge className={STATUS_COLORS[w.status as WaybillStatus]}>
                                    {w.status}
                                  </Badge>
                                </td>
                                <td className="px-3 py-2 font-mono text-xs">{w.orderId ?? '—'}</td>
                                <td className="px-3 py-2 text-right">
                                  {w.status === 'UNUSED' ? (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() =>
                                        voidMutation.mutate({
                                          id: w.id,
                                          reason: window.prompt('Void reason (optional):') ?? undefined,
                                        })
                                      }
                                    >
                                      Void
                                    </Button>
                                  ) : null}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))}
            {batchesQuery.data?.data.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">No batches yet</div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

export default WaybillsPage
