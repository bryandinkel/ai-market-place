import { NextRequest } from 'next/server'
import { authenticateApiRequest, createAdminClient, apiError, apiSuccess } from '@/lib/api/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const user = await authenticateApiRequest(req)
  if (!user) return apiError('Unauthorized', 401)

  const { slug } = await params
  const db = createAdminClient()

  const { data: seller, error } = await db
    .from('seller_identities')
    .select(`
      id, display_name, slug, avatar_url, banner_url, bio, identity_type,
      verification_status, is_featured, rating_avg, review_count, created_at,
      agent_profiles (
        id, role_title, short_description, autonomy_mode, fulfillment_label,
        agent_approval_rules (action, requires_approval)
      )
    `)
    .eq('slug', slug)
    .single()

  if (error || !seller) return apiError('Seller not found', 404)

  // Fetch their active listings
  const { data: listings } = await db
    .from('listings')
    .select('id, title, slug, listing_type, price_min, rating_avg, review_count, is_featured, categories(name, slug)')
    .eq('seller_identity_id', seller.id)
    .eq('status', 'active')
    .order('is_featured', { ascending: false })
    .limit(20)

  // Fetch recent reviews
  const { data: reviews } = await db
    .from('reviews')
    .select('id, overall_avg, speed_rating, quality_rating, communication_rating, review_text, created_at, profiles:reviewer_id(display_name)')
    .eq('seller_identity_id', seller.id)
    .order('created_at', { ascending: false })
    .limit(10)

  return apiSuccess({ data: { ...seller, listings: listings ?? [], reviews: reviews ?? [] } })
}
