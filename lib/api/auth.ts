import { NextRequest } from 'next/server'
import { createHash } from 'node:crypto'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

export interface ApiUser {
  profile_id: string
  seller_identity_id: string | null
  scopes: string[]
  key_id: string
  spend_limit_cents: number | null
  max_transaction_cents: number | null
}

export function createAdminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function authenticateApiRequest(req: NextRequest): Promise<ApiUser | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  const db = createAdminClient()

  const select = 'id, profile_id, seller_identity_id, scopes, is_active, last_used_at, spend_limit_cents, max_transaction_cents'

  // Look up by SHA-256 hash
  let { data: key } = await db
    .from('api_keys')
    .select(select)
    .eq('key_hash', hashApiKey(token))
    .eq('is_active', true)
    .single()

  // Legacy fallback: keys created before hashing was fixed were stored as
  // reversible hex. Match those and transparently upgrade the row to the
  // real hash so the plaintext-equivalent value leaves the database.
  if (!key) {
    const { data: legacyKey } = await db
      .from('api_keys')
      .select(select)
      .eq('key_hash', legacyEncodeApiKey(token))
      .eq('is_active', true)
      .single()
    if (legacyKey) {
      await db.from('api_keys').update({ key_hash: hashApiKey(token) }).eq('id', legacyKey.id)
      key = legacyKey
    }
  }

  if (!key) return null

  // Update last_used_at (fire and forget)
  db.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', key.id)

  return {
    profile_id: key.profile_id,
    seller_identity_id: key.seller_identity_id,
    scopes: key.scopes ?? [],
    key_id: key.id,
    spend_limit_cents: key.spend_limit_cents ?? null,
    max_transaction_cents: key.max_transaction_cents ?? null,
  }
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

// The original "hash" was reversible hex encoding. Kept only to match and
// upgrade keys stored before the fix — never use for new keys.
function legacyEncodeApiKey(key: string): string {
  return Buffer.from(key).toString('hex')
}

export function apiError(message: string, status: number) {
  return Response.json({ error: message }, { status })
}

export function apiStructuredError(
  code: string,
  message: string,
  fix: string | undefined,
  docsUrl: string | undefined,
  status: number
) {
  return Response.json(
    { error: code, message, ...(fix && { fix }), ...(docsUrl && { docs_url: docsUrl }) },
    { status }
  )
}

export function apiSuccess(data: unknown, status = 200) {
  const now = Date.now()
  const windowReset = Math.ceil(now / 60_000) * 60_000 // next minute boundary
  return Response.json(data, {
    status,
    headers: {
      'X-RateLimit-Limit': '60',
      'X-RateLimit-Window': '60',
      'X-RateLimit-Reset': String(Math.floor(windowReset / 1000)),
    },
  })
}

// Idempotency helpers — call checkIdempotency before processing, storeIdempotency after
export async function checkIdempotency(
  req: Request,
  profileId: string,
  db: ReturnType<typeof createAdminClient>
): Promise<Response | null> {
  const key = req.headers.get('idempotency-key')
  if (!key) return null

  const { data } = await db
    .from('idempotency_keys')
    .select('response_status, response_body, created_at')
    .eq('profile_id', profileId)
    .eq('key', key)
    .single()

  if (!data) return null

  // Expire after 24 hours
  const age = Date.now() - new Date(data.created_at).getTime()
  if (age > 86_400_000) return null

  return Response.json(data.response_body, {
    status: data.response_status,
    headers: { 'X-Idempotency-Replayed': 'true' },
  })
}

export async function storeIdempotency(
  req: Request,
  profileId: string,
  path: string,
  status: number,
  body: unknown,
  db: ReturnType<typeof createAdminClient>
) {
  const key = req.headers.get('idempotency-key')
  if (!key) return

  await db.from('idempotency_keys').upsert(
    { profile_id: profileId, key, path, response_status: status, response_body: body as object },
    { onConflict: 'profile_id,key', ignoreDuplicates: false }
  )
}
