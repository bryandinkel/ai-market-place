'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function acceptDelivery(orderId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  // Verify the order belongs to this buyer
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, buyer_id, seller_identity_id, status')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) throw new Error('Order not found')
  if (order.buyer_id !== user.id) throw new Error('Not authorized')
  if (order.status !== 'delivered') throw new Error('Order is not in delivered status')

  const serviceClient = await createServiceClient()

  // Update order status to completed
  const { error: orderError } = await serviceClient
    .from('orders')
    .update({ status: 'completed' })
    .eq('id', orderId)

  if (orderError) throw new Error(orderError.message)

  // Update the latest delivery to approved
  const { data: delivery } = await serviceClient
    .from('deliveries')
    .select('id')
    .eq('order_id', orderId)
    .eq('status', 'submitted')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (delivery) {
    await serviceClient
      .from('deliveries')
      .update({ status: 'approved' })
      .eq('id', delivery.id)
  }

  // Notify the seller's account
  const { data: identity } = await serviceClient
    .from('seller_identities')
    .select('account_id')
    .eq('id', order.seller_identity_id)
    .single()

  if (identity) {
    await serviceClient.from('notifications').insert({
      user_id: identity.account_id,
      type: 'delivery_accepted',
      title: 'Delivery Accepted',
      body: 'The buyer has accepted your delivery. Order is now complete.',
      is_read: false,
      action_url: `/orders/${orderId}`,
      metadata: { order_id: orderId },
    })
  }

  // Notify the buyer
  await serviceClient.from('notifications').insert({
    user_id: user.id,
    type: 'order_completed',
    title: 'Order Completed',
    body: 'Your order has been marked as complete. Please leave a review!',
    is_read: false,
    action_url: `/orders/${orderId}`,
    metadata: { order_id: orderId },
  })

  revalidatePath(`/orders/${orderId}`)
  revalidatePath('/orders')
  revalidatePath('/dashboard/buyer')
}

export async function requestRevision(orderId: string, reason: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, buyer_id, seller_identity_id, status')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) throw new Error('Order not found')
  if (order.buyer_id !== user.id) throw new Error('Not authorized')
  if (order.status !== 'delivered') throw new Error('Order is not in delivered status')

  const serviceClient = await createServiceClient()

  const { error: orderError } = await serviceClient
    .from('orders')
    .update({ status: 'revision_requested' })
    .eq('id', orderId)

  if (orderError) throw new Error(orderError.message)

  // Update latest delivery status
  const { data: delivery } = await serviceClient
    .from('deliveries')
    .select('id')
    .eq('order_id', orderId)
    .eq('status', 'submitted')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (delivery) {
    await serviceClient
      .from('deliveries')
      .update({ status: 'revision_requested' })
      .eq('id', delivery.id)
  }

  // Notify seller
  const { data: identity } = await serviceClient
    .from('seller_identities')
    .select('account_id')
    .eq('id', order.seller_identity_id)
    .single()

  if (identity) {
    await serviceClient.from('notifications').insert({
      user_id: identity.account_id,
      type: 'revision_requested',
      title: 'Revision Requested',
      body: `The buyer has requested a revision: ${reason}`,
      is_read: false,
      action_url: `/orders/${orderId}`,
      metadata: { order_id: orderId, reason },
    })
  }

  revalidatePath(`/orders/${orderId}`)
  revalidatePath('/orders')
  revalidatePath('/dashboard/buyer')
}

export async function openDispute(
  orderId: string,
  reason: string,
  description: string
): Promise<void> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, buyer_id, seller_identity_id, status')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) throw new Error('Order not found')
  if (order.buyer_id !== user.id) throw new Error('Not authorized')

  const allowedStatuses = ['paid', 'in_progress', 'delivered', 'revision_requested']
  if (!allowedStatuses.includes(order.status)) {
    throw new Error('Cannot open a dispute for this order status')
  }

  const serviceClient = await createServiceClient()

  // Insert dispute
  const { error: disputeError } = await serviceClient
    .from('disputes')
    .insert({
      order_id: orderId,
      initiator_id: user.id,
      reason,
      description: description || null,
      status: 'open',
      resolution_notes: null,
    })

  if (disputeError) throw new Error(disputeError.message)

  // Update order status
  const { error: orderError } = await serviceClient
    .from('orders')
    .update({ status: 'disputed' })
    .eq('id', orderId)

  if (orderError) throw new Error(orderError.message)

  // Notify seller
  const { data: identity } = await serviceClient
    .from('seller_identities')
    .select('account_id')
    .eq('id', order.seller_identity_id)
    .single()

  if (identity) {
    await serviceClient.from('notifications').insert({
      user_id: identity.account_id,
      type: 'dispute_opened',
      title: 'Dispute Opened',
      body: `A dispute has been opened on order #${orderId.slice(0, 8)}: ${reason}`,
      is_read: false,
      action_url: `/orders/${orderId}`,
      metadata: { order_id: orderId, reason },
    })
  }

  revalidatePath(`/orders/${orderId}`)
  revalidatePath('/orders')
  revalidatePath('/dashboard/buyer')
}

export interface SubmitReviewData {
  orderId: string
  sellerIdentityId: string
  speedRating: number
  qualityRating: number
  communicationRating: number
  accuracyRating: number
  fulfillmentMatchRating: number
  reviewText?: string
}

export async function submitReview(data: SubmitReviewData): Promise<void> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  // Verify the order is completed and belongs to buyer
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, buyer_id, status')
    .eq('id', data.orderId)
    .single()

  if (fetchError || !order) throw new Error('Order not found')
  if (order.buyer_id !== user.id) throw new Error('Not authorized')
  if (order.status !== 'completed') throw new Error('Can only review completed orders')

  // Check for existing review
  const { data: existingReview } = await supabase
    .from('reviews')
    .select('id')
    .eq('order_id', data.orderId)
    .eq('reviewer_id', user.id)
    .single()

  if (existingReview) throw new Error('You have already reviewed this order')

  const overallAvg =
    (data.speedRating +
      data.qualityRating +
      data.communicationRating +
      data.accuracyRating +
      data.fulfillmentMatchRating) /
    5

  const serviceClient = await createServiceClient()

  const { error: reviewError } = await serviceClient
    .from('reviews')
    .insert({
      order_id: data.orderId,
      reviewer_id: user.id,
      seller_identity_id: data.sellerIdentityId,
      speed_rating: data.speedRating,
      quality_rating: data.qualityRating,
      communication_rating: data.communicationRating,
      accuracy_rating: data.accuracyRating,
      fulfillment_match_rating: data.fulfillmentMatchRating,
      review_text: data.reviewText ?? null,
      overall_avg: overallAvg,
    })

  if (reviewError) throw new Error(reviewError.message)

  // Update seller identity review stats
  const { data: allReviews } = await serviceClient
    .from('reviews')
    .select('overall_avg')
    .eq('seller_identity_id', data.sellerIdentityId)

  if (allReviews && allReviews.length > 0) {
    const newAvg =
      allReviews.reduce((sum, r) => sum + r.overall_avg, 0) / allReviews.length

    await serviceClient
      .from('seller_identities')
      .update({
        rating_avg: parseFloat(newAvg.toFixed(2)),
        review_count: allReviews.length,
      })
      .eq('id', data.sellerIdentityId)
  }

  revalidatePath(`/orders/${data.orderId}`)
}
