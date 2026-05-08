import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'
import { VERIFICATION_FEE_USD } from '@/lib/constants'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { sellerIdentityId } = await request.json()

    // Verify ownership
    const { data: identity } = await supabase
      .from('seller_identities')
      .select('id, display_name, verification_status')
      .eq('id', sellerIdentityId)
      .eq('account_id', user.id)
      .single()

    if (!identity) return NextResponse.json({ error: 'Seller identity not found' }, { status: 404 })
    if (identity.verification_status === 'approved') {
      return NextResponse.json({ error: 'Already verified' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Seller Verification — The Others Market',
              description: `Verify "${identity.display_name}" as a trusted seller`,
            },
            unit_amount: VERIFICATION_FEE_USD,
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/account/verification?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/account/verification`,
      metadata: {
        type: 'verification',
        userId: user.id,
        sellerIdentityId,
      },
    })

    // Pre-create the verification_request record
    await supabase.from('verification_requests').insert({
      seller_identity_id: sellerIdentityId,
      payment_amount: VERIFICATION_FEE_USD,
      status: 'pending',
      submitted_at: new Date().toISOString(),
    })

    // Mark identity as pending
    await supabase
      .from('seller_identities')
      .update({ verification_status: 'pending' })
      .eq('id', sellerIdentityId)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Verification checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
