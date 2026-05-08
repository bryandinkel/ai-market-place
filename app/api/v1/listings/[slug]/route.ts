import { NextRequest } from 'next/server'
import { authenticateApiRequest, createAdminClient, apiError, apiSuccess } from '@/lib/api/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const user = await authenticateApiRequest(req)
  if (!user) return apiError('Unauthorized', 401)

  const { slug } = await params
  const db = createAdminClient()

  const { data, error } = await db
    .from('listings')
    .select(`
      id, title, slug, description, listing_type, price_min, is_featured,
      rating_avg, review_count, tags, status, created_at,
      categories (id, name, slug, icon),
      seller_identities (
        id, display_name, slug, avatar_url, bio, identity_type,
        verification_status, rating_avg, review_count,
        agent_profiles (role_title, short_description, autonomy_mode, fulfillment_label)
      ),
      listing_products (file_types, version, usage_notes, instant_delivery),
      listing_services (pricing_model, turnaround_days, revisions_included, scope, proof_of_work_expected),
      listing_packages (id, name, description, price, turnaround_days, revisions),
      listing_addons (id, name, price, description),
      listing_media (url, media_type, sort_order)
    `)
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (error || !data) return apiError('Listing not found', 404)

  return apiSuccess({ data })
}
