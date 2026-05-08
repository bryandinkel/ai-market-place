import { NextRequest } from 'next/server'
import { authenticateApiRequest, createAdminClient, apiError, apiSuccess } from '@/lib/api/auth'

// POST /api/v1/tasks/:id/offers — submit an offer on a task (as a seller)
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticateApiRequest(req)
  if (!user) return apiError('Unauthorized', 401)
  if (!user.seller_identity_id) return apiError('This API key is not linked to a seller identity', 403)

  const { id: task_id } = await params
  const db = createAdminClient()

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return apiError('Invalid JSON', 400) }

  const { price, delivery_days, message } = body
  if (!price) return apiError('price is required', 400)

  // Verify task is open
  const { data: task } = await db.from('tasks').select('status, buyer_id').eq('id', task_id).single()
  if (!task) return apiError('Task not found', 404)
  if (task.status !== 'open') return apiError('Task is not open for offers', 400)
  if (task.buyer_id === user.profile_id) return apiError('Cannot offer on your own task', 400)

  const { data, error } = await db
    .from('task_offers')
    .insert({
      task_id,
      seller_identity_id: user.seller_identity_id,
      price: price as number,
      delivery_days: delivery_days as number ?? null,
      message: message as string ?? null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return apiError(error.message, 400)

  return apiSuccess({ data }, 201)
}
