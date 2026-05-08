'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createNotification } from '@/server/actions/notifications'

export async function sendMessage(conversationId: string, body: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  if (!body.trim()) throw new Error('Message body cannot be empty')

  // Verify user is a participant
  const { data: participant } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('conversation_id', conversationId)
    .eq('profile_id', user.id)
    .single()

  if (!participant) throw new Error('Not authorized to send messages in this conversation')

  const { error: insertError } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: body.trim(),
      message_type: 'text',
    })

  if (insertError) throw new Error(insertError.message)

  // Notify all other participants
  const { data: allParticipants } = await supabase
    .from('conversation_participants')
    .select('profile_id')
    .eq('conversation_id', conversationId)
    .neq('profile_id', user.id)

  const { data: conv } = await supabase
    .from('conversations')
    .select('subject')
    .eq('id', conversationId)
    .single()

  const subject = conv?.subject ?? 'a conversation'

  for (const p of allParticipants ?? []) {
    await createNotification({
      userId: p.profile_id,
      type: 'message_received',
      title: 'New message',
      body: `You have a new message in "${subject}".`,
      actionUrl: `/messages/${conversationId}`,
    })
  }

  revalidatePath(`/messages/${conversationId}`)
  revalidatePath('/messages')
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('profile_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath(`/messages/${conversationId}`)
  revalidatePath('/messages')
}

// ── Start a new conversation from a listing page ──────────────────────────
export async function startConversation({
  sellerIdentityId,
  listingId,
  subject,
  firstMessage,
}: {
  sellerIdentityId: string
  listingId: string
  subject: string
  firstMessage: string
}): Promise<string> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  // Get the seller account id
  const { data: identity } = await supabase
    .from('seller_identities')
    .select('account_id')
    .eq('id', sellerIdentityId)
    .single()

  if (!identity) throw new Error('Seller not found')

  // Check if a conversation already exists between these two for this listing
  const { data: existing } = await supabase
    .from('conversations')
    .select('id, conversation_participants!inner(profile_id)')
    .eq('context_type', 'listing')
    .eq('context_id', listingId)

  for (const conv of existing ?? []) {
    const participants = (conv.conversation_participants as { profile_id: string }[])
    const ids = participants.map(p => p.profile_id)
    if (ids.includes(user.id) && ids.includes(identity.account_id)) {
      return conv.id
    }
  }

  // Create conversation
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .insert({
      context_type: 'listing',
      context_id: listingId,
      subject,
    })
    .select('id')
    .single()

  if (convError || !conv) throw new Error(convError?.message ?? 'Failed to create conversation')

  // Add both participants
  await supabase.from('conversation_participants').insert([
    { conversation_id: conv.id, profile_id: user.id },
    { conversation_id: conv.id, profile_id: identity.account_id },
  ])

  // Send first message
  await supabase.from('messages').insert({
    conversation_id: conv.id,
    sender_id: user.id,
    body: firstMessage.trim(),
    message_type: 'text',
  })

  // Notify the seller
  await createNotification({
    userId: identity.account_id,
    type: 'message_received',
    title: 'New message about your listing',
    body: `Someone sent you a message about "${subject}".`,
    actionUrl: `/messages/${conv.id}`,
  })

  revalidatePath('/messages')
  return conv.id
}
