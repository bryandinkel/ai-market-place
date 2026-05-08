import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Inbox } from 'lucide-react'
import { formatRelativeTime, truncate, getInitials } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const CONTEXT_TYPE_STYLES: Record<string, string> = {
  listing: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  task: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  order: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  direct: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

interface ConversationRow {
  conversation_id: string
  conversations: {
    id: string
    subject: string | null
    context_type: string
    created_at: string
    messages: {
      body: string
      sender_id: string
      created_at: string
    }[]
  } | null
}

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rows } = await supabase
    .from('conversation_participants')
    .select(
      'conversation_id, conversations(id, subject, context_type, created_at, messages(body, sender_id, created_at))'
    )
    .eq('profile_id', user.id)

  const conversations = ((rows as ConversationRow[] | null) ?? [])
    .filter((r) => r.conversations !== null)
    .map((r) => {
      const conv = r.conversations!
      // Sort messages descending to get the latest
      const sorted = [...(conv.messages ?? [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      const last = sorted[0] ?? null
      return { ...conv, lastMessage: last }
    })
    .sort((a, b) => {
      const aTime = a.lastMessage?.created_at ?? a.created_at
      const bTime = b.lastMessage?.created_at ?? b.created_at
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    })

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <MessageSquare className="h-6 w-6 text-indigo-400" />
          <h1 className="text-2xl font-semibold text-white">Messages</h1>
        </div>

        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Inbox className="h-12 w-12 text-white/20 mb-4" />
            <p className="text-white/40 text-lg">No conversations yet</p>
            <p className="text-white/25 text-sm mt-1">
              Messages from orders and listings will appear here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {conversations.map((conv) => {
              const contextStyle =
                CONTEXT_TYPE_STYLES[conv.context_type] ?? CONTEXT_TYPE_STYLES.direct
              const subject = conv.subject ?? 'Untitled conversation'
              const lastBody = conv.lastMessage?.body ?? null
              const lastTime = conv.lastMessage?.created_at ?? conv.created_at
              const initials = getInitials(subject)

              return (
                <Link
                  key={conv.id}
                  href={`/messages/${conv.id}`}
                  className="group flex items-center gap-4 rounded-xl px-4 py-4 hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
                >
                  {/* Avatar / icon */}
                  <Avatar className="h-10 w-10 shrink-0 bg-indigo-500/20 border border-indigo-500/30">
                    <AvatarFallback className="bg-transparent text-indigo-300 text-xs font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-white font-medium text-sm truncate">
                        {subject}
                      </span>
                      <Badge
                        variant="outline"
                        className={`shrink-0 text-[10px] px-1.5 py-0 h-4 capitalize ${contextStyle}`}
                      >
                        {conv.context_type}
                      </Badge>
                    </div>
                    {lastBody ? (
                      <p className="text-white/40 text-xs truncate">
                        {truncate(lastBody, 80)}
                      </p>
                    ) : (
                      <p className="text-white/25 text-xs italic">No messages yet</p>
                    )}
                  </div>

                  {/* Time */}
                  <span className="shrink-0 text-white/30 text-xs">
                    {formatRelativeTime(lastTime)}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
