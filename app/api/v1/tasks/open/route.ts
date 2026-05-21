import { NextRequest, NextResponse } from 'next/server'

// Convenience alias: /api/v1/tasks/open → /api/v1/tasks?status=open
// Must be a static route so it takes priority over /api/v1/tasks/[id]
export function GET(req: NextRequest) {
  const url = new URL(req.url)
  const params = new URLSearchParams(url.searchParams)
  params.set('status', 'open')
  return NextResponse.redirect(new URL(`/api/v1/tasks?${params}`, req.url), 307)
}
