import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, apiError, apiSuccess } from '@/lib/api/auth'

function generateSecret(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return 'whsec_' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function ownsSellerIdentity(userId: string, sellerId: string): Promise<boolean> {
  const db = createAdminClient()
  const { data } = await db
    .from('seller_identities')
    .select('id')
    .eq('id', sellerId)
    .eq('account_id', userId)
    .single()
  return !!data
}

export async function GET(req: NextRequest) {
  const user = await getUser()
  if (!user) return apiError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const sellerId = searchParams.get('seller_id')
  if (!sellerId) return apiError('seller_id required', 400)
  if (!await ownsSellerIdentity(user.id, sellerId)) return apiError('Forbidden', 403)

  const db = createAdminClient()
  const { data, error } = await db
    .from('webhooks')
    .select('id, url, events, is_active, created_at')
    .eq('seller_identity_id', sellerId)
    .order('created_at', { ascending: false })

  if (error) return apiError('Failed to fetch', 500)
  return apiSuccess({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const user = await getUser()
  if (!user) return apiError('Unauthorized', 401)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return apiError('Invalid JSON', 400) }

  const { seller_identity_id, url, events = ['order.created', 'message.created'] } = body
  if (!seller_identity_id || !url) return apiError('seller_identity_id and url required', 400)
  if (!await ownsSellerIdentity(user.id, seller_identity_id as string)) return apiError('Forbidden', 403)
  if (!(url as string).startsWith('https://')) return apiError('URL must be https', 400)

  const db = createAdminClient()
  const secret = generateSecret()
  const { data, error } = await db
    .from('webhooks')
    .insert({ seller_identity_id, url, secret, events, is_active: true })
    .select('id, url, secret, events, is_active, created_at')
    .single()

  if (error) return apiError(error.message, 400)
  return apiSuccess({ data }, 201)
}

export async function PATCH(req: NextRequest) {
  const user = await getUser()
  if (!user) return apiError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return apiError('id required', 400)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return apiError('Invalid JSON', 400) }

  // Verify ownership via join
  const db = createAdminClient()
  const { data: wh } = await db
    .from('webhooks')
    .select('seller_identity_id')
    .eq('id', id)
    .single()
  if (!wh || !await ownsSellerIdentity(user.id, wh.seller_identity_id)) return apiError('Forbidden', 403)

  const allowed = ['url', 'events', 'is_active']
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) { if (key in body) update[key] = body[key] }

  const { data, error } = await db
    .from('webhooks').update(update).eq('id', id)
    .select('id, url, events, is_active').single()

  if (error) return apiError(error.message, 400)
  return apiSuccess({ data })
}

export async function DELETE(req: NextRequest) {
  const user = await getUser()
  if (!user) return apiError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return apiError('id required', 400)

  const db = createAdminClient()
  const { data: wh } = await db
    .from('webhooks').select('seller_identity_id').eq('id', id).single()
  if (!wh || !await ownsSellerIdentity(user.id, wh.seller_identity_id)) return apiError('Forbidden', 403)

  const { error } = await db.from('webhooks').delete().eq('id', id)
  if (error) return apiError(error.message, 400)
  return apiSuccess({ success: true })
}
