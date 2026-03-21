import { ArrowRight, CreditCard, Gift, HandHelping, ShieldCheck, Sparkles, TimerReset, Truck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import heroCourierMoment from '@/assets/landing/packing.jpg'
import storyParcelHandoff from '@/assets/landing/delivery.jpg'
import storyPaymentSecure from '@/assets/landing/payment.jpg'
import storyGiftMoment from '@/assets/landing/gift.jpg'

const storyPlaceholders = [
  {
    title: 'Parcel handoff',
    caption: 'Placeholder for a photo of two people handing a package to each other.',
    accent: 'Collection to drop-off, handled with care.',
    icon: HandHelping,
    imageSrc: storyParcelHandoff,
    imageAlt: 'Placeholder artwork for parcel handoff photography',
  },
  {
    title: 'Speed point payment',
    caption: 'Placeholder for a photo of someone paying on a card machine.',
    accent: 'Fast checkout that feels familiar and trustworthy.',
    icon: CreditCard,
    imageSrc: storyPaymentSecure,
    imageAlt: 'Placeholder artwork for speed point payment photography',
  },
  {
    title: 'Gift delivery moment',
    caption: 'Placeholder for a photo of a child receiving a gift parcel.',
    accent: 'The emotional payoff at the end of the trip.',
    icon: Gift,
    imageSrc: storyGiftMoment,
    imageAlt: 'Placeholder artwork for gift delivery photography',
  },
]

const valuePoints = [
  {
    title: 'Quick booking',
    description: 'Schedule a pickup in minutes without a phone call or back-and-forth.',
    icon: TimerReset,
  },
  {
    title: 'Tracked end to end',
    description: 'Customers can follow the delivery from confirmation to doorstep.',
    icon: Truck,
  },
  {
    title: 'Professional by default',
    description: 'Clear pricing, secure payment, and status updates people can trust.',
    icon: ShieldCheck,
  },
]

function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="space-y-14 py-6 sm:py-8">
      <section 
        className="animate-enter relative overflow-hidden rounded-[2rem] p-8 sm:p-12"
        style={{
          backgroundImage: `url(${heroCourierMoment})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: '600px',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-foreground/85 via-foreground/70 to-foreground/40" />
        <div className="relative flex items-center min-h-[600px]">
          <div className="space-y-6 max-w-2xl">
            <div className="animate-enter animate-delay-1 space-y-4">
              <p className="inline-flex items-center gap-2 rounded-full border border-background/40 bg-background/20 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-background/90">
                <Sparkles className="h-3.5 w-3.5 text-background" />
                Door-to-door delivery in Gauteng
              </p>
              <h1 className="max-w-2xl text-4xl font-semibold leading-[1.02] tracking-tight text-background sm:text-6xl">
                The delivery experience people trust from the very first order.
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-background/85 sm:text-lg">
                AWDelivery helps first-time visitors understand the promise instantly:
                quick booking, professional handoff, secure payment, and live parcel
                tracking from pickup to doorstep.
              </p>
            </div>

            <div className="animate-enter animate-delay-2 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" onClick={() => navigate('/order/new')}>
                Send a parcel
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/register')}>
                Create an account
              </Button>
            </div>

            <div className="animate-enter animate-delay-3 grid gap-3 sm:grid-cols-3">
              {valuePoints.map((point) => {
                const Icon = point.icon
                return (
                  <div key={point.title} className="rounded-2xl border border-background/30 bg-background/15 p-4 backdrop-blur-sm">
                    <Icon className="h-5 w-5 text-background" />
                    <p className="mt-4 text-sm font-semibold text-background">{point.title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-background/75">
                      {point.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="animate-enter animate-delay-2 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Why it lands</p>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Show people the moments that matter, not just the mechanics.
          </h2>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
            Someone discovering AWDelivery for the first time should immediately see what
            this product is for: collecting parcels smoothly, taking payment confidently,
            and delivering something meaningful on the other side.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {storyPlaceholders.map((item) => {
            const Icon = item.icon
            return (
              <Card
                key={item.title}
                className="overflow-hidden border-border/85 bg-card/95 transition hover:-translate-y-0.5 hover:shadow-[0_28px_70px_-48px_hsl(var(--foreground)/0.5)]"
              >
                <div className="border-b border-border/80 bg-accent/35 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full border border-primary/25 bg-primary/10 p-2 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  </div>
                </div>
                <CardHeader>
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative min-h-44 overflow-hidden rounded-[1.25rem] border border-border/90">
                    <img
                      src={item.imageSrc}
                      alt={item.imageAlt}
                      className="h-44 w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/65 via-foreground/10 to-transparent" />
                    <div className="absolute inset-x-4 bottom-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/90">
                        {item.accent}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="animate-enter animate-delay-3 space-y-5">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">How it works</p>
          <h2 className="text-3xl font-semibold tracking-tight">Clear enough for a first-time visitor</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="transition hover:-translate-y-0.5 hover:shadow-[0_28px_70px_-48px_hsl(var(--foreground)/0.5)]">
            <CardHeader>
              <CardTitle>1. Create an order</CardTitle>
              <CardDescription>Add pickup and delivery details with a guided flow.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Visitors understand the process fast because the booking path is direct,
              legible, and built around real delivery needs.
            </CardContent>
          </Card>

          <Card className="transition hover:-translate-y-0.5 hover:shadow-[0_28px_70px_-48px_hsl(var(--foreground)/0.5)]">
            <CardHeader>
              <CardTitle>2. Pay securely</CardTitle>
              <CardDescription>Get a quote and move to a familiar checkout moment.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Clear pricing and trusted payment cues help remove friction before the first order is placed.
            </CardContent>
          </Card>

          <Card className="transition hover:-translate-y-0.5 hover:shadow-[0_28px_70px_-48px_hsl(var(--foreground)/0.5)]">
            <CardHeader>
              <CardTitle>3. Track live</CardTitle>
              <CardDescription>Follow progress from collection to delivery.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Tracking turns uncertainty into confidence and gives people a reason to come back.
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="animate-enter animate-delay-4 rounded-[2rem] border border-border/80 bg-foreground px-8 py-10 text-background sm:px-10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-background/70">First impression CTA</p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Make the first visit feel credible, fast, and human.
            </h2>
            <p className="max-w-2xl text-sm leading-relaxed text-background/75 sm:text-base">
              When your final photos are ready, these placeholder blocks will turn into the visual proof that this service is real, useful, and worth trusting.
            </p>
          </div>
          <Button
            size="lg"
            variant="secondary"
            className="bg-background text-foreground hover:bg-background/90"
            onClick={() => navigate('/register')}
          >
            Start with AWDelivery
          </Button>
        </div>
      </section>
    </div>
  )
}

export default LandingPage
