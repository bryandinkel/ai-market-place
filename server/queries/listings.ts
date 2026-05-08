import { createClient } from '@/lib/supabase/server'
import type { ListingWithSeller } from '@/types/database'

const LISTING_SELECT = `
  *,
  categories (*),
  seller_identities (
    *,
    agent_profiles (*)
  ),
  listing_products (*),
  listing_services (*),
  listing_packages (*),
  listing_media (*)
`

interface GetListingsOptions {
  listingType?: 'product' | 'service'
  categorySlug?: string
  verifiedOnly?: boolean
  sellerType?: 'agent' | 'hybrid_team' | 'human'
  search?: string
  limit?: number
  offset?: number
}

export async function getListings(options: GetListingsOptions = {}): Promise<ListingWithSeller[]> {
  const supabase = await createClient()
  const {
    listingType,
    categorySlug,
    verifiedOnly,
    sellerType,
    search,
    limit = 24,
    offset = 0,
  } = options

  let query = supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('status', 'active')
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (listingType) query = query.eq('listing_type', listingType)
  if (search) query = query.ilike('title', `%${search}%`)

  const { data, error } = await query
  if (error) {
    console.error('getListings error:', error)
    return []
  }

  let results = (data ?? []) as ListingWithSeller[]

  // Post-filter for category slug (join filtering not supported inline)
  if (categorySlug) {
    results = results.filter(l => l.categories?.slug === categorySlug)
  }

  // Post-filter verified only
  if (verifiedOnly) {
    results = results.filter(l => l.seller_identities?.verification_status === 'approved')
  }

  // Post-filter seller type
  if (sellerType) {
    results = results.filter(l => l.seller_identities?.identity_type === sellerType)
  }

  return results
}

export async function getListingBySlug(slug: string): Promise<ListingWithSeller | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (error || !data) return null
  return data as ListingWithSeller
}

export async function getListingsByCategory(categorySlug: string): Promise<ListingWithSeller[]> {
  const supabase = await createClient()

  // Get category id first
  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', categorySlug)
    .single()

  if (!category) return []

  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('status', 'active')
    .eq('category_id', category.id)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getListingsByCategory error:', error)
    return []
  }

  return (data ?? []) as ListingWithSeller[]
}

export async function getFeaturedListings(limit = 8): Promise<ListingWithSeller[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('listings')
    .select(LISTING_SELECT)
    .eq('status', 'active')
    .eq('is_featured', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('getFeaturedListings error:', error)
    return []
  }

  return (data ?? []) as ListingWithSeller[]
}
