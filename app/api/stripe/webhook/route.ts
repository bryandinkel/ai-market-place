import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail, verificationConfirmedEmail, orderConfirmedBuyerEmail, newOrderSellerEmail } from '@/lib/email'
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

      // ── Checkout completed (marketplace orders + verification) ───────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const meta = session.metadata ?? {}

        // ── Verification payments ─────────────────────────────────────────
        if (meta.type === 'verification') {
          const { sellerIdentityId: verifyId, verificationTier, slotNumber } = meta
          if (verifyId) {
            if (verificationTier === 'lifetime') {
              await supabase
                .from('seller_identities')
                .update({
                  is_verified: true,
                  verification_status: 'approved',
                  verification_tier: 'lifetime',
                  verification_slot_number: slotNumber ? parseInt(slotNumber, 10) : null,
                })
                .eq('id', verifyId)

              await supabase.from('verification_requests')
                .update({ status: 'approved' })
                .eq('seller_identity_id', verifyId)
                .eq('status', 'pending')
            }
            if (verificationTier === 'subscription') {
              const subscriptionId = session.subscription as string | null
              await supabase
                .from('seller_identities')
                .update({
                  is_verified: true,
                  verification_status: 'approved',
                  verification_tier: 'subscription',
                  verification_slot_number: slotNumber ? parseInt(slotNumber, 10) : null,
                  verification_subscription_id: subscriptionId,
                  verification_subscription_status: 'active',
                })
                .eq('id', verifyId)

              await supabase.from('verification_requests')
                .update({ status: 'approved' })
                .eq('seller_identity_id', verifyId)
                .eq('status', 'pending')
            }

            // Send verification confirmed email
            const { data: identity } = await supabase
              .from('seller_identities')
              .select('display_name, account_id')
              .eq('id', verifyId)
              .single()
            if (identity) {
              const { data: authUser } = await supabase.auth.admin.getUserById(identity.account_id)
              if (authUser.user?.email) {
                await sendEmail({
                  to: authUser.user.email,
                  subject: 'Your verified badge is now active — The Others Market',
                  html: verificationConfirmedEmail(identity.display_name, verificationTier as string),
                })
              }
            }
          }
          break
        }

        // ── Marketplace orders ────────────────────────────────────────────
        const { listingId, buyerId, sellerIdentityId, orderType, packageId } = meta

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

        // Fetch listing title for notifications
        const { data: listing } = await supabase
          .from('listings')
          .select('title')
          .eq('id', listingId)
          .single()
        const listingTitle = listing?.title ?? 'Your order'

        // Notify + email seller
        const { data: identity } = await supabase
          .from('seller_identities')
          .select('account_id, display_name')
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
          .from('profiles')
          .select('display_name')
          .eq('id', buyerId)
          .single()
        const { data: buyerAuth } = await supabase.auth.admin.getUserById(buyerId)
        if (buyerAuth.user?.email) {
          await sendEmail({
            to: buyerAuth.user.email,
            subject: `Order confirmed: ${listingTitle}`,
            html: orderConfirmedBuyerEmail(buyerProfile?.display_name ?? 'there', order.id, listingTitle, grossAmount),
          })
        }

        break
      }

      // ── Subscription cancelled (period ended) ──────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const { data: identities } = await supabase
          .from('seller_identities')
          .select('id')
          .eq('verification_subscription_id', subscription.id)
          .limit(1)

        if (identities?.[0]) {
          await supabase
            .from('seller_identities')
            .update({
              is_verified: false,
              verification_status: 'none',
              verification_tier: null,
              verification_subscription_id: null,
              verification_subscription_status: 'canceled',
            })
            .eq('id', identities[0].id)
        }
        break
      }

      // ── Subscription payment failed ─────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = (invoice as Stripe.Invoice & { subscription?: string }).subscription
        if (!subscriptionId) break

        const { data: identities } = await supabase
          .from('seller_identities')
          .select('id, account_id')
          .eq('verification_subscription_id', subscriptionId)
          .limit(1)

        if (identities?.[0]) {
          await supabase
            .from('seller_identities')
            .update({ verification_subscription_status: 'past_due' })
            .eq('id', identities[0].id)

          await supabase.from('notifications').insert({
            user_id: identities[0].account_id,
            type: 'verification_payment_failed',
            title: 'Verification payment failed',
            body: 'Your verified badge payment could not be processed. Update your payment method to keep your badge.',
            is_read: false,
            action_url: '/account/verification',
          })
        }
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
