import { NextRequest } from 'next/server'
import { authenticateApiRequest, createAdminClient, apiError, apiSuccess } from '@/lib/api/auth'

// GET /api/v1/conversations — alias for GET /api/v1/messages (list conversations)
// POST /api/v1/conversations — start a new conversation with a seller

export async function GET(req: NextRequest) {
  const user = await authenticateApiRequest(req)
  if (!user) return apiError('Unauthorized', 401)

  const db = createAdminClient()
  const { data, error } = await db
    .from('conversation_participants')
    .select(`
      conversation_id, last_read_at,
      conversations (
        id, context_type, context_id, subject, created_at,
        messages (id, body, message_type, created_at, sender_id)
      )
    `)
    .eq('profile_id', user.profile_id)
    .order('conversation_id', { ascending: false })
    .limit(50)

  if (error) return apiError('Failed to fetch conversations', 500)
  return apiSuccess({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await authenticateApiRequest(req)
  if (!user) return apiError('Unauthorized', 401)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return apiError('Invalid JSON', 400) }

  // Accept seller by slug or seller_identity_id, plus optional context
  const { seller_slug, seller_identity_id, subject, message, listing_id, task_id } = body

  if (!seller_slug && !seller_identity_id) {
    return apiError('seller_slug or seller_identity_id is required', 400)
  }
  if (!message || typeof message !== 'string') {
    return apiError('message is required', 400)
  }

  const db = createAdminClient()

  // Resolve seller profile_id
  let sellerProfileId: string | null = null
  let resolvedSellerIdentityId: string | null = seller_identity_id as string ?? null

  if (seller_slug) {
    const { data: si } = await db
      .from('seller_identities')
      .select('id, account_id')
      .eq('slug', seller_slug as string)
      .single()
    if (!si) return apiError('Seller not found', 404)
    sellerProfileId = si.account_id
    resolvedSellerIdentityId = si.id
  } else {
    const { data: si } = await db
      .from('seller_identities')
      .select('id, account_id')
      .eq('id', resolvedSellerIdentityId!)
      .single()
    if (!si) return apiError('Seller identity not found', 404)
    sellerProfileId = si.account_id
  }

  if (sellerProfileId === user.profile_id) {
    return apiError('Cannot start a conversation with yourself', 400)
  }

  // Check for existing conversation between these two parties with same context
  const contextType = listing_id ? 'listing' : task_id ? 'task' : 'direct'
  const contextId = (listing_id ?? task_id ?? null) as string | null

  const { data: existingParticipations } = await db
    .from('conversation_participants')
    .select('conversation_id')
    .eq('profile_id', user.profile_id)

  const myConvIds = (existingParticipations ?? []).map(p => p.conversation_id)

  if (myConvIds.length > 0) {
    const { data: shared } = await db
      .from('conversation_participants')
      .select('conversation_id, conversations(id, context_type, context_id)')
      .eq('profile_id', sellerProfileId)
      .in('conversation_id', myConvIds)

    if (shared && shared.length > 0) {
      const match = shared.find(s => {
        const conv = s.conversations as { id: string; context_type: string; context_id: string | null } | null
        if (!conv) return false
        if (contextType === 'direct') return conv.context_type === 'direct'
        return conv.context_type === contextType && conv.context_id === contextId
      })
      if (match) {
        // Existing conversation — send the message and return
        await db.from('messages').insert({
          conversation_id: match.conversation_id,
          sender_id: user.profile_id,
          body: message,
          message_type: 'text',
          metadata: {},
        })
        return apiSuccess({
          data: { conversation_id: match.conversation_id, created: false },
          note: 'Existing conversation found — message added.',
        }, 200)
      }
    }
  }

  // Create new conversation
  const { data: conversation, error: convError } = await db
    .from('conversations')
    .insert({
      context_type: contextType,
      context_id: contextId,
      subject: (subject as string) ?? null,
    })
    .select()
    .single()

  if (convError || !conversation) return apiError('Failed to create conversation', 500)

  // Add both participants
  await db.from('conversation_participants').insert([
    { conversation_id: conversation.id, profile_id: user.profile_id },
    { conversation_id: conversation.id, profile_id: sellerProfileId },
  ])

  // Send the first message
  await db.from('messages').insert({
    conversation_id: conversation.id,
    sender_id: user.profile_id,
    body: message,
    message_type: 'text',
    metadata: {},
  })

  return apiSuccess({
    data: {
      conversation_id: conversation.id,
      seller_identity_id: resolvedSellerIdentityId,
      context_type: contextType,
      context_id: contextId,
      created: true,
    },
  }, 201)
}
