import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail, verificationConfirmedEmail } from '@/lib/email'
import { createMarketplaceOrder } from '@/lib/orders'
import Stripe from 'stripe'

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

        // ── Save the buyer's Stripe customer for future off-session charges ─
        if (session.customer && meta.buyerId) {
          await supabase
            .from('profiles')
            .update({ stripe_customer_id: session.customer as string })
            .eq('id', meta.buyerId)
            .is('stripe_customer_id', null)
        }

        // ── Marketplace orders ────────────────────────────────────────────
        const { listingId, buyerId, sellerIdentityId, orderType, packageId, apiKeyId } = meta

        if (!listingId || !buyerId || !sellerIdentityId) {
          console.error('Missing metadata on checkout session', session.id)
          break
        }

        let parsedAddons: unknown[] = []
        try {
          const a = JSON.parse(meta.addons ?? '[]')
          if (Array.isArray(a)) parsedAddons = a
        } catch { parsedAddons = [] }

        await createMarketplaceOrder({
          buyerId,
          sellerIdentityId,
          listingId,
          orderType,
          packageId: packageId || null,
          addons: parsedAddons,
          grossAmount: session.amount_total ?? 0,
          stripeSessionId: session.id,
          stripePaymentIntentId: (session.payment_intent as string) ?? null,
          apiKeyId: apiKeyId || null,
        })

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

      // ── Chargeback opened ───────────────────────────────────────────────
      // Mark the order disputed so the payout cron (which only pays 'paid'
      // orders) won't release funds Stripe is about to claw back.
      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute
        const paymentIntentId = dispute.payment_intent as string
        if (!paymentIntentId) break

        const { data: disputedOrder } = await supabase
          .from('orders')
          .update({ status: 'disputed' })
          .eq('stripe_payment_intent_id', paymentIntentId)
          .select('id, buyer_id, seller_identity_id')
          .maybeSingle()

        if (disputedOrder) {
          const { data: identity } = await supabase
            .from('seller_identities')
            .select('account_id')
            .eq('id', disputedOrder.seller_identity_id)
            .single()
          if (identity) {
            await supabase.from('notifications').insert({
              user_id: identity.account_id,
              type: 'order_disputed',
              title: 'Order disputed',
              body: 'A buyer opened a payment dispute on one of your orders. Payout is on hold while it is resolved.',
              is_read: false,
              action_url: `/orders/${disputedOrder.id}`,
            })
          }
        }

        break
      }
    }
  } catch (err) {
    console.error('Webhook processing error:', err)
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
