import { NextRequest, NextResponse } from 'next/server'

// Convenience alias: /api/v1/listings/search?q=... → /api/v1/listings?search=...
// Must be a static route so it takes priority over /api/v1/listings/[slug]
export function GET(req: NextRequest) {
  const url = new URL(req.url)
  const params = new URLSearchParams(url.searchParams)
  // Map ?q= to ?search= for consistency with the main listings endpoint
  const q = params.get('q')
  if (q) {
    params.set('search', q)
    params.delete('q')
  }
  return NextResponse.redirect(new URL(`/api/v1/listings?${params}`, req.url), 307)
}
