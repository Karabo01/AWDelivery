import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'

import AddressAutocompleteField from '@/components/shared/AddressAutocompleteField'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatCentsToZar, formatToSaE164, isValidSaE164 } from '@/lib/format'
import { createBulkOrder, getBulkQuote } from '@/services/orders.service'
import type { BulkPackageInput } from '@/types'
import { ParcelSize } from '@/types'

type PackageDraft = {
  deliveryAddress: string
  deliveryLat: number
  deliveryLng: number
  deliveryNotes: string
  size: ParcelSize
  weightKg: string
  description: string
  receiverPhone: string
  receiverEmail: string
}

const emptyPackage = (): PackageDraft => ({
  deliveryAddress: '',
  deliveryLat: 0,
  deliveryLng: 0,
  deliveryNotes: '',
  size: ParcelSize.SMALL,
  weightKg: '1',
  description: '',
  receiverPhone: '+27',
  receiverEmail: '',
})

const sizeOptions = [
  { size: ParcelSize.SMALL, label: 'Small (shoebox or smaller)' },
  { size: ParcelSize.MEDIUM, label: 'Medium' },
  { size: ParcelSize.LARGE, label: 'Large' },
]

function BulkOrderPage() {
  const navigate = useNavigate()
  const [pickupAddress, setPickupAddress] = useState('')
  const [pickupLat, setPickupLat] = useState(0)
  const [pickupLng, setPickupLng] = useState(0)
  const [pickupNotes, setPickupNotes] = useState('')
  const [packages, setPackages] = useState<PackageDraft[]>([emptyPackage()])
  const [serverError, setServerError] = useState<string | null>(null)
  const [quoteToken, setQuoteToken] = useState<string | null>(null)
  const [quoteTotal, setQuoteTotal] = useState<number | null>(null)
  const [packageQuotes, setPackageQuotes] = useState<{ amount: number; distanceKm: number }[]>([])
  const [success, setSuccess] = useState<{
    referenceNumber: string
    invoiceNumber: string
    orderCount: number
    total: number
  } | null>(null)

  const quoteMutation = useMutation({ mutationFn: getBulkQuote })
  const submitMutation = useMutation({ mutationFn: createBulkOrder })

  const updatePackage = (idx: number, patch: Partial<PackageDraft>) => {
    setPackages((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
    setQuoteToken(null)
    setQuoteTotal(null)
  }

  const addPackage = () => {
    setPackages((prev) => [...prev, emptyPackage()])
    setQuoteToken(null)
    setQuoteTotal(null)
  }

  const removePackage = (idx: number) => {
    setPackages((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)))
    setQuoteToken(null)
    setQuoteTotal(null)
  }

  const buildPayload = (): { pickupAddressObj: any; packageObjs: BulkPackageInput[] } | null => {
    if (!pickupAddress || pickupLat === 0) {
      setServerError('Please select a pickup address.')
      return null
    }

    for (let i = 0; i < packages.length; i++) {
      const p = packages[i]
      if (!p.deliveryAddress || p.deliveryLat === 0) {
        setServerError(`Package ${i + 1}: please select a delivery address.`)
        return null
      }
      if (!isValidSaE164(p.receiverPhone)) {
        setServerError(`Package ${i + 1}: receiver phone must be +27XXXXXXXXX.`)
        return null
      }
      if (!p.receiverEmail || !p.receiverEmail.includes('@')) {
        setServerError(`Package ${i + 1}: receiver email is required.`)
        return null
      }
      const w = Number(p.weightKg)
      if (!Number.isFinite(w) || w < 0.1) {
        setServerError(`Package ${i + 1}: weight must be at least 0.1kg.`)
        return null
      }
    }

    const pickupAddressObj = {
      street: pickupAddress,
      suburb: '',
      city: '',
      postalCode: '',
      province: '',
      coordinates: { lat: pickupLat, lng: pickupLng },
      notes: pickupNotes || undefined,
    }

    const packageObjs: BulkPackageInput[] = packages.map((p) => ({
      deliveryAddress: {
        street: p.deliveryAddress,
        suburb: '',
        city: '',
        postalCode: '',
        province: '',
        coordinates: { lat: p.deliveryLat, lng: p.deliveryLng },
        notes: p.deliveryNotes || undefined,
      },
      parcelDetails: {
        size: p.size,
        weightKg: Number(p.weightKg),
        description: p.description || undefined,
      },
      receiverPhone: p.receiverPhone,
      receiverEmail: p.receiverEmail,
    }))

    return { pickupAddressObj, packageObjs }
  }

  const handleGetQuote = async () => {
    setServerError(null)
    const built = buildPayload()
    if (!built) return
    try {
      const res = await quoteMutation.mutateAsync({
        pickupAddress: built.pickupAddressObj,
        packages: built.packageObjs,
      })
      setQuoteToken(res.quoteToken)
      setQuoteTotal(res.total)
      setPackageQuotes(res.packages.map((p) => ({ amount: p.amount, distanceKm: p.distanceKm })))
    } catch {
      setServerError('Unable to get quote. Please review your details and try again.')
    }
  }

  const handleSubmit = async () => {
    setServerError(null)
    if (!quoteToken) {
      setServerError('Please get a quote first.')
      return
    }
    const built = buildPayload()
    if (!built) return
    try {
      const res = await submitMutation.mutateAsync({
        pickupAddress: built.pickupAddressObj,
        packages: built.packageObjs,
        quoteToken,
      })
      setSuccess({
        referenceNumber: res.bulkOrder.referenceNumber,
        invoiceNumber: res.invoice.invoiceNumber,
        orderCount: res.orders.length,
        total: quoteTotal ?? 0,
      })
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Unable to submit bulk order. Please try again.'
      setServerError(msg)
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-2xl space-y-5 py-8">
        <Card className="border-border/85 bg-card/95">
          <CardHeader>
            <CardTitle>Bulk order submitted</CardTitle>
            <CardDescription>
              Your packages have been queued and will be picked up. Payment is added to this week's
              invoice.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-xl border border-border/85 bg-muted/35 p-5 space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Reference: </span>
                <span className="font-semibold">{success.referenceNumber}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Invoice: </span>
                <span className="font-semibold">{success.invoiceNumber}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Packages: </span>
                <span className="font-semibold">{success.orderCount}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Total this submission: </span>
                <span className="font-semibold">{formatCentsToZar(success.total)}</span>
              </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => navigate('/dashboard')}>Go to dashboard</Button>
              <Button variant="outline" asChild>
                <Link to="/invoices">View invoices</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 py-2">
      <div className="rounded-xl border border-border/85 bg-card/80 p-5 sm:p-6">
        <h1 className="text-3xl font-semibold tracking-tight">New bulk order</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One pickup, multiple destinations. Packages within Johannesburg that fit in a shoebox are
          R70 flat. Bulk orders are billed weekly via EFT.
        </p>
      </div>

      <Card className="border-border/85 bg-card/95">
        <CardHeader>
          <CardTitle>Pickup address (shared)</CardTitle>
          <CardDescription>This address applies to every package below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddressAutocompleteField
            id="bulk-pickup-address"
            label="Pickup address"
            onAddressSelected={(addr, formatted) => {
              setPickupAddress(formatted)
              setPickupLat(addr.lat ?? 0)
              setPickupLng(addr.lng ?? 0)
              setQuoteToken(null)
            }}
          />
          <div className="space-y-2">
            <Label>Pickup notes (optional)</Label>
            <Textarea
              placeholder="e.g. Loading bay around back, ask for warehouse manager"
              value={pickupNotes}
              onChange={(e) => setPickupNotes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {packages.map((pkg, idx) => (
          <Card key={idx} className="border-border/85 bg-card/95">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Package {idx + 1}</CardTitle>
                {packageQuotes[idx] ? (
                  <CardDescription>
                    Quote: {formatCentsToZar(packageQuotes[idx].amount)} ·{' '}
                    {packageQuotes[idx].distanceKm.toFixed(1)} km
                  </CardDescription>
                ) : null}
              </div>
              {packages.length > 1 ? (
                <Button variant="outline" size="sm" onClick={() => removePackage(idx)}>
                  Remove
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4">
              <AddressAutocompleteField
                id={`bulk-delivery-${idx}`}
                label="Delivery address"
                onAddressSelected={(addr, formatted) => {
                  updatePackage(idx, {
                    deliveryAddress: formatted,
                    deliveryLat: addr.lat ?? 0,
                    deliveryLng: addr.lng ?? 0,
                  })
                }}
              />

              <div className="space-y-2">
                <Label>Delivery notes (optional)</Label>
                <Textarea
                  value={pkg.deliveryNotes}
                  onChange={(e) => updatePackage(idx, { deliveryNotes: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Parcel size</Label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {sizeOptions.map((opt) => (
                    <button
                      key={opt.size}
                      type="button"
                      onClick={() => updatePackage(idx, { size: opt.size })}
                      className={`rounded-lg border p-3 text-left text-sm transition ${
                        pkg.size === opt.size
                          ? 'border-primary/60 bg-primary/10 ring-2 ring-primary/25'
                          : 'border-border/90 bg-background/70 hover:border-primary/35'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Receiver phone</Label>
                  <Input
                    value={pkg.receiverPhone}
                    onChange={(e) =>
                      updatePackage(idx, { receiverPhone: formatToSaE164(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Receiver email</Label>
                  <Input
                    type="email"
                    value={pkg.receiverEmail}
                    onChange={(e) => updatePackage(idx, { receiverEmail: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Parcel weight (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={pkg.weightKg}
                    onChange={(e) => updatePackage(idx, { weightKg: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Input
                    value={pkg.description}
                    onChange={(e) => updatePackage(idx, { description: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button type="button" variant="outline" onClick={addPackage}>
          + Add package
        </Button>
      </div>

      {quoteTotal !== null ? (
        <div className="rounded-xl border border-border/85 bg-muted/35 p-5">
          <p className="text-sm text-muted-foreground">Estimated total</p>
          <p className="pt-1 text-3xl font-semibold">{formatCentsToZar(quoteTotal)}</p>
          <p className="text-sm text-muted-foreground">
            {packages.length} package{packages.length === 1 ? '' : 's'} · billed on this week's
            invoice
          </p>
        </div>
      ) : null}

      {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleGetQuote}
          disabled={quoteMutation.isPending}
        >
          {quoteToken ? 'Refresh quote' : 'Get quote'}
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!quoteToken || submitMutation.isPending}
        >
          Submit bulk order
        </Button>
      </div>
    </div>
  )
}

export default BulkOrderPage
