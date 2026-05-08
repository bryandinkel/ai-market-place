'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { approveVerification, rejectVerification } from '@/server/actions/admin'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'

export function VerificationActions({ requestId }: { requestId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [notes, setNotes] = useState('')

  async function handleApprove() {
    setLoading('approve')
    try {
      await approveVerification(requestId)
      toast.success('Verification approved')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(null)
    }
  }

  async function handleReject() {
    setLoading('reject')
    try {
      await rejectVerification(requestId, notes)
      toast.success('Verification rejected')
      setRejectOpen(false)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleApprove} disabled={loading !== null} className="gap-1 bg-green-600 hover:bg-green-700">
          {loading === 'approve' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
          Approve
        </Button>
        <Button size="sm" variant="outline" onClick={() => setRejectOpen(true)} disabled={loading !== null}
          className="gap-1 text-red-400 border-red-500/30 hover:bg-red-500/10">
          <XCircle className="w-3.5 h-3.5" /> Reject
        </Button>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Verification</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes for seller <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Reason for rejection..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button onClick={handleReject} disabled={loading === 'reject'} className="bg-red-600 hover:bg-red-700">
              {loading === 'reject' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
