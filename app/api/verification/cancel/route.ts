import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sellerIdentityId } = await request.json()

  const { data: identity } = await supabase
    .from('seller_identities')
    .select('id, display_name, verification_status, verification_tier, verification_subscription_id')
    .eq('id', sellerIdentityId)
    .eq('account_id', user.id)
    .single()

  if (!identity) return NextResponse.json({ error: 'Seller identity not found' }, { status: 404 })

  const tier = identity.verification_tier

  // ── Monthly subscription: cancel with Stripe (access until period ends) ──
  if (tier === 'subscription' && identity.verification_subscription_id) {
    try {
      // cancel_at_period_end = true keeps the badge active until the billing period ends
      await stripe.subscriptions.update(identity.verification_subscription_id, {
        cancel_at_period_end: true,
      })
    } catch (err) {
      console.error('Stripe subscription cancel error:', err)
      return NextResponse.json({ error: 'Failed to cancel subscription with Stripe' }, { status: 500 })
    }

    await serviceClient
      .from('seller_identities')
      .update({ verification_subscription_status: 'canceled' })
      .eq('id', sellerIdentityId)

    return NextResponse.json({
      ok: true,
      message: 'Subscription cancelled — your verified badge stays active until the end of the current billing period.',
    })
  }

  // ── Free or lifetime: remove badge immediately (no refund) ────────────────
  if (tier === 'free' || tier === 'lifetime') {
    await serviceClient
      .from('seller_identities')
      .update({
        is_verified: false,
        verification_status: 'none',
        verification_tier: null,
        verification_slot_number: null,
      })
      .eq('id', sellerIdentityId)

    return NextResponse.json({
      ok: true,
      message: 'Verified badge removed from your profile.',
    })
  }

  return NextResponse.json({ error: 'Nothing to cancel' }, { status: 400 })
}
