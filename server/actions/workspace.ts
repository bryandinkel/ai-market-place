'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'
import type { AgentProfile } from '@/types/database'

export interface CreateAgentIdentityData {
  // Step 1 – Identity
  display_name: string
  avatar_url?: string
  bio?: string
  // Step 2 – Role
  role_title: string
  short_description: string
  category_ids: string[]
  // Step 3 – Autonomy
  autonomy_mode: AgentProfile['autonomy_mode']
  fulfillment_label: AgentProfile['fulfillment_label']
  // Step 4 – Approval rules
  approval_rules: Record<string, boolean> // action -> requires_approval
}

export async function createAgentIdentity(
  data: CreateAgentIdentityData
): Promise<{ id: string; sellerIdentityId: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  // Fetch workspace
  const { data: workspace, error: wsError } = await supabase
    .from('sponsor_workspaces')
    .select('id')
    .eq('owner_id', user.id)
    .single()
  if (wsError || !workspace) throw new Error('No sponsor workspace found. Please create one first.')

  const serviceClient = await createServiceClient()

  // Check agent limit
  const { count: agentCount } = await serviceClient
    .from('agent_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('sponsor_workspace_id', workspace.id)

  if ((agentCount ?? 0) >= 5) {
    throw new Error('Agent limit reached. A workspace can have at most 5 agents.')
  }

  // Create seller identity (type=agent)
  const baseSlug = slugify(data.display_name)
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`

  const { data: identity, error: identityError } = await serviceClient
    .from('seller_identities')
    .insert({
      account_id: user.id,
      identity_type: 'agent',
      display_name: data.display_name,
      slug,
      bio: data.bio ?? null,
      avatar_url: data.avatar_url ?? null,
      banner_url: null,
      verification_status: 'none',
      is_featured: false,
      rating_avg: null,
      review_count: 0,
    })
    .select('id')
    .single()

  if (identityError || !identity) throw new Error(identityError?.message ?? 'Failed to create seller identity')

  // Create agent profile
  const { data: agentProfile, error: profileError } = await serviceClient
    .from('agent_profiles')
    .insert({
      seller_identity_id: identity.id,
      sponsor_workspace_id: workspace.id,
      role_title: data.role_title,
      short_description: data.short_description,
      autonomy_mode: data.autonomy_mode,
      fulfillment_label: data.fulfillment_label,
    })
    .select('id')
    .single()

  if (profileError || !agentProfile) throw new Error(profileError?.message ?? 'Failed to create agent profile')

  // Create approval rules for all 5 actions
  const actions = ['purchase', 'accept_job', 'final_delivery', 'refund_cancel', 'messaging'] as const
  const ruleInserts = actions.map(action => ({
    agent_profile_id: agentProfile.id,
    action,
    requires_approval: data.approval_rules[action] ?? false,
  }))

  const { error: rulesError } = await serviceClient
    .from('agent_approval_rules')
    .insert(ruleInserts)

  if (rulesError) throw new Error(rulesError.message)

  // Link categories
  if (data.category_ids.length > 0) {
    const categoryLinks = data.category_ids.map(category_id => ({
      seller_identity_id: identity.id,
      category_id,
    }))

    const { error: catError } = await serviceClient
      .from('seller_identity_categories')
      .insert(categoryLinks)

    if (catError) throw new Error(catError.message)
  }

  revalidatePath('/workspace')

  return { id: agentProfile.id, sellerIdentityId: identity.id }
}

export async function approveRequest(requestId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const serviceClient = await createServiceClient()

  // Fetch the request to verify ownership and get context
  const { data: request, error: fetchError } = await serviceClient
    .from('approval_requests')
    .select('*, sponsor_workspaces(owner_id), agent_profiles(seller_identity_id)')
    .eq('id', requestId)
    .single()

  if (fetchError || !request) throw new Error('Approval request not found')
  const approveReq = request as Record<string, Record<string, string> | null>
  if (approveReq.sponsor_workspaces?.owner_id !== user.id) {
    throw new Error('Not authorized to approve this request')
  }

  const { error: updateError } = await serviceClient
    .from('approval_requests')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  if (updateError) throw new Error(updateError.message)

  // Notify the agent's account — find the account_id through seller_identity
  const sellerIdentityId = approveReq.agent_profiles?.seller_identity_id
  if (sellerIdentityId) {
    const { data: identity } = await serviceClient
      .from('seller_identities')
      .select('account_id, display_name')
      .eq('id', sellerIdentityId)
      .single()

    if (identity) {
      await serviceClient.from('notifications').insert({
        user_id: identity.account_id,
        type: 'approval_approved',
        title: 'Action Approved',
        body: `Your sponsor has approved the requested action.`,
        is_read: false,
        action_url: `/workspace/approvals`,
        metadata: { approval_request_id: requestId, action_type: request.action_type },
      })
    }
  }

  revalidatePath('/workspace/approvals')
  revalidatePath('/workspace')
}

export async function rejectRequest(requestId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const serviceClient = await createServiceClient()

  const { data: request, error: fetchError } = await serviceClient
    .from('approval_requests')
    .select('*, sponsor_workspaces(owner_id), agent_profiles(seller_identity_id)')
    .eq('id', requestId)
    .single()

  if (fetchError || !request) throw new Error('Approval request not found')
  const rejectReq = request as Record<string, Record<string, string> | null>
  if (rejectReq.sponsor_workspaces?.owner_id !== user.id) {
    throw new Error('Not authorized to reject this request')
  }

  const { error: updateError } = await serviceClient
    .from('approval_requests')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)

  if (updateError) throw new Error(updateError.message)

  const sellerIdentityId = rejectReq.agent_profiles?.seller_identity_id
  if (sellerIdentityId) {
    const { data: identity } = await serviceClient
      .from('seller_identities')
      .select('account_id')
      .eq('id', sellerIdentityId)
      .single()

    if (identity) {
      await serviceClient.from('notifications').insert({
        user_id: identity.account_id,
        type: 'approval_rejected',
        title: 'Action Rejected',
        body: `Your sponsor has rejected the requested action.`,
        is_read: false,
        action_url: `/workspace/approvals`,
        metadata: { approval_request_id: requestId, action_type: request.action_type },
      })
    }
  }

  revalidatePath('/workspace/approvals')
  revalidatePath('/workspace')
}
