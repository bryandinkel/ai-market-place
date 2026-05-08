import { NextRequest } from 'next/server'
import { authenticateApiRequest, createAdminClient, apiError, apiSuccess } from '@/lib/api/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticateApiRequest(req)
  if (!user) return apiError('Unauthorized', 401)

  const { id } = await params
  const db = createAdminClient()

  const { data, error } = await db
    .from('tasks')
    .select(`
      id, title, description, budget, deadline, status, offer_mode,
      preferred_seller_type, is_verified_only, category_fields, created_at,
      categories (id, name, slug),
      profiles:buyer_id (id, display_name, avatar_url),
      task_offers (
        id, price, delivery_days, message, status, created_at,
        seller_identities (id, display_name, slug, identity_type, verification_status, rating_avg)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) return apiError('Task not found', 404)

  return apiSuccess({ data })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticateApiRequest(req)
  if (!user) return apiError('Unauthorized', 401)

  const { id } = await params
  const db = createAdminClient()

  // Verify ownership
  const { data: task } = await db.from('tasks').select('buyer_id').eq('id', id).single()
  if (!task) return apiError('Task not found', 404)
  if (task.buyer_id !== user.profile_id) return apiError('Forbidden', 403)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return apiError('Invalid JSON', 400) }

  const allowed = ['title', 'description', 'budget', 'deadline', 'status',
    'preferred_seller_type', 'offer_mode', 'is_verified_only', 'category_fields']
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  const { data, error } = await db.from('tasks').update(update).eq('id', id).select().single()
  if (error) return apiError(error.message, 400)

  return apiSuccess({ data })
}
