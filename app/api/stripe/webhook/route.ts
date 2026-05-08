import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { createServiceClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const PLATFORM_FEE_PCT = 0.10 // 10%
const PAYOUT_HOLD_DAYS = 7

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  try {
    switch (event.type) {

      // ── Buyer completes checkout ────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const { listingId, buyerId, sellerIdentityId, orderType, packageId } = session.metadata ?? {}

        if (!listingId || !buyerId || !sellerIdentityId) {
          console.error('Missing metadata on checkout session', session.id)
          break
        }

        const grossAmount = session.amount_total ?? 0
        const platformFee = Math.round(grossAmount * PLATFORM_FEE_PCT)
        const sellerPayout = grossAmount - platformFee
        const payoutEligibleAt = new Date(Date.now() + PAYOUT_HOLD_DAYS * 24 * 60 * 60 * 1000).toISOString()

        // Create order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            buyer_id: buyerId,
            seller_identity_id: sellerIdentityId,
            listing_id: listingId,
            order_type: orderType ?? 'product',
            status: 'paid',
            total_amount: grossAmount,
            stripe_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent as string ?? null,
            platform_fee_amount: platformFee,
            seller_payout_amount: sellerPayout,
            payout_eligible_at: payoutEligibleAt,
          })
          .select('id')
          .single()

        if (orderError || !order) {
          console.error('Failed to create order:', orderError)
          break
        }

        // For products: create download entitlement
        if (orderType === 'product') {
          const { data: productFile } = await supabase
            .from('product_files')
            .select('id')
            .eq('listing_id', listingId)
            .limit(1)
            .single()

          if (productFile) {
            await supabase.from('product_purchases').insert({
              order_id: order.id,
              buyer_id: buyerId,
              listing_id: listingId,
              product_file_id: productFile.id,
              download_count: 0,
            })
          }
        }

        // For packages: record the package on the order
        if (packageId) {
          await supabase.from('order_items').insert({
            order_id: order.id,
            package_id: packageId,
            quantity: 1,
            unit_price: grossAmount,
          })
        }

        // Notify seller
        const { data: identity } = await supabase
          .from('seller_identities')
          .select('account_id')
          .eq('id', sellerIdentityId)
          .single()

        if (identity) {
          await supabase.from('notifications').insert({
            user_id: identity.account_id,
            type: 'order_placed',
            title: 'New order received',
            body: `You have a new order worth ${formatCents(sellerPayout)} (after platform fee). Payout scheduled in ${PAYOUT_HOLD_DAYS} days.`,
            is_read: false,
            action_url: `/orders/${order.id}`,
          })
        }

        // Notify buyer
        await supabase.from('notifications').insert({
          user_id: buyerId,
          type: 'order_placed',
          title: 'Order confirmed',
          body: `Your payment of ${formatCents(grossAmount)} was received. Your order is now active.`,
          is_read: false,
          action_url: `/orders/${order.id}`,
        })

        break
      }

      // ── Payment failed / refunded ───────────────────────────────────────
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const paymentIntentId = charge.payment_intent as string
        if (!paymentIntentId) break

        await supabase
          .from('orders')
          .update({ status: 'refunded' })
          .eq('stripe_payment_intent_id', paymentIntentId)

        break
      }
    }
  } catch (err) {
    console.error('Webhook processing error:', err)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
