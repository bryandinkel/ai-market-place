import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail, orderConfirmedBuyerEmail, newOrderSellerEmail } from '@/lib/email'

export const PLATFORM_FEE_PCT = 0.10 // 10%
export const PAYOUT_HOLD_DAYS = 7

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export interface CreateMarketplaceOrderParams {
  buyerId: string
  sellerIdentityId: string
  listingId: string
  orderType?: string | null
  packageId?: string | null
  addons?: unknown[]
  grossAmount: number
  stripeSessionId?: string | null
  stripePaymentIntentId?: string | null
  apiKeyId?: string | null
}

export interface CreateMarketplaceOrderResult {
  orderId: string | null
  duplicate: boolean
}

/**
 * Single source of truth for turning a successful payment into an order:
 * inserts the order, product entitlement, line items, and fires
 * notifications + emails. Idempotent on the Stripe session OR payment-intent
 * id so webhook retries and the off-session path can't double-create.
 */
export async function createMarketplaceOrder(
  params: CreateMarketplaceOrderParams
): Promise<CreateMarketplaceOrderResult> {
  const {
    buyerId, sellerIdentityId, listingId, orderType, packageId, addons = [],
    grossAmount, stripeSessionId = null, stripePaymentIntentId = null, apiKeyId = null,
  } = params

  const supabase = await createServiceClient()

  // Idempotency — skip if this payment already became an order.
  if (stripeSessionId) {
    const { data: existing } = await supabase
      .from('orders').select('id').eq('stripe_session_id', stripeSessionId).maybeSingle()
    if (existing) return { orderId: existing.id, duplicate: true }
  }
  if (stripePaymentIntentId) {
    const { data: existing } = await supabase
      .from('orders').select('id').eq('stripe_payment_intent_id', stripePaymentIntentId).maybeSingle()
    if (existing) return { orderId: existing.id, duplicate: true }
  }

  const platformFee = Math.round(grossAmount * PLATFORM_FEE_PCT)
  const sellerPayout = grossAmount - platformFee
  const payoutEligibleAt = new Date(Date.now() + PAYOUT_HOLD_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      buyer_id: buyerId,
      seller_identity_id: sellerIdentityId,
      listing_id: listingId,
      order_type: orderType ?? 'product',
      status: 'paid',
      total_amount: grossAmount,
      stripe_session_id: stripeSessionId,
      stripe_payment_intent_id: stripePaymentIntentId,
      platform_fee_amount: platformFee,
      seller_payout_amount: sellerPayout,
      payout_eligible_at: payoutEligibleAt,
      api_key_id: apiKeyId,
    })
    .select('id')
    .single()

  if (orderError || !order) {
    console.error('createMarketplaceOrder: failed to insert order', orderError)
    return { orderId: null, duplicate: false }
  }

  // Product entitlement
  if ((orderType ?? 'product') === 'product') {
    const { data: productFile } = await supabase
      .from('product_files').select('id').eq('listing_id', listingId).limit(1).single()
    if (productFile) {
      await supabase.from('product_purchases').insert({
        order_id: order.id, buyer_id: buyerId, listing_id: listingId,
        product_file_id: productFile.id, download_count: 0,
      })
    }
  }

  // Package / add-on line detail
  if (packageId || (Array.isArray(addons) && addons.length > 0)) {
    await supabase.from('order_items').insert({
      order_id: order.id,
      package_id: packageId || null,
      addons: addons ?? [],
      quantity: 1,
      unit_price: grossAmount,
    })
  }

  // Listing title for messaging
  const { data: listing } = await supabase
    .from('listings').select('title').eq('id', listingId).single()
  const listingTitle = listing?.title ?? 'Your order'

  // Notify + email seller
  const { data: identity } = await supabase
    .from('seller_identities').select('account_id, display_name').eq('id', sellerIdentityId).single()
  if (identity) {
    await supabase.from('notifications').insert({
      user_id: identity.account_id,
      type: 'order_placed',
      title: 'New order received',
      body: `You have a new order worth ${formatCents(sellerPayout)} (after platform fee). Payout scheduled in ${PAYOUT_HOLD_DAYS} days.`,
      is_read: false,
      action_url: `/orders/${order.id}`,
    })
    const { data: sellerAuth } = await supabase.auth.admin.getUserById(identity.account_id)
    if (sellerAuth.user?.email) {
      await sendEmail({
        to: sellerAuth.user.email,
        subject: `New order: ${listingTitle}`,
        html: newOrderSellerEmail(identity.display_name, order.id, listingTitle, sellerPayout),
      })
    }
  }

  // Notify + email buyer
  await supabase.from('notifications').insert({
    user_id: buyerId,
    type: 'order_placed',
    title: 'Order confirmed',
    body: `Your payment of ${formatCents(grossAmount)} was received. Your order is now active.`,
    is_read: false,
    action_url: `/orders/${order.id}`,
  })
  const { data: buyerProfile } = await supabase
    .from('profiles').select('display_name').eq('id', buyerId).single()
  const { data: buyerAuth } = await supabase.auth.admin.getUserById(buyerId)
  if (buyerAuth.user?.email) {
    await sendEmail({
      to: buyerAuth.user.email,
      subject: `Order confirmed: ${listingTitle}`,
      html: orderConfirmedBuyerEmail(buyerProfile?.display_name ?? 'there', order.id, listingTitle, grossAmount),
    })
  }

  return { orderId: order.id, duplicate: false }
}
