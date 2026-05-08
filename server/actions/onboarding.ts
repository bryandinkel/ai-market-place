'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'
import type { SellerIdentity, SponsorWorkspace, AgentProfile, Profile } from '@/types/database'

export async function markOnboardingComplete(userId: string): Promise<void> {
  const supabase = await createServiceClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('profiles')
    .update({ onboarding_complete: true } satisfies Partial<Profile>)
    .eq('id', userId)

  if (error) throw new Error((error as { message: string }).message)

  revalidatePath('/', 'layout')
}

export interface CreateSellerIdentityData {
  display_name: string
  bio: string
  identity_type?: 'human' | 'agent' | 'hybrid_team'
}

export async function createSellerIdentity(
  data: CreateSellerIdentityData
): Promise<{ id: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const serviceClient = await createServiceClient()

  const baseSlug = slugify(data.display_name)
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`

  const insertPayload: Omit<SellerIdentity, 'id' | 'created_at' | 'updated_at'> = {
    account_id: user.id,
    identity_type: data.identity_type ?? 'human',
    display_name: data.display_name,
    slug,
    bio: data.bio || null,
    avatar_url: null,
    banner_url: null,
    verification_status: 'none',
    is_featured: false,
    rating_avg: null,
    review_count: 0,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: identity, error } = await (serviceClient as any)
    .from('seller_identities')
    .insert(insertPayload)
    .select('id')
    .single()

  if (error) throw new Error((error as { message: string }).message)

  const row = identity as Pick<SellerIdentity, 'id'>
  revalidatePath('/dashboard/seller')
  return { id: row.id }
}

export interface CreateSponsorWorkspaceData {
  name: string
  slug: string
  description: string
}

export async function createSponsorWorkspace(
  data: CreateSponsorWorkspaceData
): Promise<{ id: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const serviceClient = await createServiceClient()

  const wsPayload: Omit<SponsorWorkspace, 'id' | 'created_at' | 'updated_at'> = {
    owner_id: user.id,
    name: data.name,
    slug: data.slug,
    description: data.description || null,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: workspace, error: wsError } = await (serviceClient as any)
    .from('sponsor_workspaces')
    .insert(wsPayload)
    .select('id')
    .single()

  if (wsError) throw new Error((wsError as { message: string }).message)
  const wsRow = workspace as Pick<SponsorWorkspace, 'id'>

  // Create a placeholder agent identity for this workspace
  const agentSlug = `agent-${data.slug}-${Math.random().toString(36).slice(2, 7)}`
  const identityPayload: Omit<SellerIdentity, 'id' | 'created_at' | 'updated_at'> = {
    account_id: user.id,
    identity_type: 'agent',
    display_name: `${data.name} Agent`,
    slug: agentSlug,
    bio: null,
    avatar_url: null,
    banner_url: null,
    verification_status: 'none',
    is_featured: false,
    rating_avg: null,
    review_count: 0,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: agentIdentity, error: identityError } = await (serviceClient as any)
    .from('seller_identities')
    .insert(identityPayload)
    .select('id')
    .single()

  if (identityError) throw new Error((identityError as { message: string }).message)
  const agentRow = agentIdentity as Pick<SellerIdentity, 'id'>

  // Link the agent identity to the workspace via agent_profiles
  const agentProfilePayload: Omit<AgentProfile, 'id' | 'created_at' | 'updated_at'> = {
    seller_identity_id: agentRow.id,
    sponsor_workspace_id: wsRow.id,
    role_title: 'AI Agent',
    short_description: `Agent operating under ${data.name}`,
    autonomy_mode: 'manual',
    fulfillment_label: 'human_review_included',
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: profileError } = await (serviceClient as any)
    .from('agent_profiles')
    .insert(agentProfilePayload)

  if (profileError) throw new Error((profileError as { message: string }).message)

  revalidatePath('/workspace')
  return { id: wsRow.id }
}
