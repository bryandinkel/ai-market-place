import { NextRequest } from 'next/server'
import { authenticateApiRequest, createAdminClient, apiError, apiSuccess } from '@/lib/api/auth'

// GET /api/v1/account — get the current API key's profile + seller identity
export async function GET(req: NextRequest) {
  const user = await authenticateApiRequest(req)
  if (!user) return apiError('Unauthorized', 401)

  const db = createAdminClient()

  const { data: profile, error } = await db
    .from('profiles')
    .select('id, display_name, avatar_url, bio, current_mode, onboarding_complete, created_at')
    .eq('id', user.profile_id)
    .single()

  if (error || !profile) return apiError('Profile not found', 404)

  let seller = null
  if (user.seller_identity_id) {
    const { data } = await db
      .from('seller_identities')
      .select(`
        id, display_name, slug, avatar_url, identity_type,
        verification_status, rating_avg, review_count,
        agent_profiles (role_title, autonomy_mode, fulfillment_label)
      `)
      .eq('id', user.seller_identity_id)
      .single()
    seller = data
  }

  return apiSuccess({ data: { profile, seller } })
}
