import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import AddressAutocompleteField from '@/components/shared/AddressAutocompleteField'
import type { AddressAutocompleteValue } from '@/components/shared/AddressAutocompleteField'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatCentsToZar, formatToSaE164, isValidSaE164 } from '@/lib/format'
import { createOrder, getQuote } from '@/services/orders.service'
import { ParcelSize } from '@/types'

const wizardSchema = z.object({
  // Pickup - simplified to just address string and coordinates
  pickupAddress: z.string().min(5, 'Please select a pickup address.'),
  pickupLat: z.number().refine((v) => v !== 0, 'Please select a valid pickup address.'),
  pickupLng: z.number(),
  pickupNotes: z.string().optional(),

  // Delivery - simplified to just address string and coordinates
  deliveryAddress: z.string().min(5, 'Please select a delivery address.'),
  deliveryLat: z.number().refine((v) => v !== 0, 'Please select a valid delivery address.'),
  deliveryLng: z.number(),
  deliveryNotes: z.string().optional(),

  parcelSize: z.nativeEnum(ParcelSize),
  parcelDescription: z.string().optional(),
  parcelWeightKg: z.coerce.number().min(0.1, 'Weight must be at least 0.1kg.'),
  receiverPhone: z
    .string()
    .refine(isValidSaE164, 'Receiver phone must be in +27XXXXXXXXX format.'),
})

type WizardFormInput = z.input<typeof wizardSchema>
type WizardFormOutput = z.output<typeof wizardSchema>

type Step = 1 | 2 | 3

const parcelOptions = [
  {
    size: ParcelSize.SMALL,
    title: 'Small',
    description: 'Documents, small parcels',
    surcharge: 'R0 surcharge',
  },
  {
    size: ParcelSize.MEDIUM,
    title: 'Medium',
    description: 'Shoebox-sized items',
    surcharge: 'R10 surcharge',
  },
  {
    size: ParcelSize.LARGE,
    title: 'Large',
    description: 'Bigger boxed parcels',
    surcharge: 'R25 surcharge',
  },
]

