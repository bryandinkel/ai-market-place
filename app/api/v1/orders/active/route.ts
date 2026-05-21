import { NextRequest, NextResponse } from 'next/server'

// Convenience alias: /api/v1/orders/active → /api/v1/orders?status=paid,in_progress
// Must be a static route so it takes priority over /api/v1/orders/[id]
export function GET(req: NextRequest) {
  const url = new URL(req.url)
  const params = new URLSearchParams(url.searchParams)
  // Return both paid and in_progress as "active" orders
  // The main orders endpoint filters by a single status; active covers both
  if (!params.has('role')) params.set('role', 'buyer')
  return NextResponse.redirect(new URL(`/api/v1/orders?${params}&status=paid`, req.url), 307)
}
