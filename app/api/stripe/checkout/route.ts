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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // Create Stripe Checkout Session
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
      ],
      success_url: `${appUrl}/orders?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/listing/${listing.slug}`,
      metadata: {
        listingId: listing.id,
        buyerId: user.id,
        sellerIdentityId: (listing.seller_identities as { id: string }).id,
        orderType: listing.listing_type,
        packageId: packageId ?? '',
        addons: JSON.stringify(addons),
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