function NewOrderPage() {
  const [step, setStep] = useState<Step>(1)
  const [quoteToken, setQuoteToken] = useState<string | null>(null)
  const [quoteAmount, setQuoteAmount] = useState<number | null>(null)
  const [quoteDistanceKm, setQuoteDistanceKm] = useState<number | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<WizardFormInput, unknown, WizardFormOutput>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      pickupAddress: '',
      pickupLat: 0,
      pickupLng: 0,
      pickupNotes: '',

      deliveryAddress: '',
      deliveryLat: 0,
      deliveryLng: 0,
      deliveryNotes: '',

      parcelSize: ParcelSize.MEDIUM,
      parcelDescription: '',
      parcelWeightKg: 1,
      receiverPhone: '+27',
    },
  })

  const quoteMutation = useMutation({
    mutationFn: getQuote,
  })

  const createOrderMutation = useMutation({
    mutationFn: createOrder,
  })

  const progress = useMemo(() => {
    if (step === 1) {
      return 33
    }
    if (step === 2) {
      return 66
    }
    return 100
  }, [step])

  const applyAddressToForm = (
    prefix: 'pickup' | 'delivery',
    address: AddressAutocompleteValue,
    formattedAddress: string,
  ) => {
    form.setValue(`${prefix}Address`, formattedAddress, { shouldValidate: true })
    form.setValue(`${prefix}Lat`, address.lat ?? 0, { shouldValidate: true })
    form.setValue(`${prefix}Lng`, address.lng ?? 0, { shouldValidate: true })
  }

  const goToStep2 = async () => {
    setServerError(null)
    const valid = await form.trigger(['pickupAddress', 'pickupLat'])

    if (valid) {
      setStep(2)
    }
  }

  const fetchQuoteAndGoToStep3 = async () => {
    setServerError(null)
    const valid = await form.trigger([
      'deliveryAddress',
      'deliveryLat',
      'parcelSize',
      'parcelWeightKg',
      'receiverPhone',
    ])

    if (!valid) {
      return
    }

    try {
      const values = form.getValues()
      const quote = await quoteMutation.mutateAsync({
        pickupAddress: {
          street: values.pickupAddress,
          suburb: '',
          city: '',
          postalCode: '',
          province: '',
          notes: values.pickupNotes,
          coordinates: { lat: values.pickupLat, lng: values.pickupLng },
        },
        deliveryAddress: {
          street: values.deliveryAddress,
          suburb: '',
          city: '',
          postalCode: '',
          province: '',
          notes: values.deliveryNotes,
          coordinates: { lat: values.deliveryLat, lng: values.deliveryLng },
        },
        parcelSize: values.parcelSize,
      })

      setQuoteToken(quote.quoteToken)
      setQuoteAmount(quote.amount)
      setQuoteDistanceKm(quote.distanceKm)
      setStep(3)
    } catch {
      setServerError('Unable to get quote. Please review your details and try again.')
    }
  }

  const proceedToPay = async () => {
    if (!quoteToken) {
      return
    }

    setServerError(null)
    try {
      const values = form.getValues()
      const created = await createOrderMutation.mutateAsync({
        pickupAddress: {
          street: values.pickupAddress,
          suburb: '',
          city: '',
          postalCode: '',
          province: '',
          notes: values.pickupNotes,
          coordinates: { lat: values.pickupLat, lng: values.pickupLng },
        },
        deliveryAddress: {
          street: values.deliveryAddress,
          suburb: '',
          city: '',
          postalCode: '',
          province: '',
          notes: values.deliveryNotes,
          coordinates: { lat: values.deliveryLat, lng: values.deliveryLng },
        },
        parcelDetails: {
          size: values.parcelSize,
          weightKg: Number(values.parcelWeightKg),
          description: values.parcelDescription,
        },
        receiverPhone: values.receiverPhone,
        quoteToken,
      })

      window.location.assign(created.paymentUrl)
    } catch {
      setServerError('Unable to create order. Please try again.')
    }
  }

  return (
    <div className="space-y-7 py-2">
      <div className="rounded-xl border border-border/85 bg-card/80 p-5 sm:p-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Create new order</h1>
          <p className="text-sm text-muted-foreground">Step {step} of 3</p>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {step === 1 ? (
        <Card className="border-border/85 bg-card/95">
          <CardHeader>
            <CardTitle>Step 1: Pickup address</CardTitle>
            <CardDescription>
              Search for the pickup location, then add optional landmark notes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AddressAutocompleteField
              id="pickup-address"
              label="Pickup address"
              onAddressSelected={(address, formattedAddress) => applyAddressToForm('pickup', address, formattedAddress)}
            />
            {form.formState.errors.pickupAddress && (
              <p className="text-sm text-destructive">{form.formState.errors.pickupAddress.message}</p>
            )}
            {form.formState.errors.pickupLat && (
              <p className="text-sm text-destructive">{form.formState.errors.pickupLat.message}</p>
            )}

            <div className="space-y-2">
              <Label>Landmark / notes (optional)</Label>
              <Textarea placeholder="e.g. Gate code 1234, blue building on the left" {...form.register('pickupNotes')} />
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" onClick={goToStep2}>Continue</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card className="border-border/85 bg-card/95">
          <CardHeader>
            <CardTitle>Step 2: Delivery and parcel details</CardTitle>
            <CardDescription>
              Search for the delivery location, select parcel size, and enter receiver phone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AddressAutocompleteField
              id="delivery-address"
              label="Delivery address"
              onAddressSelected={(address, formattedAddress) => applyAddressToForm('delivery', address, formattedAddress)}
            />
            {form.formState.errors.deliveryAddress && (
              <p className="text-sm text-destructive">{form.formState.errors.deliveryAddress.message}</p>
            )}
            {form.formState.errors.deliveryLat && (
              <p className="text-sm text-destructive">{form.formState.errors.deliveryLat.message}</p>
            )}

            <div className="space-y-2">
              <Label>Delivery notes (optional)</Label>
              <Textarea placeholder="e.g. Leave at reception, call on arrival" {...form.register('deliveryNotes')} />
            </div>

            <div className="space-y-2">
              <Label>Parcel size</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                {parcelOptions.map((option) => {
                  const selected = form.watch('parcelSize') === option.size
                  return (
                    <button
                      key={option.size}
                      className={`rounded-xl border p-3 text-left transition ${
                        selected
                          ? 'border-primary/60 bg-primary/10 ring-2 ring-primary/25'
                          : 'border-border/90 bg-background/70 hover:border-primary/35 hover:bg-accent/30'
                      }`}
                      type="button"
                      onClick={() => form.setValue('parcelSize', option.size)}
                    >
                      <p className="font-medium">{option.title}</p>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{option.surcharge}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Receiver phone</Label>
                <Input
                  value={form.watch('receiverPhone')}
                  onChange={(event) =>
                    form.setValue('receiverPhone', formatToSaE164(event.target.value), {
                      shouldValidate: true,
                    })
                  }
                />
                {form.formState.errors.receiverPhone && (
                  <p className="text-sm text-destructive">{form.formState.errors.receiverPhone.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Parcel weight (kg)</Label>
                <Input type="number" step="0.1" min="0.1" {...form.register('parcelWeightKg')} />
                {form.formState.errors.parcelWeightKg && (
                  <p className="text-sm text-destructive">{form.formState.errors.parcelWeightKg.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Parcel description</Label>
              <Textarea {...form.register('parcelDescription')} />
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button type="button" onClick={fetchQuoteAndGoToStep3} disabled={quoteMutation.isPending}>
                Get quote
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card className="border-border/85 bg-card/95">
          <CardHeader>
            <CardTitle>Step 3: Review quote</CardTitle>
            <CardDescription>Confirm the quote and continue to payment.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-xl border border-border/85 bg-muted/35 p-5">
              <p className="text-sm text-muted-foreground">Estimated amount</p>
              <p className="pt-1 text-3xl font-semibold">
                {quoteAmount !== null ? formatCentsToZar(quoteAmount) : '—'}
              </p>
              <p className="text-sm text-muted-foreground">
                Distance: {quoteDistanceKm !== null ? `${quoteDistanceKm.toFixed(1)} km` : '—'}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={proceedToPay} disabled={!quoteToken || createOrderMutation.isPending}>
                Proceed to Pay
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
    </div>
  )
}

export default NewOrderPage
