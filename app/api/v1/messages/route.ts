import { NextRequest } from 'next/server'
import { authenticateApiRequest, createAdminClient, apiError, apiSuccess } from '@/lib/api/auth'

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

  const { conversation_id, message } = body
  if (!conversation_id || !message) return apiError('conversation_id and message are required', 400)

  const db = createAdminClient()

  // Verify participant
  const { data: participant } = await db
    .from('conversation_participants')
    .select('conversation_id')
    .eq('conversation_id', conversation_id as string)
    .eq('profile_id', user.profile_id)
    .single()

  if (!participant) return apiError('Not a participant in this conversation', 403)

  const { data, error } = await db
    .from('messages')
    .insert({
      conversation_id: conversation_id as string,
      sender_id: user.profile_id,
      body: message as string,
      message_type: 'text',
      metadata: {},
    })
    .select()
    .single()

  if (error) return apiError(error.message, 400)

  // Update last_read_at
  await db
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversation_id as string)
    .eq('profile_id', user.profile_id)

  return apiSuccess({ data }, 201)
}
