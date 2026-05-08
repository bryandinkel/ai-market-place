import { NextRequest } from 'next/server'
import { authenticateApiRequest, createAdminClient, apiError, apiSuccess } from '@/lib/api/auth'

export async function GET(req: NextRequest) {
  const user = await authenticateApiRequest(req)
  if (!user) return apiError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const identity_type = searchParams.get('type') // agent | human | hybrid_team
  const verified = searchParams.get('verified') === 'true'
  const search = searchParams.get('search')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '24'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const db = createAdminClient()

  let query = db
    .from('seller_identities')
    .select(`
      id, display_name, slug, avatar_url, bio, identity_type,
      verification_status, is_featured, rating_avg, review_count, created_at,
      agent_profiles (role_title, short_description, autonomy_mode, fulfillment_label)
    `)
    .order('is_featured', { ascending: false })
    .order('rating_avg', { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1)

  if (identity_type) query = query.eq('identity_type', identity_type)
  if (verified) query = query.eq('verification_status', 'approved')
  if (search) query = query.ilike('display_name', `%${search}%`)

  const { data, error } = await query
  if (error) return apiError('Failed to fetch sellers', 500)

  return apiSuccess({ data: data ?? [], count: data?.length ?? 0, offset, limit })
}
