import { NextRequest } from 'next/server'
import { authenticateApiRequest, createAdminClient, apiError, apiStructuredError, apiSuccess } from '@/lib/api/auth'
import crypto from 'crypto'

const TEST_PAYLOADS: Record<string, object> = {
  'order.created': {
    event: 'order.created',
    order_id: 'test-order-00000000-0000-0000-0000-000000000000',
    order_type: 'service',
    status: 'paid',
    total_amount: 5000,
    listing_title: 'Test Listing',
    buyer_id: 'test-buyer-00000000-0000-0000-0000-000000000000',
  },
  'order.completed': {
    event: 'order.completed',
    order_id: 'test-order-00000000-0000-0000-0000-000000000000',
    status: 'completed',
    total_amount: 5000,
  },
  'message.created': {
    event: 'message.created',
    conversation_id: 'test-conv-00000000-0000-0000-0000-000000000000',
    sender_id: 'test-user-00000000-0000-0000-0000-000000000000',
    body: 'This is a test message from The Others Market.',
  },
  'offer.accepted': {
    event: 'offer.accepted',
    offer_id: 'test-offer-00000000-0000-0000-0000-000000000000',
    task_id: 'test-task-00000000-0000-0000-0000-000000000000',
    amount: 7500,
  },
  'approval.requested': {
    event: 'approval.requested',
    approval_id: 'test-approval-00000000-0000-0000-0000-000000000000',
    action_type: 'deliver_work',
    description: 'Test approval request from The Others Market.',
  },
}

// POST /api/v1/webhooks/:id/test — send a test event to a webhook endpoint
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await authenticateApiRequest(req)
  if (!user) return apiError('Unauthorized', 401)
  if (!user.seller_identity_id) return apiStructuredError(
    'seller_identity_required',
    'Testing webhooks requires a seller-linked API key.',
    'Create a new API key with seller_identity_id set, or check GET /api/v1/capabilities.',
    '/developers#seller-api-keys',
    403
  )

  const { id: webhook_id } = await params
  const db = createAdminClient()

  let body: Record<string, unknown>
  try { body = await req.json() } catch { body = {} }

  const event_type = (body.event_type as string) ?? 'order.created'

  // Verify webhook belongs to this seller
  const { data: webhook } = await db
    .from('webhooks')
    .select('id, url, secret, is_active, seller_identity_id')
    .eq('id', webhook_id)
    .eq('seller_identity_id', user.seller_identity_id)
    .single()

  if (!webhook) return apiError('Webhook not found', 404)

  const payload = {
    ...(TEST_PAYLOADS[event_type] ?? { event: event_type }),
    test: true,
    delivered_at: new Date().toISOString(),
  }

  const rawBody = JSON.stringify(payload)
  const sig = webhook.secret
    ? `sha256=${crypto.createHmac('sha256', webhook.secret as string).update(rawBody).digest('hex')}`
    : 'no-secret'

  const start = Date.now()
  let statusCode: number | null = null
  let responseBody: string | null = null
  let errorMsg: string | null = null

  try {
    const res = await fetch(webhook.url as string, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Others-Event': event_type,
        'X-Others-Signature': sig,
        'X-Others-Delivery': `test-${Date.now()}`,
      },
      body: rawBody,
      signal: AbortSignal.timeout(10_000),
    })
    statusCode = res.status
    responseBody = await res.text().catch(() => null)
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : 'Request failed'
  }

  const duration_ms = Date.now() - start

  return apiSuccess({
    data: {
      ok: statusCode !== null && statusCode >= 200 && statusCode < 300,
      status_code: statusCode,
      duration_ms,
      event_type,
      error: errorMsg,
      response_body: responseBody,
    },
  })
}
