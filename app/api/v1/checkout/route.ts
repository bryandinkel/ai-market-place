import { NextRequest } from 'next/server'
import { authenticateApiRequest, createAdminClient, apiError, apiStructuredError, apiSuccess } from '@/lib/api/auth'
import { stripe } from '@/lib/stripe/client'

// POST /api/v1/checkout — create a Stripe Checkout Session via API key (no browser session required)
// Returns a checkout_url the agent can open or share with a user to complete payment.
export async function POST(req: NextRequest) {
  const user = await authenticateApiRequest(req)
  if (!user) return apiError('Unauthorized', 401)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return apiError('Invalid JSON', 400) }

  const { listing_id, package_id, success_url, cancel_url } = body

  if (!listing_id || typeof listing_id !== 'string') {
    return apiError('listing_id is required', 400)
  }

  const db = createAdminClient()

  // Fetch listing with seller identity and packages
  const { data: listing } = await db
    .from('listings')
    .select('id, title, slug, price_min, listing_type, status, seller_identity_id, seller_identities(id, display_name, account_id), listing_packages(*)')
    .eq('id', listing_id)
    .single()

  if (!listing) return apiError('Listing not found', 404)
  if (listing.status !== 'active') return apiError('Listing is not active', 400)

  const seller = listing.seller_identities as { id: string; display_name: string; account_id: string } | null
  if (!seller) return apiError('Listing has no seller', 400)

  // Prevent self-purchase
  if (seller.account_id === user.profile_id) {
    return apiError('Cannot purchase your own listing', 400)
  }

  // Resolve price
  let price = listing.price_min as number
  let productName = listing.title as string

  if (package_id) {
    const pkgs = listing.listing_packages as { id: string; name: string; price: number }[] ?? []
    const pkg = pkgs.find(p => p.id === package_id)
    if (!pkg) return apiError('Package not found on this listing', 404)
    price = pkg.price
    productName = `${listing.title} — ${pkg.name}`
  }

  // Enforce delegated spend limits on this API key (if set)
  if (user.max_transaction_cents != null && price > user.max_transaction_cents) {
    return apiStructuredError(
      'transaction_over_limit',
      `This purchase ($${(price / 100).toFixed(2)}) exceeds the per-transaction limit on this API key ($${(user.max_transaction_cents / 100).toFixed(2)}).`,
      'Raise max_transaction_cents on the key, or use a key without a per-transaction cap.',
      '/developers',
      402
    )
  }
  if (user.spend_limit_cents != null) {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const { data: monthOrders } = await db
      .from('orders')
      .select('total_amount')
      .eq('api_key_id', user.key_id)
      .gte('created_at', monthStart)
      .in('status', ['paid', 'in_progress', 'delivered', 'revision_requested', 'completed', 'disputed', 'refunded'])
    const spent = (monthOrders ?? []).reduce((sum, o) => sum + (o.total_amount ?? 0), 0)
    if (spent + price > user.spend_limit_cents) {
      return apiStructuredError(
        'monthly_spend_limit_reached',
        `This purchase would exceed the monthly spend limit on this API key. Spent $${(spent / 100).toFixed(2)} of $${(user.spend_limit_cents / 100).toFixed(2)}; this purchase is $${(price / 100).toFixed(2)}.`,
        'Wait for the monthly window to reset, or raise spend_limit_cents on the key.',
        '/developers',
        402
      )
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://ai-market-place-theta.vercel.app'

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: productName,
            description: `Sold by ${seller.display_name}`,
          },
          unit_amount: price,
        },
        quantity: 1,
      },
    ],
    automatic_tax: { enabled: true },
    success_url: (success_url as string) ?? `${appUrl}/orders?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: (cancel_url as string) ?? `${appUrl}/listing/${listing.slug}`,
    metadata: {
      listingId: listing.id as string,
      buyerId: user.profile_id,
      sellerIdentityId: seller.id,
      orderType: listing.listing_type as string,
      packageId: (package_id as string) ?? '',
      addons: '[]',
      apiKeyId: user.key_id,
    },
  })

  return apiSuccess({
    data: {
      checkout_url: session.url,
      session_id: session.id,
      expires_at: new Date((session.expires_at ?? 0) * 1000).toISOString(),
      amount: price,
      currency: 'usd',
      listing_title: productName,
    },
    note: 'Open checkout_url in a browser to complete payment. The session expires in 24 hours.',
  }, 201)
}
