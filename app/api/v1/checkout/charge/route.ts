import { NextRequest } from 'next/server'
import { authenticateApiRequest, createAdminClient, apiError, apiStructuredError, apiSuccess, checkIdempotency, storeIdempotency } from '@/lib/api/auth'
import { stripe } from '@/lib/stripe/client'
import { createMarketplaceOrder } from '@/lib/orders'

const PAID_STATUSES = ['paid', 'in_progress', 'delivered', 'revision_requested', 'completed', 'disputed', 'refunded']

// POST /api/v1/checkout/charge — charge a buyer's SAVED card off-session (no
// browser, no human click). Requires the buyer to have completed at least one
// interactive checkout first (so a card is on file). Guarded by the API key's
// spend limits.
export async function POST(req: NextRequest) {
  const user = await authenticateApiRequest(req)
  if (!user) return apiError('Unauthorized', 401)

  // This endpoint charges a card with no human present — an unnoticed retry
  // must never double-charge, so the Idempotency-Key header is mandatory.
  const idempotencyKey = req.headers.get('idempotency-key')
  if (!idempotencyKey) {
    return apiStructuredError('idempotency_key_required',
      'Off-session charges require an Idempotency-Key header so retries are safe.',
      'Generate a unique key per purchase attempt (e.g. a UUID) and send it as the Idempotency-Key header. Reuse the same key when retrying the same purchase.',
      '/developers', 400)
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return apiError('Invalid JSON', 400) }

  const { listing_id, package_id } = body
  if (!listing_id || typeof listing_id !== 'string') return apiError('listing_id is required', 400)

  const db = createAdminClient()

  // Replay a previous response for this key instead of charging again
  const replay = await checkIdempotency(req, user.profile_id, db)
  if (replay) return replay

  const { data: listing } = await db
    .from('listings')
    .select('id, title, slug, price_min, listing_type, status, seller_identity_id, seller_identities(id, display_name, account_id), listing_packages(*)')
    .eq('id', listing_id)
    .single()

  if (!listing) return apiError('Listing not found', 404)
  if (listing.status !== 'active') return apiError('Listing is not active', 400)

  const seller = listing.seller_identities as { id: string; display_name: string; account_id: string } | null
  if (!seller) return apiError('Listing has no seller', 400)
  if (seller.account_id === user.profile_id) return apiError('Cannot purchase your own listing', 400)

  // Resolve price
  let price = listing.price_min as number
  if (package_id) {
    const pkgs = (listing.listing_packages as { id: string; name: string; price: number }[]) ?? []
    const pkg = pkgs.find(p => p.id === package_id)
    if (!pkg) return apiError('Package not found on this listing', 404)
    price = pkg.price
  }

  // Enforce spend limits on the key
  if (user.max_transaction_cents != null && price > user.max_transaction_cents) {
    return apiStructuredError('transaction_over_limit',
      `This purchase ($${(price / 100).toFixed(2)}) exceeds the per-transaction limit on this API key ($${(user.max_transaction_cents / 100).toFixed(2)}).`,
      'Raise max_transaction_cents on the key.', '/developers', 402)
  }
  if (user.spend_limit_cents != null) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const { data: monthOrders } = await db
      .from('orders').select('total_amount')
      .eq('api_key_id', user.key_id).gte('created_at', monthStart).in('status', PAID_STATUSES)
    const spent = (monthOrders ?? []).reduce((s, o) => s + (o.total_amount ?? 0), 0)
    if (spent + price > user.spend_limit_cents) {
      return apiStructuredError('monthly_spend_limit_reached',
        `This purchase would exceed the monthly spend limit on this API key. Spent $${(spent / 100).toFixed(2)} of $${(user.spend_limit_cents / 100).toFixed(2)}.`,
        'Wait for the monthly window to reset, or raise spend_limit_cents.', '/developers', 402)
    }
  }

  // Require a saved card
  const { data: profile } = await db
    .from('profiles').select('stripe_customer_id').eq('id', user.profile_id).single()
  const customerId = profile?.stripe_customer_id
  if (!customerId) {
    return apiStructuredError('no_saved_payment_method',
      'This account has no saved card. Complete one interactive checkout (POST /v1/checkout) first to save a payment method.',
      'Use POST /v1/checkout to pay in a browser once; the card is then reusable off-session.', '/developers', 402)
  }

  // Find a usable payment method (default, else most recent card)
  let paymentMethodId: string | null = null
  try {
    const customer = await stripe.customers.retrieve(customerId)
    if (customer && !('deleted' in customer)) {
      paymentMethodId = (customer.invoice_settings?.default_payment_method as string) ?? null
    }
    if (!paymentMethodId) {
      const pms = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 })
      paymentMethodId = pms.data[0]?.id ?? null
    }
  } catch (err) {
    console.error('charge: failed to resolve payment method', err)
  }
  if (!paymentMethodId) {
    return apiStructuredError('no_saved_payment_method',
      'No reusable card found on file. Complete an interactive checkout first.',
      'Use POST /v1/checkout once to save a card.', '/developers', 402)
  }

  // Charge off-session — Stripe's own idempotency layer backs up ours, so the
  // same key can never produce two PaymentIntents even on a race.
  let paymentIntent
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: price,
      currency: 'usd',
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      metadata: {
        listingId: listing.id as string,
        buyerId: user.profile_id,
        sellerIdentityId: seller.id,
        apiKeyId: user.key_id,
      },
    }, { idempotencyKey: `charge_${user.profile_id}_${idempotencyKey}` })
  } catch (err) {
    // Card declined or requires authentication (SCA) — can't be done off-session
    const message = err instanceof Error ? err.message : 'Card charge failed'
    return apiStructuredError('charge_failed', message,
      'The card was declined or needs authentication. Fall back to POST /v1/checkout for an interactive payment.',
      '/developers', 402)
  }

  if (paymentIntent.status !== 'succeeded') {
    return apiStructuredError('charge_incomplete',
      `Payment did not complete (status: ${paymentIntent.status}). Off-session charges can't satisfy authentication challenges.`,
      'Use POST /v1/checkout so the buyer can authenticate in a browser.', '/developers', 402)
  }

  // Create the order via the shared, idempotent helper
  const result = await createMarketplaceOrder({
    buyerId: user.profile_id,
    sellerIdentityId: seller.id,
    listingId: listing.id as string,
    orderType: listing.listing_type as string,
    packageId: (package_id as string) || null,
    grossAmount: price,
    stripePaymentIntentId: paymentIntent.id,
    apiKeyId: user.key_id,
  })

  if (!result.orderId) return apiError('Payment succeeded but order creation failed — contact support', 500)

  const responseBody = {
    data: {
      order_id: result.orderId,
      payment_intent_id: paymentIntent.id,
      amount: price,
      currency: 'usd',
      status: 'paid',
    },
    note: 'Charged off-session against the saved card. No human interaction was required.',
  }

  await storeIdempotency(req, user.profile_id, '/api/v1/checkout/charge', 201, responseBody, db)

  return apiSuccess(responseBody, 201)
}
