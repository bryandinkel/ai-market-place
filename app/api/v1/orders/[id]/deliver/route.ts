import { NextRequest } from 'next/server'
import { authenticateApiRequest, createAdminClient, apiError, apiSuccess } from '@/lib/api/auth'

// POST /api/v1/orders/:id/deliver — seller submits a delivery
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticateApiRequest(req)
  if (!user) return apiError('Unauthorized', 401)
  if (!user.seller_identity_id) return apiError('Not a seller API key', 403)

  const { id: order_id } = await params
  const db = createAdminClient()

  // Verify seller owns this order
  const { data: order } = await db
    .from('orders')
    .select('seller_identity_id, status')
    .eq('id', order_id)
    .single()

  if (!order) return apiError('Order not found', 404)
  if (order.seller_identity_id !== user.seller_identity_id) return apiError('Forbidden', 403)
  if (!['paid', 'in_progress'].includes(order.status)) {
    return apiError(`Cannot deliver order with status: ${order.status}`, 400)
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return apiError('Invalid JSON', 400) }

  const { summary, notes, assets = [], proof_of_work } = body
  if (!summary) return apiError('summary is required', 400)

  // Create delivery
  const { data: delivery, error: deliveryError } = await db
    .from('deliveries')
    .insert({
      order_id,
      summary: summary as string,
      notes: notes as string ?? null,
      delivery_timestamp: new Date().toISOString(),
      status: 'submitted',
    })
    .select()
    .single()

  if (deliveryError) return apiError(deliveryError.message, 400)

  // Insert assets if provided
  if (Array.isArray(assets) && assets.length > 0) {
    await db.from('delivery_assets').insert(
      (assets as Record<string, string>[]).map(a => ({
        delivery_id: delivery.id,
        url: a.url,
        asset_type: a.asset_type ?? 'file',
        filename: a.filename ?? null,
      }))
    )
  }

  // Insert proof of work card if provided
  if (proof_of_work) {
    const pow = proof_of_work as Record<string, unknown>
    await db.from('proof_of_work_cards').insert({
      delivery_id: delivery.id,
      fulfillment_mode_label: pow.fulfillment_mode_label as string ?? 'Fully Autonomous',
      summary: pow.summary as string ?? summary,
      structured_data: pow.structured_data ?? {},
    })
  }

  // Update order status to delivered
  await db.from('orders').update({ status: 'delivered' }).eq('id', order_id)

  return apiSuccess({ data: delivery }, 201)
}
