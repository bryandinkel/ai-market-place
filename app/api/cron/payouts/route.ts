import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { createServiceClient } from '@/lib/supabase/server'

// POST /api/cron/payouts
// Called by Vercel cron or manually by admin. Protected by CRON_SECRET.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  // Find orders eligible for payout (hold period elapsed, no payout yet, seller has Connect account)
  const { data: eligibleOrders, error } = await supabase
    .from('orders')
    .select(`
      id,
      seller_payout_amount,
      platform_fee_amount,
      total_amount,
      seller_identity_id,
      seller_identities (
        id,
        display_name,
        stripe_account_id,
        stripe_onboarding_complete
      )
    `)
    .lte('payout_eligible_at', new Date().toISOString())
    .is('payout_record_id', null)
    .eq('status', 'paid')

  if (error) {
    console.error('Failed to fetch eligible orders:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!eligibleOrders?.length) {
    return NextResponse.json({ processed: 0, message: 'No eligible orders' })
  }

  const results = { success: 0, skipped: 0, failed: 0 }

  for (const order of eligibleOrders) {
    const identity = order.seller_identities as {
      id: string
      display_name: string
      stripe_account_id: string | null
      stripe_onboarding_complete: boolean
    } | null

    if (!identity?.stripe_account_id || !identity.stripe_onboarding_complete) {
      results.skipped++
      continue
    }

    const netAmount = order.seller_payout_amount ?? 0
    if (netAmount <= 0) {
      results.skipped++
      continue
    }

    try {
      // Create Stripe transfer to connected account
      const transfer = await stripe.transfers.create({
        amount: netAmount,
        currency: 'usd',
        destination: identity.stripe_account_id,
        metadata: { order_id: order.id, seller_identity_id: identity.id },
      })

      // Create payout_record
      const { data: payoutRecord, error: prError } = await supabase
        .from('payout_records')
        .insert({
          seller_identity_id: identity.id,
          order_id: order.id,
          amount: netAmount,
          gross_amount: order.total_amount,
          platform_fee: order.platform_fee_amount ?? 0,
          net_amount: netAmount,
          stripe_transfer_id: transfer.id,
          status: 'paid',
          paid_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (prError || !payoutRecord) {
        console.error(`Failed to insert payout_record for order ${order.id}:`, prError)
        results.failed++
        continue
      }

      // Link order → payout_record
      await supabase
        .from('orders')
        .update({ payout_record_id: payoutRecord.id })
        .eq('id', order.id)

      results.success++
    } catch (err) {
      console.error(`Transfer failed for order ${order.id}:`, err)

      // Record failed payout
      await supabase.from('payout_records').insert({
        seller_identity_id: identity.id,
        order_id: order.id,
        amount: netAmount,
        gross_amount: order.total_amount,
        platform_fee: order.platform_fee_amount ?? 0,
        net_amount: netAmount,
        status: 'failed',
        failure_message: err instanceof Error ? err.message : 'Transfer failed',
      })

      results.failed++
    }
  }

  return NextResponse.json({
    processed: eligibleOrders.length,
    ...results,
  })
}
