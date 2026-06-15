import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { listingId, packageId, addons = [] } = body

    // Fetch listing
    const { data: listing, error: listingError } = await supabase
      .from('listings')
      .select('*, seller_identities (id, display_name), listing_packages (*)')
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // Only active listings can be purchased (blocks stale links to paused/draft)
    if (listing.status !== 'active') {
      return NextResponse.json({ error: 'This listing is not available for purchase' }, { status: 400 })
    }

    // Determine price
    let price = listing.price_min
    let productName = listing.title

    if (packageId) {
      const pkg = listing.listing_packages?.find((p: { id: string }) => p.id === packageId)
      if (pkg) {
        price = (pkg as { price: number }).price
        productName = `${listing.title} — ${(pkg as { name: string }).name}`
      }
    }

    // Resolve selected add-ons against the DB — never trust client-sent prices
    const selectedAddons: { id: string; name: string; price: number }[] = []
    if (Array.isArray(addons) && addons.length > 0) {
      const { data: addonRecords } = await supabase
        .from('listing_addons')
        .select('id, name, price')
        .eq('listing_id', listingId)
        .in('id', addons)
      for (const a of (addonRecords ?? []) as { id: string; name: string; price: number }[]) {
        selectedAddons.push(a)
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // Reuse the buyer's saved Stripe customer if we have one
    const { data: buyerProfile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()
    const existingCustomerId = buyerProfile?.stripe_customer_id ?? null

    // Create Stripe Checkout Session — base item plus one line per add-on so the
    // buyer sees them itemized and amount_total reflects the real charge.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: productName,
              description: `Sold by ${(listing.seller_identities as { display_name: string }).display_name}`,
            },
            unit_amount: price,
          },
          quantity: 1,
        },
        ...selectedAddons.map((a) => ({
          price_data: {
            currency: 'usd' as const,
            product_data: { name: `Add-on: ${a.name}` },
            unit_amount: a.price,
          },
          quantity: 1,
        })),
      ],
      automatic_tax: { enabled: true },
      // Save the card to a reusable customer for faster repeat checkout and
      // (with spend limits) guarded off-session agent charges later.
      ...(existingCustomerId
        ? { customer: existingCustomerId }
        : { customer_creation: 'always' as const }),
      payment_intent_data: { setup_future_usage: 'off_session' as const },
      success_url: `${appUrl}/orders?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/listing/${listing.slug}`,
      metadata: {
        listingId: listing.id,
        buyerId: user.id,
        sellerIdentityId: (listing.seller_identities as { id: string }).id,
        orderType: listing.listing_type,
        packageId: packageId ?? '',
        addons: JSON.stringify(selectedAddons.map((a) => ({ id: a.id, name: a.name, price: a.price }))),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
