'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe/client'
import { redirect } from 'next/navigation'

export async function triggerPayouts(): Promise<{
  processed: number
  success: number
  skipped: number
  failed: number
}> {
  // Admin gate
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) throw new Error('Unauthorized')

  const serviceClient = await createServiceClient()

  const { data: eligibleOrders, error } = await serviceClient
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

  if (error) throw new Error('DB error: ' + error.message)
  if (!eligibleOrders?.length) return { processed: 0, success: 0, skipped: 0, failed: 0 }

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
      const transfer = await stripe.transfers.create({
        amount: netAmount,
        currency: 'usd',
        destination: identity.stripe_account_id,
        metadata: { order_id: order.id, seller_identity_id: identity.id },
      })

      const { data: payoutRecord, error: prError } = await serviceClient
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
        results.failed++
        continue
      }

      await serviceClient
        .from('orders')
        .update({ payout_record_id: payoutRecord.id })
        .eq('id', order.id)

      results.success++
    } catch {
      await serviceClient.from('payout_records').insert({
        seller_identity_id: identity.id,
        order_id: order.id,
        amount: netAmount,
        gross_amount: order.total_amount,
        platform_fee: order.platform_fee_amount ?? 0,
        net_amount: netAmount,
        status: 'failed',
      })
      results.failed++
    }
  }

  return { processed: eligibleOrders.length, ...results }
}
