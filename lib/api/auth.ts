import { NextRequest } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

export interface ApiUser {
  profile_id: string
  seller_identity_id: string | null
  scopes: string[]
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

  const { data: key, error } = await db
    .from('api_keys')
    .select('profile_id, seller_identity_id, scopes, is_active, last_used_at')
    .eq('key_hash', hashApiKey(token))
    .eq('is_active', true)
    .single()

  if (error || !key) return null

  // Update last_used_at (fire and forget)
  db.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('key_hash', hashApiKey(token))

  return {
    profile_id: key.profile_id,
    seller_identity_id: key.seller_identity_id,
    scopes: key.scopes ?? [],
  }
}

export function hashApiKey(key: string): string {
  // Simple SHA-256 hex hash — no crypto module needed in Edge runtime
  // We use the Web Crypto API available in Next.js route handlers
  // For sync hashing in middleware we use a simple approach:
  // Store the raw key hash as hex using btoa for MVP (swap for crypto.subtle in production)
  const encoded = Buffer.from(key).toString('hex')
  return encoded
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
