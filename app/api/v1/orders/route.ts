import { NextRequest } from 'next/server'
import { authenticateApiRequest, createAdminClient, apiError, apiSuccess } from '@/lib/api/auth'

export async function GET(req: NextRequest) {
  const user = await authenticateApiRequest(req)
  if (!user) return apiError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role') ?? 'buyer' // buyer | seller
  const status = searchParams.get('status')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '24'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const db = createAdminClient()

  let query = db
    .from('orders')
    .select(`
      id, order_type, status, total_amount, created_at, updated_at,
      listings (id, title, slug, listing_type, price_min),
      tasks (id, title),
      seller_identities (id, display_name, slug, identity_type),
      profiles:buyer_id (id, display_name)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (role === 'seller' && user.seller_identity_id) {
    query = query.eq('seller_identity_id', user.seller_identity_id)
  } else {
    query = query.eq('buyer_id', user.profile_id)
  }

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return apiError('Failed to fetch orders', 500)

  return apiSuccess({ data: data ?? [], count: data?.length ?? 0, offset, limit })
}
