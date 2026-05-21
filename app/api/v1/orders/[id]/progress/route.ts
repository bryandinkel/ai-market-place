import { NextRequest } from 'next/server'
import { authenticateApiRequest, createAdminClient, apiError, apiStructuredError, apiSuccess } from '@/lib/api/auth'

// POST /api/v1/orders/:id/progress — seller posts an in-progress update to the buyer
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticateApiRequest(req)
  if (!user) return apiError('Unauthorized', 401)
  if (!user.seller_identity_id) return apiStructuredError(
    'seller_identity_required',
    'Progress updates can only be posted by the seller on an order.',
    'Create a new API key with seller_identity_id set, or check GET /api/v1/capabilities.',
    '/developers#seller-api-keys',
    403
  )

  const { id: order_id } = await params
  const db = createAdminClient()

  // Verify seller owns this order and it's in a workable state
  const { data: order } = await db
    .from('orders')
    .select('id, status, seller_identity_id, buyer_id')
    .eq('id', order_id)
    .single()

  if (!order) return apiError('Order not found', 404)
  if (order.seller_identity_id !== user.seller_identity_id) return apiError('Forbidden', 403)
  if (!['paid', 'in_progress'].includes(order.status)) {
    return apiError(`Cannot post progress on order with status: ${order.status}`, 400)
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return apiError('Invalid JSON', 400) }

  const { message, metadata } = body
  if (!message || typeof message !== 'string') return apiError('message is required', 400)

  // Bump order status to in_progress if still paid
  if (order.status === 'paid') {
    await db.from('orders').update({ status: 'in_progress' }).eq('id', order_id)
  }

  const { data, error } = await db
    .from('order_progress_updates')
    .insert({
      order_id,
      author_id: user.profile_id,
      message,
      metadata: (metadata as object) ?? {},
    })
    .select()
    .single()

  if (error) return apiError(error.message, 400)

  return apiSuccess({ data }, 201)
}

// GET /api/v1/orders/:id/progress — list progress updates for an order
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticateApiRequest(req)
  if (!user) return apiError('Unauthorized', 401)

  const { id: order_id } = await params
  const db = createAdminClient()

  // Verify the caller is a participant (buyer or seller)
  const { data: order } = await db
    .from('orders')
    .select('id, buyer_id, seller_identity_id, seller_identities(account_id)')
    .eq('id', order_id)
    .single()

  if (!order) return apiError('Order not found', 404)

  const sellerAccountId = (order.seller_identities as { account_id: string } | null)?.account_id
  const isBuyer = order.buyer_id === user.profile_id
  const isSeller = sellerAccountId === user.profile_id

  if (!isBuyer && !isSeller) return apiError('Forbidden', 403)

  const { data, error } = await db
    .from('order_progress_updates')
    .select('id, message, metadata, created_at, author_id')
    .eq('order_id', order_id)
    .order('created_at', { ascending: true })

  if (error) return apiError('Failed to fetch progress updates', 500)

  return apiSuccess({ data: data ?? [] })
}
