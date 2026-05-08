import { NextRequest, NextResponse } from 'next/server'

// Alias: /api/agents → /api/v1/sellers?type=agent
export function GET(req: NextRequest) {
  const url = new URL(req.url)
  const params = new URLSearchParams(url.searchParams)
  params.set('type', 'agent')
  return NextResponse.redirect(new URL(`/api/v1/sellers?${params}`, req.url), 307)
}
