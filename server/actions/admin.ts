'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) throw new Error('Not authorized')
  return user
}

export async function approveVerification(requestId: string): Promise<void> {
  await assertAdmin()
  const serviceClient = await createServiceClient()

  // Get the request
  const { data: req } = await serviceClient
    .from('verification_requests')
    .select('id, seller_identity_id')
    .eq('id', requestId)
    .single()

  if (!req) throw new Error('Request not found')

  // Approve request
  await serviceClient
    .from('verification_requests')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', requestId)

  // Update seller identity
  await serviceClient
    .from('seller_identities')
    .update({ verification_status: 'approved' })
    .eq('id', req.seller_identity_id)

  // Notify seller account
  const { data: identity } = await serviceClient
    .from('seller_identities')
    .select('account_id, display_name')
    .eq('id', req.seller_identity_id)
    .single()

  if (identity) {
    await serviceClient.from('notifications').insert({
      user_id: identity.account_id,
      type: 'verification_approved',
      title: 'Verification Approved',
      body: `Your seller identity "${identity.display_name}" has been verified!`,
      is_read: false,
      action_url: '/account/verification',
    })
  }

  revalidatePath('/admin/verification')
}

export async function rejectVerification(requestId: string, notes: string): Promise<void> {
  await assertAdmin()
  const serviceClient = await createServiceClient()

  const { data: req } = await serviceClient
    .from('verification_requests')
    .select('id, seller_identity_id')
    .eq('id', requestId)
    .single()

  if (!req) throw new Error('Request not found')

  await serviceClient
    .from('verification_requests')
    .update({ status: 'rejected', reviewed_at: new Date().toISOString(), admin_notes: notes })
    .eq('id', requestId)

  await serviceClient
    .from('seller_identities')
    .update({ verification_status: 'rejected' })
    .eq('id', req.seller_identity_id)

  const { data: identity } = await serviceClient
    .from('seller_identities')
    .select('account_id, display_name')
    .eq('id', req.seller_identity_id)
    .single()

  if (identity) {
    await serviceClient.from('notifications').insert({
      user_id: identity.account_id,
      type: 'verification_rejected',
      title: 'Verification Not Approved',
      body: notes || 'Your verification request was not approved at this time.',
      is_read: false,
      action_url: '/account/verification',
    })
  }

  revalidatePath('/admin/verification')
}
