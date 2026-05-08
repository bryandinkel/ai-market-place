'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { approveRequest, rejectRequest } from '@/server/actions/workspace'
import { useRouter } from 'next/navigation'

export function ApprovalActions({ requestId }: { requestId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)

  async function handle(action: 'approve' | 'reject') {
    setLoading(action)
    try {
      if (action === 'approve') {
        await approveRequest(requestId)
        toast.success('Approved')
      } else {
        await rejectRequest(requestId)
        toast.success('Rejected')
      }
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex gap-2 shrink-0">
      <Button
        size="sm"
        variant="outline"
        className="text-green-400 border-green-500/30 hover:bg-green-500/10 hover:text-green-300"
        onClick={() => handle('approve')}
        disabled={loading !== null}
      >
        {loading === 'approve' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="text-red-400 border-red-500/30 hover:bg-red-500/10 hover:text-red-300"
        onClick={() => handle('reject')}
        disabled={loading !== null}
      >
        {loading === 'reject' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
      </Button>
    </div>
  )
}
