'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface CancelVerificationButtonProps {
  sellerIdentityId: string
  tier: 'free' | 'lifetime' | 'subscription'
  label: string
  variant?: 'default' | 'destructive' | 'outline' | 'ghost'
}

export function CancelVerificationButton({
  sellerIdentityId,
  tier,
  label,
  variant = 'outline',
}: CancelVerificationButtonProps) {
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  async function handleCancel() {
    setLoading(true)
    try {
      const res = await fetch('/api/verification/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerIdentityId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(data.message)
      // Reload to reflect new status
      window.location.reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
      setConfirming(false)
    }
  }

  if (!confirming) {
    return (
      <Button
        variant={variant}
        size="sm"
        className="text-xs text-muted-foreground"
        onClick={() => setConfirming(true)}
      >
        {label}
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 text-xs text-amber-400">
        <AlertTriangle className="w-3.5 h-3.5" />
        {tier === 'subscription'
          ? 'Your badge stays active until the billing period ends.'
          : tier === 'lifetime'
            ? 'No refund — your $49 lifetime spot will be permanently removed.'
            : 'Your free spot will be released and cannot be reclaimed.'}
      </div>
      <div className="flex gap-2">
        <Button
          variant="destructive"
          size="sm"
          className="text-xs h-7"
          disabled={loading}
          onClick={handleCancel}
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs h-7"
          onClick={() => setConfirming(false)}
        >
          Keep it
        </Button>
      </div>
    </div>
  )
}
