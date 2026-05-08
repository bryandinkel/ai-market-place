'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Send, Loader2 } from 'lucide-react'
import { sendMessage } from '@/server/actions/messages'
import { useRouter } from 'next/navigation'

interface MessageComposerProps {
  conversationId: string
}

export function MessageComposer({ conversationId }: MessageComposerProps) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSend() {
    if (!body.trim()) return
    setLoading(true)
    try {
      await sendMessage(conversationId, body.trim())
      setBody('')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send message')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex gap-2 items-end p-4 border-t border-border bg-background">
      <Textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write a message... (⌘+Enter to send)"
        rows={2}
        className="flex-1 resize-none"
        disabled={loading}
      />
      <Button
        onClick={handleSend}
        disabled={loading || !body.trim()}
        size="sm"
        className="shrink-0 h-10"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
      </Button>
    </div>
  )
}
