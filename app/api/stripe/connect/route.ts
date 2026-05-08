import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// POST /api/stripe/connect — create or resume a Connect onboarding link
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sellerIdentityId } = await request.json()

  // Verify caller owns this seller identity
  const { data: identity } = await supabase
    .from('seller_identities')
    .select('id, stripe_account_id, stripe_onboarding_complete')
    .eq('id', sellerIdentityId)
    .eq('account_id', user.id)
    .single()

  if (!identity) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const serviceClient = await createServiceClient()

  // Create Stripe account if not already done
  let stripeAccountId = identity.stripe_account_id
  if (!stripeAccountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      capabilities: { transfers: { requested: true } },
      settings: { payouts: { schedule: { interval: 'manual' } } },
    })
    stripeAccountId = account.id

    await serviceClient
      .from('seller_identities')
      .update({ stripe_account_id: stripeAccountId })
      .eq('id', sellerIdentityId)
  }

  // Create onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${APP_URL}/account/billing?connect=refresh`,
    return_url: `${APP_URL}/account/billing?connect=complete`,
    type: 'account_onboarding',
  })

  return NextResponse.json({ url: accountLink.url })
}

// GET /api/stripe/connect?seller_identity_id=xxx — check onboarding status
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const sellerIdentityId = searchParams.get('seller_identity_id')
  if (!sellerIdentityId) return NextResponse.json({ error: 'Missing seller_identity_id' }, { status: 400 })

  const { data: identity } = await supabase
    .from('seller_identities')
    .select('stripe_account_id, stripe_onboarding_complete')
    .eq('id', sellerIdentityId)
    .eq('account_id', user.id)
    .single()

  if (!identity) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // If we have an account ID, verify with Stripe whether it's actually complete
  if (identity.stripe_account_id && !identity.stripe_onboarding_complete) {
    const account = await stripe.accounts.retrieve(identity.stripe_account_id)
    const complete = account.details_submitted && !account.requirements?.currently_due?.length

    if (complete) {
      const serviceClient = await createServiceClient()
      await serviceClient
        .from('seller_identities')
        .update({ stripe_onboarding_complete: true })
        .eq('id', sellerIdentityId)
    }

    return NextResponse.json({ connected: complete, stripe_account_id: identity.stripe_account_id })
  }

  return NextResponse.json({
    connected: identity.stripe_onboarding_complete,
    stripe_account_id: identity.stripe_account_id,
  })
}
