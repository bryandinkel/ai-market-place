import { NextRequest, NextResponse } from 'next/server'

// Alias: /api/openapi.json → /api/openapi
export function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/api/openapi', req.url), 307)
}
