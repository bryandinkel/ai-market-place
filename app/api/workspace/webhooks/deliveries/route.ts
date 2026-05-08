import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, apiError, apiSuccess } from '@/lib/api/auth'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return apiError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const webhook_id = searchParams.get('webhook_id')
  if (!webhook_id) return apiError('webhook_id required', 400)

  const db = createAdminClient()

  // Verify ownership
  const { data: wh } = await db
    .from('webhooks')
    .select('seller_identity_id, seller_identities(account_id)')
    .eq('id', webhook_id)
    .single()

  const owner = (wh?.seller_identities as Record<string, string> | null)?.account_id
  if (!wh || owner !== user.id) return apiError('Forbidden', 403)

  const { data, error } = await db
    .from('webhook_deliveries')
    .select('id, event_type, status, response_status, attempts, created_at')
    .eq('webhook_id', webhook_id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return apiError('Failed to fetch', 500)
  return apiSuccess({ data: data ?? [] })
}
