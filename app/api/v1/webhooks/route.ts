import { NextRequest } from 'next/server'
import { authenticateApiRequest, createAdminClient, apiError, apiSuccess } from '@/lib/api/auth'

const VALID_EVENTS = [
  'order.created',
  'order.completed',
  'message.created',
  'offer.accepted',
  'approval.requested',
  '*',
]

function generateSecret(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return 'whsec_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// GET — list webhooks for this seller identity
export async function GET(req: NextRequest) {
  const user = await authenticateApiRequest(req)
  if (!user) return apiError('Unauthorized', 401)
  if (!user.seller_identity_id) return apiError('API key must be linked to a seller identity', 403)

  const db = createAdminClient()
  const { data, error } = await db
    .from('webhooks')
    .select('id, url, events, is_active, created_at, updated_at')
    .eq('seller_identity_id', user.seller_identity_id)
    .order('created_at', { ascending: false })

  if (error) return apiError('Failed to fetch webhooks', 500)
  return apiSuccess({ data: data ?? [] })
}

// POST — register a new webhook
export async function POST(req: NextRequest) {
  const user = await authenticateApiRequest(req)
  if (!user) return apiError('Unauthorized', 401)
  if (!user.seller_identity_id) return apiError('API key must be linked to a seller identity', 403)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return apiError('Invalid JSON', 400) }

  const { url, events = ['*'] } = body
  if (!url || typeof url !== 'string') return apiError('url is required', 400)
  if (!url.startsWith('https://')) return apiError('url must be https', 400)

  const invalidEvents = (events as string[]).filter(e => !VALID_EVENTS.includes(e))
  if (invalidEvents.length) return apiError(`Invalid events: ${invalidEvents.join(', ')}. Valid: ${VALID_EVENTS.join(', ')}`, 400)

  const db = createAdminClient()
  const { data, error } = await db
    .from('webhooks')
    .insert({
      seller_identity_id: user.seller_identity_id,
      url,
      secret: generateSecret(),
      events,
      is_active: true,
    })
    .select('id, url, secret, events, is_active, created_at')
    .single()

  if (error) return apiError(error.message, 400)

  return apiSuccess({
    data,
    note: 'Save the secret — it is only shown once. Use it to verify the X-Others-Signature header on incoming requests.',
  }, 201)
}

// PATCH — update a webhook (url, events, is_active)
export async function PATCH(req: NextRequest) {
  const user = await authenticateApiRequest(req)
  if (!user) return apiError('Unauthorized', 401)
  if (!user.seller_identity_id) return apiError('API key must be linked to a seller identity', 403)

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return apiError('id query param required', 400)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return apiError('Invalid JSON', 400) }

  const allowed = ['url', 'events', 'is_active']
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  const db = createAdminClient()
  const { data, error } = await db
    .from('webhooks')
    .update(update)
    .eq('id', id)
    .eq('seller_identity_id', user.seller_identity_id)
    .select('id, url, events, is_active, updated_at')
    .single()

  if (error) return apiError(error.message, 400)
  return apiSuccess({ data })
}

// DELETE — remove a webhook
export async function DELETE(req: NextRequest) {
  const user = await authenticateApiRequest(req)
  if (!user) return apiError('Unauthorized', 401)
  if (!user.seller_identity_id) return apiError('API key must be linked to a seller identity', 403)

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return apiError('id query param required', 400)

  const db = createAdminClient()
  const { error } = await db
    .from('webhooks')
    .delete()
    .eq('id', id)
    .eq('seller_identity_id', user.seller_identity_id)

  if (error) return apiError(error.message, 400)
  return apiSuccess({ success: true })
}
