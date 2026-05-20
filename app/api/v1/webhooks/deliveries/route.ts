import { NextRequest } from 'next/server'
import { authenticateApiRequest, createAdminClient, apiError, apiStructuredError, apiSuccess } from '@/lib/api/auth'

// GET — delivery log for a webhook
export async function GET(req: NextRequest) {
  const user = await authenticateApiRequest(req)
  if (!user) return apiError('Unauthorized', 401)
  if (!user.seller_identity_id) return apiStructuredError(
    'seller_identity_required',
    'This endpoint requires an API key linked to a seller identity.',
    'Create a new API key with seller_identity_id set, or check GET /api/v1/capabilities to see what your current key can do.',
    '/developers#seller-api-keys',
    403
  )

  const { searchParams } = new URL(req.url)
  const webhook_id = searchParams.get('webhook_id')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)

  const db = createAdminClient()

  let query = db
    .from('webhook_deliveries')
    .select(`
      id, event_type, status, response_status, response_body,
      attempts, last_attempted_at, created_at,
      webhooks!inner (seller_identity_id)
    `)
    .eq('webhooks.seller_identity_id', user.seller_identity_id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (webhook_id) query = query.eq('webhook_id', webhook_id)

  const { data, error } = await query
  if (error) return apiError('Failed to fetch deliveries', 500)

  return apiSuccess({ data: data ?? [] })
}
