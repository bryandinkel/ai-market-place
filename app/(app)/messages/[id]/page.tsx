import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Bot, Info, Tag } from 'lucide-react'
import Link from 'next/link'
import { formatRelativeTime, getInitials } from '@/lib/utils'
import { MessageComposer } from './message-composer'
import { markConversationRead } from '@/server/actions/messages'

const CONTEXT_TYPE_STYLES: Record<string, string> = {
  listing: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  task: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  order: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  direct: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

const MESSAGE_TYPE_STYLES: Record<string, string> = {
  system: 'bg-white/5 border border-white/10 text-white/50 text-xs italic text-center py-2 px-4 rounded-lg',
  offer: 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 rounded-xl px-4 py-3',
  approval_request: 'bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-xl px-4 py-3',
  text: '',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ConversationPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify the user is a participant
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('conversation_id, last_read_at')
    .eq('conversation_id', id)
    .eq('profile_id', user.id)
    .single()

  if (!participant) notFound()

  // Fetch conversation
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id, subject, context_type, context_id, created_at')
    .eq('id', id)
    .single()

  if (!conversation) notFound()

  // Fetch all messages
  const { data: messages } = await supabase
    .from('messages')
    .select('id, sender_id, body, message_type, metadata, created_at')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  // Fetch all participants with their profile data
  const { data: participants } = await supabase
    .from('conversation_participants')
    .select('profile_id, profiles(id, full_name, avatar_url, username)')
    .eq('conversation_id', id)

  // Build a map of sender_id → profile
  const profileMap: Record<string, { full_name: string | null; avatar_url: string | null; username: string | null }> = {}
  for (const p of participants ?? []) {
    const profile = (p as { profile_id: string; profiles: { full_name: string | null; avatar_url: string | null; username: string | null } | null }).profiles
    if (profile) {
      profileMap[p.profile_id] = profile
    }
  }

  // Mark as read (fire-and-forget server action)
  await markConversationRead(id)

  const subject = conversation.subject ?? 'Conversation'
  const contextStyle = CONTEXT_TYPE_STYLES[conversation.context_type] ?? CONTEXT_TYPE_STYLES.direct

  return (
    <div className="min-h-screen bg-[#0A0A0F] flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0A0A0F]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/messages"
            className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-white font-medium text-sm truncate">{subject}</h1>
              <Badge
                variant="outline"
                className={`shrink-0 text-[10px] px-1.5 py-0 h-4 capitalize ${contextStyle}`}
              >
                {conversation.context_type}
              </Badge>
            </div>
            <p className="text-white/30 text-xs">
              {(participants ?? []).length} participant
              {(participants ?? []).length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Messages thread */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-6 flex flex-col gap-4">
        {(messages ?? []).length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Info className="h-8 w-8 text-white/20 mb-3" />
            <p className="text-white/30 text-sm">No messages yet. Start the conversation.</p>
          </div>
        )}

        {(messages ?? []).map((msg) => {
          const isOwn = msg.sender_id === user.id
          const msgType = msg.message_type as string

          // System messages: centered, no avatar
          if (msgType === 'system') {
            return (
              <div key={msg.id} className="flex justify-center">
                <div className={MESSAGE_TYPE_STYLES.system}>
                  <Bot className="inline h-3 w-3 mr-1 mb-0.5" />
                  {msg.body}
                </div>
              </div>
            )
          }

          // Offer / approval_request: distinct card styling
          if (msgType === 'offer' || msgType === 'approval_request') {
            const icon = msgType === 'offer' ? <Tag className="h-4 w-4 mr-2 shrink-0" /> : <Info className="h-4 w-4 mr-2 shrink-0" />
            const profile = profileMap[msg.sender_id]
            const name = profile?.full_name ?? 'Unknown'
            return (
              <div key={msg.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                <Avatar className="h-8 w-8 shrink-0 mt-1">
                  {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={name} />}
                  <AvatarFallback className="bg-indigo-500/20 text-indigo-300 text-xs">
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
                <div className={`max-w-md ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                  {!isOwn && (
                    <span className="text-white/40 text-[11px] px-1">{name}</span>
                  )}
                  <div className={MESSAGE_TYPE_STYLES[msgType]}>
                    <div className="flex items-start text-[11px] uppercase tracking-wide font-semibold mb-1 opacity-70">
                      {icon}
                      {msgType === 'offer' ? 'Offer' : 'Approval Request'}
                    </div>
                    <p className="text-sm leading-relaxed">{msg.body}</p>
                  </div>
                  <span className="text-white/25 text-[10px] px-1">
                    {formatRelativeTime(msg.created_at)}
                  </span>
                </div>
              </div>
            )
          }

          // Regular text messages
          const profile = profileMap[msg.sender_id]
          const name = profile?.full_name ?? 'Unknown'

          return (
            <div key={msg.id} className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
              <Avatar className="h-8 w-8 shrink-0 mt-1">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={name} />}
                <AvatarFallback className="bg-white/10 text-white/60 text-xs">
                  {getInitials(name)}
                </AvatarFallback>
              </Avatar>
              <div className={`max-w-md flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
                {!isOwn && (
                  <span className="text-white/40 text-[11px] px-1">{name}</span>
                )}
                <div
                  className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isOwn
                      ? 'bg-indigo-600 text-white rounded-tr-sm'
                      : 'bg-white/8 text-white/90 border border-white/10 rounded-tl-sm'
                  }`}
                >
                  {msg.body}
                </div>
                <span className="text-white/25 text-[10px] px-1">
                  {formatRelativeTime(msg.created_at)}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Composer */}
      <div className="sticky bottom-0 bg-[#0A0A0F]/95 backdrop-blur border-t border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <MessageComposer conversationId={id} />
        </div>
      </div>
    </div>
  )
}
