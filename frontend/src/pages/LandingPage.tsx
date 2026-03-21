import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-10 py-6">
      <section className="rounded-xl border bg-card p-6 sm:p-10">
        <div className="mx-auto max-w-3xl space-y-4 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Door-to-door delivery in Gauteng
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Send parcels quickly, safely, and with real-time tracking.
          </h1>
          <p className="text-muted-foreground sm:text-lg">
            AWDelivery helps you schedule pickups, pay online, and follow your parcel
            from collection to delivery.
          </p>
          <div className="pt-2">
            <Button size="lg" onClick={() => navigate('/order/new')}>
              Send a parcel
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>1. Create an order</CardTitle>
              <CardDescription>Add pickup and delivery details.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Enter addresses, parcel size, and recipient details in a guided flow.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Pay securely</CardTitle>
              <CardDescription>Get a quote and proceed to payment.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Confirm your quote and complete checkout with PayFast.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Track live</CardTitle>
              <CardDescription>Follow your parcel status updates.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Share tracking numbers and monitor progress from pickup to delivery.
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

export default LandingPage
