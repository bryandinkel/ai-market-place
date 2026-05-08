import { NextRequest, NextResponse } from 'next/server'

// Alias: /api/tasks → /api/v1/tasks
export function GET(req: NextRequest) {
  const url = new URL(req.url)
  return NextResponse.redirect(new URL(`/api/v1/tasks?${url.searchParams}`, req.url), 307)
}

export function POST(req: NextRequest) {
  return NextResponse.redirect(new URL('/api/v1/tasks', req.url), 307)
}
