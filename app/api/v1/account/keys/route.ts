import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, hashApiKey, apiError, apiSuccess } from '@/lib/api/auth'

function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return 'tom_' + Array.from(bytes).map(b => chars[b % chars.length]).join('')
}

// GET — list all keys for the authenticated user (via session, not API key)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthorized', 401)

  const db = createAdminClient()
  const { data, error } = await db
    .from('api_keys')
    .select('id, name, seller_identity_id, scopes, is_active, last_used_at, created_at, expires_at')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return apiError('Failed to fetch keys', 500)

  return apiSuccess({ data: data ?? [] })
}

// POST — create a new API key (via session auth)
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthorized', 401)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return apiError('Invalid JSON', 400) }

  const { name, seller_identity_id, scopes = ['read', 'write'] } = body
  if (!name) return apiError('name is required', 400)

  const rawKey = generateApiKey()
  const db = createAdminClient()

  const { data, error } = await db
    .from('api_keys')
    .insert({
      profile_id: user.id,
      seller_identity_id: seller_identity_id as string ?? null,
      name: name as string,
      key_hash: hashApiKey(rawKey),
      scopes,
      is_active: true,
    })
    .select('id, name, scopes, is_active, created_at')
    .single()

  if (error) return apiError(error.message, 400)

  // Return the raw key ONCE — not stored again
  return apiSuccess({ data: { ...data, key: rawKey, warning: 'Save this key now. It will not be shown again.' } }, 201)
}

// DELETE — deactivate a key
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const keyId = searchParams.get('id')
  if (!keyId) return apiError('id query param required', 400)

  const db = createAdminClient()
  const { error } = await db
    .from('api_keys')
    .update({ is_active: false })
    .eq('id', keyId)
    .eq('profile_id', user.id)

  if (error) return apiError(error.message, 400)

  return apiSuccess({ success: true })
}
