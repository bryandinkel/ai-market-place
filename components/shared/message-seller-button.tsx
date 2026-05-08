'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { MessageSquare, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { startConversation } from '@/server/actions/messages'

interface MessageSellerButtonProps {
  sellerIdentityId: string
  listingId: string
  listingTitle: string
  sellerName: string
}

export function MessageSellerButton({
  sellerIdentityId,
  listingId,
  listingTitle,
  sellerName,
}: MessageSellerButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSend() {
    if (!message.trim()) return
    setLoading(true)
    try {
      const conversationId = await startConversation({
        sellerIdentityId,
        listingId,
        subject: listingTitle,
        firstMessage: message.trim(),
      })
      toast.success('Message sent!')
      setOpen(false)
      router.push(`/messages/${conversationId}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <MessageSquare className="w-4 h-4 mr-2" />
        Message seller
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Message {sellerName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Re: <span className="font-medium text-foreground">{listingTitle}</span>
            </p>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Hi! I have a question about your listing..."
              rows={4}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={!message.trim() || loading}>
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : 'Send message'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
