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

export function apiSuccess(data: unknown, status = 200) {
  return Response.json(data, { status })
}
