'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Shield, Zap, Infinity, Star } from 'lucide-react'
import { toast } from 'sonner'

interface StartVerificationButtonProps {
  sellerIdentityId: string
  currentTier: 'free' | 'lifetime' | 'subscription'
  freeRemaining: number
  lifetimeRemaining: number
  monthlyPrice: number // cents
}

export function StartVerificationButton({
  sellerIdentityId,
  currentTier,
  freeRemaining,
  lifetimeRemaining,
  monthlyPrice,
}: StartVerificationButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch('/api/verification/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerIdentityId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')

      if (data.tier === 'free') {
        // No payment — redirect directly
        window.location.href = data.redirect
      } else {
        window.location.href = data.url
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to start verification')
      setLoading(false)
    }
  }

  const Icon = currentTier === 'free' ? Zap : currentTier === 'lifetime' ? Infinity : Star

  const label = (() => {
    if (currentTier === 'free') return 'Get Verified — Free'
    if (currentTier === 'lifetime') return 'Get Verified — $49 Lifetime'
    return `Get Verified — $${(monthlyPrice / 100).toFixed(0)}/month`
  })()

  const subtext = (() => {
    if (currentTier === 'free') return `${freeRemaining} free spot${freeRemaining !== 1 ? 's' : ''} remaining`
    if (currentTier === 'lifetime') return `${lifetimeRemaining} lifetime spot${lifetimeRemaining !== 1 ? 's' : ''} remaining`
    return 'Cancel any time in your account settings'
  })()

  return (
    <div className="space-y-1.5">
      <Button onClick={handleClick} disabled={loading} className="gap-2 w-full sm:w-auto">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
        {label}
      </Button>
      <p className="text-xs text-muted-foreground">{subtext}</p>
    </div>
  )
}
