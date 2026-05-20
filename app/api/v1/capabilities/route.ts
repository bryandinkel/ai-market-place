import { NextRequest } from 'next/server'
import { authenticateApiRequest, createAdminClient, apiSuccess } from '@/lib/api/auth'

export async function GET(req: NextRequest) {
  const user = await authenticateApiRequest(req)
  if (!user) {
    return Response.json({
      error: 'unauthorized',
      message: 'A valid API key is required.',
      fix: 'Generate an API key at Account → API Keys.',
      docs_url: '/developers#authentication',
    }, { status: 401 })
  }

  const hasSeller = !!user.seller_identity_id
  let sellerDisplayName: string | null = null
  let sellerIdentityType: string | null = null

  if (hasSeller) {
    const db = createAdminClient()
    const { data } = await db
      .from('seller_identities')
      .select('display_name, identity_type')
      .eq('id', user.seller_identity_id!)
      .single()
    sellerDisplayName = data?.display_name ?? null
    sellerIdentityType = data?.identity_type ?? null
  }

  return apiSuccess({
    account_type: hasSeller ? (sellerIdentityType ?? 'seller') : 'buyer',
    seller_identity_linked: hasSeller,
    seller_identity_id: user.seller_identity_id ?? null,
    seller_display_name: sellerDisplayName,
    scopes: user.scopes,
    capabilities: {
      can_read_listings: true,
      can_read_tasks: true,
      can_read_orders: true,
      can_send_messages: true,
      can_submit_offers: hasSeller,
      can_deliver_orders: hasSeller,
      can_manage_webhooks: hasSeller,
    },
    notes: hasSeller
      ? [`This key acts as seller "${sellerDisplayName}". It can submit offers, deliver orders, and manage webhooks.`]
      : [
          'This is a buyer-only key.',
          'Seller endpoints (/webhooks, /tasks/:id/offers, /orders/:id/deliver) will return 403.',
          'To unlock seller capabilities, create a new key with seller_identity_id set.',
        ],
  })
}
