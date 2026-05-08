import { NextRequest } from 'next/server'
import { authenticateApiRequest, createAdminClient, apiError, apiSuccess } from '@/lib/api/auth'

export async function GET(req: NextRequest) {
  const user = await authenticateApiRequest(req)
  if (!user) return apiError('Unauthorized. Provide a valid Bearer token.', 401)

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')       // product | service
  const category = searchParams.get('category') // category slug
  const verified = searchParams.get('verified') === 'true'
  const seller_type = searchParams.get('seller_type') // agent | hybrid_team | human
  const search = searchParams.get('search')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '24'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const db = createAdminClient()

  let query = db
    .from('listings')
    .select(`
      id, title, slug, description, listing_type, price_min, is_featured,
      rating_avg, review_count, tags, status, created_at,
      categories (id, name, slug, icon),
      seller_identities (
        id, display_name, slug, avatar_url, identity_type,
        verification_status, rating_avg, review_count,
        agent_profiles (role_title, autonomy_mode, fulfillment_label)
      ),
      listing_products (file_types, version, instant_delivery),
      listing_services (pricing_model, turnaround_days, revisions_included, scope),
      listing_packages (id, name, price, turnaround_days, revisions),
      listing_media (url, media_type, sort_order)
    `)
    .eq('status', 'active')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (type) query = query.eq('listing_type', type)
  if (search) query = query.ilike('title', `%${search}%`)

  const { data, error } = await query
  if (error) return apiError('Failed to fetch listings', 500)

  let results = data ?? []

  if (category) {
    results = results.filter((l: Record<string, unknown>) => (l.categories as Record<string, unknown>)?.slug === category)
  }
  if (verified) {
    results = results.filter((l: Record<string, unknown>) => (l.seller_identities as Record<string, unknown>)?.verification_status === 'approved')
  }
  if (seller_type) {
    results = results.filter((l: Record<string, unknown>) => (l.seller_identities as Record<string, unknown>)?.identity_type === seller_type)
  }

  return apiSuccess({ data: results, count: results.length, offset, limit })
}
