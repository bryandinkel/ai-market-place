import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'
import {
  VERIFICATION_FEE_USD,
  VERIFICATION_MONTHLY_USD,
  slotToTier,
  type VerificationTier,
} from '@/lib/constants'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceClient = await createServiceClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { sellerIdentityId } = await request.json()

    // Verify ownership and current status
    const { data: identity } = await supabase
      .from('seller_identities')
      .select('id, display_name, verification_status, verification_tier')
      .eq('id', sellerIdentityId)
      .eq('account_id', user.id)
      .single()

    if (!identity) return NextResponse.json({ error: 'Seller identity not found' }, { status: 404 })
    if (identity.verification_status === 'approved') {
      return NextResponse.json({ error: 'Already verified' }, { status: 400 })
    }
    if (identity.verification_status === 'pending') {
      return NextResponse.json({ error: 'Verification already in review' }, { status: 400 })
    }

    // Atomically claim a slot number (uses DB function, safe under concurrent signups)
    const { data: slotRow } = await serviceClient
      .rpc('claim_verification_slot')
    const slot = slotRow as number | null

    if (!slot) {
      return NextResponse.json({ error: 'Could not assign verification slot' }, { status: 500 })
    }

    const tier: VerificationTier = slotToTier(slot)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // ── Free tier — no payment needed ────────────────────────────────────
    if (tier === 'free') {
      await serviceClient.from('verification_requests').insert({
        seller_identity_id: sellerIdentityId,
        payment_amount: 0,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      })

      await serviceClient
        .from('seller_identities')
        .update({
          verification_status: 'pending',
          verification_tier: 'free',
          verification_slot_number: slot,
        })
        .eq('id', sellerIdentityId)

      return NextResponse.json({
        tier: 'free',
        redirect: `${appUrl}/account/verification?success=true&tier=free`,
      })
    }

    // ── Lifetime — one-time $49 payment ──────────────────────────────────
    if (tier === 'lifetime') {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Verified Seller — Lifetime (The Others Market)',
                description: `Verify "${identity.display_name}" once, keep the badge forever.`,
              },
              unit_amount: VERIFICATION_FEE_USD,
            },
            quantity: 1,
          },
        ],
        automatic_tax: { enabled: true },
        success_url: `${appUrl}/account/verification?success=true&session_id={CHECKOUT_SESSION_ID}&tier=lifetime`,
        cancel_url: `${appUrl}/account/verification`,
        metadata: {
          type: 'verification',
          verificationTier: 'lifetime',
          slotNumber: String(slot),
          userId: user.id,
          sellerIdentityId,
        },
      })

      // Mark pending — webhook will confirm payment and set tier
      await serviceClient.from('verification_requests').insert({
        seller_identity_id: sellerIdentityId,
        payment_amount: VERIFICATION_FEE_USD,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      })

      await serviceClient
        .from('seller_identities')
        .update({
          verification_status: 'pending',
          verification_slot_number: slot,
        })
        .eq('id', sellerIdentityId)

      return NextResponse.json({ tier: 'lifetime', url: session.url })
    }

    // ── Monthly subscription ──────────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Verified Seller — Monthly (The Others Market)',
              description: `Verified badge for "${identity.display_name}". Cancel any time in Account → Verification.`,
            },
            unit_amount: VERIFICATION_MONTHLY_USD,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      automatic_tax: { enabled: true },
      success_url: `${appUrl}/account/verification?success=true&session_id={CHECKOUT_SESSION_ID}&tier=subscription`,
      cancel_url: `${appUrl}/account/verification`,
      metadata: {
        type: 'verification',
        verificationTier: 'subscription',
        slotNumber: String(slot),
        userId: user.id,
        sellerIdentityId,
      },
    })

    await serviceClient.from('verification_requests').insert({
      seller_identity_id: sellerIdentityId,
      payment_amount: VERIFICATION_MONTHLY_USD,
      status: 'pending',
      submitted_at: new Date().toISOString(),
    })

    await serviceClient
      .from('seller_identities')
      .update({
        verification_status: 'pending',
        verification_slot_number: slot,
      })
      .eq('id', sellerIdentityId)

    return NextResponse.json({ tier: 'subscription', url: session.url })

  } catch (error) {
    console.error('Verification checkout error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
