'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { CheckCircle, RotateCcw, AlertTriangle, Star, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { acceptDelivery, requestRevision, openDispute, submitReview, type SubmitReviewData } from '@/server/actions/orders'
import { useRouter } from 'next/navigation'

interface OrderActionsProps {
  orderId: string
  orderStatus: string
  orderType: string
  sellerIdentityId: string
  hasReview: boolean
}

function StarRating({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className={`transition-colors ${star <= value ? 'text-amber-400' : 'text-muted-foreground'}`}
          >
            <Star className="w-5 h-5 fill-current" />
          </button>
        ))}
      </div>
    </div>
  )
}

export function OrderActions({ orderId, orderStatus, sellerIdentityId, hasReview }: OrderActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [revisionOpen, setRevisionOpen] = useState(false)
  const [disputeOpen, setDisputeOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [revisionText, setRevisionText] = useState('')
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeDesc, setDisputeDesc] = useState('')
  const [ratings, setRatings] = useState({
    speed: 5,
    quality: 5,
    communication: 5,
    accuracy: 5,
    fulfillmentMatch: 5,
  })
  const [reviewText, setReviewText] = useState('')

  async function handleAccept() {
    setLoading('accept')
    try {
      await acceptDelivery(orderId)
      toast.success('Delivery accepted — order completed!')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(null)
    }
  }

  async function handleRevision() {
    if (!revisionText.trim()) return
    setLoading('revision')
    try {
      await requestRevision(orderId, revisionText)
      toast.success('Revision requested')
      setRevisionOpen(false)
      setRevisionText('')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(null)
    }
  }

  async function handleDispute() {
    if (!disputeReason.trim()) return
    setLoading('dispute')
    try {
      await openDispute(orderId, disputeReason, disputeDesc)
      toast.success('Dispute opened — our team will review')
      setDisputeOpen(false)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(null)
    }
  }

  async function handleReview() {
    setLoading('review')
    try {
      const data: SubmitReviewData = {
        orderId,
        sellerIdentityId,
        speedRating: ratings.speed,
        qualityRating: ratings.quality,
        communicationRating: ratings.communication,
        accuracyRating: ratings.accuracy,
        fulfillmentMatchRating: ratings.fulfillmentMatch,
        reviewText: reviewText.trim() || undefined,
      }
      await submitReview(data)
      toast.success('Review submitted — thank you!')
      setReviewOpen(false)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(null)
    }
  }

  const isDelivered = orderStatus === 'delivered'
  const isCompleted = orderStatus === 'completed'
  const canDispute = ['paid', 'in_progress', 'delivered', 'revision_requested'].includes(orderStatus)

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {isDelivered && (
          <>
            <Button onClick={handleAccept} disabled={loading !== null} className="gap-1.5">
              {loading === 'accept' ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Accept Delivery
            </Button>
            <Button variant="outline" onClick={() => setRevisionOpen(true)} disabled={loading !== null} className="gap-1.5">
              <RotateCcw className="w-4 h-4" /> Request Revision
            </Button>
          </>
        )}
        {isCompleted && !hasReview && (
          <Button onClick={() => setReviewOpen(true)} disabled={loading !== null} className="gap-1.5">
            <Star className="w-4 h-4" /> Leave a Review
          </Button>
        )}
        {canDispute && (
          <Button variant="outline" onClick={() => setDisputeOpen(true)} disabled={loading !== null}
            className="gap-1.5 text-red-400 border-red-500/30 hover:bg-red-500/10">
            <AlertTriangle className="w-4 h-4" /> Open Dispute
          </Button>
        )}
      </div>

      {/* Revision dialog */}
      <Dialog open={revisionOpen} onOpenChange={setRevisionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a Revision</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Describe what you'd like changed..."
            value={revisionText}
            onChange={e => setRevisionText(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisionOpen(false)}>Cancel</Button>
            <Button onClick={handleRevision} disabled={!revisionText.trim() || loading === 'revision'}>
              {loading === 'revision' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute dialog */}
      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open a Dispute</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">Reason</label>
              <Textarea
                placeholder="Briefly describe the issue..."
                value={disputeReason}
                onChange={e => setDisputeReason(e.target.value)}
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Additional details <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Textarea
                placeholder="Any other context..."
                value={disputeDesc}
                onChange={e => setDisputeDesc(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeOpen(false)}>Cancel</Button>
            <Button onClick={handleDispute} disabled={!disputeReason.trim() || loading === 'dispute'}
              className="bg-red-600 hover:bg-red-700">
              {loading === 'dispute' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Open Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review dialog */}
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Leave a Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <StarRating label="Speed" value={ratings.speed} onChange={v => setRatings(r => ({ ...r, speed: v }))} />
            <StarRating label="Quality" value={ratings.quality} onChange={v => setRatings(r => ({ ...r, quality: v }))} />
            <StarRating label="Communication" value={ratings.communication} onChange={v => setRatings(r => ({ ...r, communication: v }))} />
            <StarRating label="Accuracy" value={ratings.accuracy} onChange={v => setRatings(r => ({ ...r, accuracy: v }))} />
            <StarRating label="Fulfillment match" value={ratings.fulfillmentMatch} onChange={v => setRatings(r => ({ ...r, fulfillmentMatch: v }))} />
            <div>
              <label className="text-sm font-medium">Written review <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Textarea
                placeholder="Share your experience..."
                value={reviewText}
                onChange={e => setReviewText(e.target.value)}
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancel</Button>
            <Button onClick={handleReview} disabled={loading === 'review'}>
              {loading === 'review' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
