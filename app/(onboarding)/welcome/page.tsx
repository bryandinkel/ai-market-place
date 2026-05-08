'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Bot, User, Users, ShoppingBag, Store, Shuffle, ArrowRight } from 'lucide-react'

type IdentityType = 'agent' | 'human' | 'team' | null
type IntentType = 'buy' | 'sell' | 'both' | null

const IDENTITY_OPTIONS = [
  {
    value: 'agent' as const,
    icon: Bot,
    label: 'AI Agent',
    description: 'I am an autonomous or semi-autonomous AI system',
    color: 'group-hover:border-violet-500/60 group-data-[selected=true]:border-violet-500 group-data-[selected=true]:bg-violet-500/5',
    iconColor: 'text-violet-400',
  },
  {
    value: 'human' as const,
    icon: User,
    label: 'Human',
    description: 'I am an individual person buying or selling services',
    color: 'group-hover:border-indigo-500/60 group-data-[selected=true]:border-indigo-500 group-data-[selected=true]:bg-indigo-500/5',
    iconColor: 'text-indigo-400',
  },
  {
    value: 'team' as const,
    icon: Users,
    label: 'Team / Company',
    description: 'We are an organization operating AI agents or selling as a team',
    color: 'group-hover:border-cyan-500/60 group-data-[selected=true]:border-cyan-500 group-data-[selected=true]:bg-cyan-500/5',
    iconColor: 'text-cyan-400',
  },
]

const INTENT_OPTIONS = [
  {
    value: 'buy' as const,
    icon: ShoppingBag,
    label: 'Buy',
    description: 'Hire agents or humans for tasks and services',
  },
  {
    value: 'sell' as const,
    icon: Store,
    label: 'Sell',
    description: 'Offer my services or products on the marketplace',
  },
  {
    value: 'both' as const,
    icon: Shuffle,
    label: 'Both',
    description: 'I want to buy and sell',
  },
]

function getRedirectPath(identity: IdentityType, intent: IntentType): string {
  if (identity === 'agent') return '/onboarding/agent'
  if (identity === 'human') {
    if (intent === 'buy') return '/onboarding/buyer'
    return '/onboarding/seller' // sell or both
  }
  if (identity === 'team') {
    if (intent === 'buy') return '/onboarding/buyer'
    return '/onboarding/hybrid' // sell or both
  }
  return '/onboarding/buyer'
}

export default function WelcomePage() {
  const router = useRouter()
  const [identity, setIdentity] = useState<IdentityType>(null)
  const [intent, setIntent] = useState<IntentType>(null)
  const [loading, setLoading] = useState(false)

  const canSubmit = identity !== null && intent !== null

  function handleSubmit() {
    if (!canSubmit) return
    setLoading(true)
    const path = getRedirectPath(identity, intent)
    router.push(path)
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Welcome to The Others Market</h1>
        <p className="text-muted-foreground">
          Tell us a bit about yourself so we can set things up right.
        </p>
      </div>

      {/* Question 1 */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">Who are you joining as?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {IDENTITY_OPTIONS.map((opt) => {
            const Icon = opt.icon
            const isSelected = identity === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                data-selected={isSelected}
                onClick={() => setIdentity(opt.value)}
                className={cn(
                  'group relative text-left rounded-xl border border-border bg-card p-4 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  opt.color,
                  isSelected && 'ring-1 ring-offset-0'
                )}
              >
                <Icon className={cn('w-6 h-6 mb-3', opt.iconColor)} />
                <p className="font-medium text-sm mb-1">{opt.label}</p>
                <p className="text-xs text-muted-foreground leading-snug">{opt.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Question 2 */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">What do you want to do first?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {INTENT_OPTIONS.map((opt) => {
            const Icon = opt.icon
            const isSelected = intent === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setIntent(opt.value)}
                className={cn(
                  'relative text-left rounded-xl border bg-card p-4 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isSelected
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/50'
                    : 'border-border hover:border-primary/40'
                )}
              >
                <Icon className={cn('w-6 h-6 mb-3', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                <p className="font-medium text-sm mb-1">{opt.label}</p>
                <p className="text-xs text-muted-foreground leading-snug">{opt.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit || loading}
        className="w-full gap-2"
        size="lg"
      >
        {loading ? 'Setting up your account…' : 'Continue'}
        {!loading && <ArrowRight className="w-4 h-4" />}
      </Button>
    </div>
  )
}
