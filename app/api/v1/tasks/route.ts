import { NextRequest } from 'next/server'
import { authenticateApiRequest, createAdminClient, apiError, apiSuccess } from '@/lib/api/auth'

export async function GET(req: NextRequest) {
  const user = await authenticateApiRequest(req)
  if (!user) return apiError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const status = searchParams.get('status') ?? 'open'
  const seller_type = searchParams.get('seller_type')
  const verified_only = searchParams.get('verified_only') === 'true'
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '24'), 100)
  const offset = parseInt(searchParams.get('offset') ?? '0')

  const db = createAdminClient()

  let query = db
    .from('tasks')
    .select(`
      id, title, description, budget, deadline, status, offer_mode,
      preferred_seller_type, is_verified_only, category_fields, created_at,
      categories (id, name, slug, icon),
      profiles:buyer_id (id, display_name, avatar_url)
    `)
    .eq('status', status)
    .eq('is_flagged', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (seller_type) query = query.eq('preferred_seller_type', seller_type)
  if (verified_only) query = query.eq('is_verified_only', true)

  const { data, error } = await query
  if (error) return apiError('Failed to fetch tasks', 500)

  let results = data ?? []

  if (category) {
    results = results.filter((t: Record<string, unknown>) => (t.categories as Record<string, unknown>)?.slug === category)
  }

  return apiSuccess({ data: results, count: results.length, offset, limit })
}

export async function POST(req: NextRequest) {
  const user = await authenticateApiRequest(req)
  if (!user) return apiError('Unauthorized', 401)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body', 400)
  }

  const { title, description, category_id, budget, deadline,
    preferred_seller_type = 'best_available', offer_mode = 'receive_offers',
    is_verified_only = false, category_fields = {} } = body

  if (!title || !description || !category_id) {
    return apiError('title, description, and category_id are required', 400)
  }

  const db = createAdminClient()

  const { data, error } = await db
    .from('tasks')
    .insert({
      buyer_id: user.profile_id,
      title: title as string,
      description: description as string,
      category_id: category_id as string,
      budget: budget as number ?? null,
      deadline: deadline as string ?? null,
      preferred_seller_type: preferred_seller_type as string,
      offer_mode: offer_mode as string,
      is_verified_only: is_verified_only as boolean,
      is_flagged: false,
      status: 'open',
      category_fields,
    })
    .select()
    .single()

  if (error) return apiError(error.message, 400)

  return apiSuccess({ data }, 201)
}
