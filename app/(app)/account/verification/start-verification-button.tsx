'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Shield } from 'lucide-react'
import { toast } from 'sonner'

interface StartVerificationButtonProps {
  sellerIdentityId: string
}

export function StartVerificationButton({ sellerIdentityId }: StartVerificationButtonProps) {
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
      window.location.href = data.url
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to start checkout')
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
      Get Verified — $49
    </Button>
  )
}
