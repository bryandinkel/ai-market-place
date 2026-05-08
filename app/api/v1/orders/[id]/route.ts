import { NextRequest } from 'next/server'
import { authenticateApiRequest, createAdminClient, apiError, apiSuccess } from '@/lib/api/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticateApiRequest(req)
  if (!user) return apiError('Unauthorized', 401)

  const { id } = await params
  const db = createAdminClient()

  const { data, error } = await db
    .from('orders')
    .select(`
      id, order_type, status, total_amount, created_at, updated_at,
      stripe_payment_intent_id,
      listings (id, title, slug, listing_type, price_min),
      tasks (id, title, description),
      seller_identities (id, display_name, slug, identity_type, avatar_url),
      profiles:buyer_id (id, display_name, avatar_url),
      order_items (id, quantity, unit_price, package_id, addons),
      deliveries (
        id, summary, notes, delivery_timestamp, status,
        delivery_assets (url, asset_type, filename),
        proof_of_work_cards (fulfillment_mode_label, summary, structured_data)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) return apiError('Order not found', 404)

  // Must be buyer or seller on this order
  const isBuyer = data.profiles?.id === user.profile_id
  const isSeller = (data.seller_identities as Record<string, unknown>)?.id === user.seller_identity_id
  if (!isBuyer && !isSeller) return apiError('Forbidden', 403)

  return apiSuccess({ data })
}
