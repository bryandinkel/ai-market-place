'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createNotification } from '@/server/actions/notifications'

export interface CreateTaskData {
  title: string
  description: string
  categoryId: string
  budget: number
  deadline?: string
  preferredSellerType: 'agent' | 'hybrid' | 'human' | 'best_available'
  offerMode: 'receive_offers' | 'direct_hire_only'
  isVerifiedOnly: boolean
}

export async function createTask(data: CreateTaskData): Promise<void> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const serviceClient = await createServiceClient()

  const { error } = await serviceClient.from('tasks').insert({
    buyer_id: user.id,
    title: data.title,
    description: data.description,
    category_id: data.categoryId,
    budget: data.budget,
    deadline: data.deadline ?? null,
    preferred_seller_type: data.preferredSellerType,
    offer_mode: data.offerMode,
    is_verified_only: data.isVerifiedOnly,
    status: 'open',
    is_flagged: false,
    category_fields: {},
  })

  if (error) throw new Error(error.message)

  revalidatePath('/requests')
  redirect('/requests')
}

export interface SubmitOfferData {
  taskId: string
  price: number
  deliveryDays: number
  message: string
}

export async function submitOffer(data: SubmitOfferData): Promise<void> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  // Get the seller identity for this user
  const { data: identity, error: identityError } = await supabase
    .from('seller_identities')
    .select('id')
    .eq('account_id', user.id)
    .limit(1)
    .single()

  if (identityError || !identity) throw new Error('You must have a seller identity to submit offers')

  const serviceClient = await createServiceClient()

  const { error } = await serviceClient.from('task_offers').insert({
    task_id: data.taskId,
    seller_identity_id: identity.id,
    price: data.price,
    delivery_days: data.deliveryDays,
    message: data.message,
    status: 'pending',
  })

  if (error) throw new Error(error.message)

  // Notify the task buyer
  const { data: task } = await supabase
    .from('tasks')
    .select('buyer_id, title')
    .eq('id', data.taskId)
    .single()

  if (task) {
    await createNotification({
      userId: task.buyer_id,
      type: 'offer_received',
      title: 'New offer on your task',
      body: `Someone submitted an offer on "${task.title}".`,
      actionUrl: `/requests/${data.taskId}`,
    })
  }

  revalidatePath(`/requests/${data.taskId}`)
}

export async function acceptOffer(offerId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  // Fetch the offer with task info
  const { data: offer, error: offerError } = await supabase
    .from('task_offers')
    .select('id, task_id, seller_identity_id, price, delivery_days, status')
    .eq('id', offerId)
    .single()

  if (offerError || !offer) throw new Error('Offer not found')
  if (offer.status !== 'pending') throw new Error('Offer is no longer pending')

  // Verify caller is the task buyer
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('id, buyer_id, title')
    .eq('id', offer.task_id)
    .single()

  if (taskError || !task) throw new Error('Task not found')
  if (task.buyer_id !== user.id) throw new Error('Not authorized')

  const serviceClient = await createServiceClient()

  // Accept this offer
  const { error: acceptError } = await serviceClient
    .from('task_offers')
    .update({ status: 'accepted' })
    .eq('id', offerId)

  if (acceptError) throw new Error(acceptError.message)

  // Reject all other pending offers for this task
  await serviceClient
    .from('task_offers')
    .update({ status: 'rejected' })
    .eq('task_id', offer.task_id)
    .eq('status', 'pending')
    .neq('id', offerId)

  // Close the task
  await serviceClient
    .from('tasks')
    .update({ status: 'closed' })
    .eq('id', offer.task_id)

  // Create an order
  const { data: order, error: orderError } = await serviceClient
    .from('orders')
    .insert({
      buyer_id: user.id,
      seller_identity_id: offer.seller_identity_id,
      total_cents: offer.price,
      status: 'pending_payment',
    })
    .select('id')
    .single()

  if (orderError) throw new Error(orderError.message)

  // Notify the seller
  const { data: identity } = await serviceClient
    .from('seller_identities')
    .select('account_id')
    .eq('id', offer.seller_identity_id)
    .single()

  if (identity) {
    await serviceClient.from('notifications').insert({
      user_id: identity.account_id,
      type: 'offer_accepted',
      title: 'Offer Accepted',
      body: `Your offer on "${task.title}" was accepted. An order has been created.`,
      is_read: false,
      action_url: `/orders/${order.id}`,
      metadata: { task_id: offer.task_id, offer_id: offerId, order_id: order.id },
    })
  }

  // Notify the buyer
  await serviceClient.from('notifications').insert({
    user_id: user.id,
    type: 'offer_accepted',
    title: 'Offer Accepted',
    body: `You accepted an offer on "${task.title}". Your order is ready.`,
    is_read: false,
    action_url: `/orders/${order.id}`,
    metadata: { task_id: offer.task_id, offer_id: offerId, order_id: order.id },
  })

  revalidatePath(`/requests/${offer.task_id}`)
  revalidatePath('/requests')
  revalidatePath('/orders')
}

export async function withdrawOffer(offerId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  // Verify the offer belongs to this seller
  const { data: identity } = await supabase
    .from('seller_identities')
    .select('id')
    .eq('account_id', user.id)
    .limit(1)
    .single()

  if (!identity) throw new Error('Seller identity not found')

  const { data: offer, error: offerError } = await supabase
    .from('task_offers')
    .select('id, task_id, seller_identity_id, status')
    .eq('id', offerId)
    .single()

  if (offerError || !offer) throw new Error('Offer not found')
  if (offer.seller_identity_id !== identity.id) throw new Error('Not authorized')
  if (offer.status !== 'pending') throw new Error('Only pending offers can be withdrawn')

  const serviceClient = await createServiceClient()

  const { error } = await serviceClient
    .from('task_offers')
    .update({ status: 'withdrawn' })
    .eq('id', offerId)

  if (error) throw new Error(error.message)

  revalidatePath(`/requests/${offer.task_id}`)
}
