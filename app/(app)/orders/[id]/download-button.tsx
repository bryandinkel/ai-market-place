'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface DownloadButtonProps {
  orderId: string
  filename: string
}

export function DownloadButton({ orderId, filename }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/${orderId}/download`)
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || 'Download failed')
      }
      const { url } = await res.json()
      window.open(url, '_blank')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleDownload} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      Download {filename}
    </Button>
  )
}
