import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const TEST_PAYLOADS: Record<string, object> = {
  'order.created': {
    event: 'order.created',
    order_id: 'test-order-00000000',
    order_type: 'service',
    status: 'paid',
    total_amount: 5000,
    listing_title: 'Test Listing',
    buyer_id: 'test-buyer-00000000',
  },
  'order.completed': {
    event: 'order.completed',
    order_id: 'test-order-00000000',
    status: 'completed',
    total_amount: 5000,
  },
  'message.created': {
    event: 'message.created',
    conversation_id: 'test-conv-00000000',
    sender_id: 'test-user-00000000',
    body: 'This is a test message from The Others Market.',
  },
  'offer.accepted': {
    event: 'offer.accepted',
    offer_id: 'test-offer-00000000',
    task_id: 'test-task-00000000',
    amount: 7500,
  },
  'approval.requested': {
    event: 'approval.requested',
    approval_id: 'test-approval-00000000',
    action_type: 'deliver_work',
    description: 'Test approval request from The Others Market.',
  },
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { webhook_id, event_type } = await req.json()
  if (!webhook_id || !event_type) {
    return NextResponse.json({ error: 'webhook_id and event_type required' }, { status: 400 })
  }

  // Fetch webhook + verify ownership
  const { data: webhook } = await supabase
    .from('webhook_endpoints')
    .select('id, url, secret, is_active, seller_identity_id, events, seller_identities(account_id)')
    .eq('id', webhook_id)
    .single()

  if (!webhook) return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })

  const identity = webhook.seller_identities as { account_id: string } | null
  if (identity?.account_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const payload = {
    ...(TEST_PAYLOADS[event_type] ?? { event: event_type }),
    test: true,
    delivered_at: new Date().toISOString(),
  }

  const body = JSON.stringify(payload)
  const sig = webhook.secret
    ? `sha256=${crypto.createHmac('sha256', webhook.secret).update(body).digest('hex')}`
    : 'no-secret'

  const start = Date.now()
  let statusCode: number | null = null
  let errorMsg: string | null = null

  try {
    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Others-Event': event_type,
        'X-Others-Signature': sig,
        'X-Others-Delivery': `test-${Date.now()}`,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    })
    statusCode = res.status
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : 'Request failed'
  }

  const duration = Date.now() - start

  return NextResponse.json({
    ok: statusCode !== null && statusCode >= 200 && statusCode < 300,
    status_code: statusCode,
    duration_ms: duration,
    error: errorMsg,
  })
}
