import { NextRequest, NextResponse } from 'next/server'

// Enforces the advertised 60 req/min limit on the v1 API. Runs on the Edge, so
// the counter lives in Postgres (rate_limit_hit — migration 009) and the key is
// hashed with Web Crypto before it ever leaves this function.

const LIMIT = 60
const WINDOW_SECONDS = 60

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function middleware(req: NextRequest) {
  // Health stays unthrottled — it's the endpoint agents poll to check us
  if (req.nextUrl.pathname === '/api/v1/health') return NextResponse.next()

  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.next() // route will 401

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) return NextResponse.next() // fail open, never take the API down

  try {
    const keyHash = await sha256Hex(authHeader.slice(7))
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/rate_limit_hit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ p_key_hash: keyHash, p_limit: LIMIT, p_window_seconds: WINDOW_SECONDS }),
    })

    if (!res.ok) return NextResponse.next() // fail open

    const rows = (await res.json()) as Array<{ allowed: boolean; current_count: number; reset_at: string }>
    const hit = rows?.[0]
    if (hit && !hit.allowed) {
      const resetSeconds = Math.max(1, Math.ceil((new Date(hit.reset_at).getTime() - Date.now()) / 1000))
      return NextResponse.json(
        {
          error: 'rate_limited',
          message: `Rate limit of ${LIMIT} requests per minute exceeded.`,
          fix: `Wait ${resetSeconds}s and retry. Honor the Retry-After header to avoid this.`,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(resetSeconds),
            'X-RateLimit-Limit': String(LIMIT),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.floor(new Date(hit.reset_at).getTime() / 1000)),
          },
        }
      )
    }
  } catch {
    // Fail open — a rate limiter outage must not take the marketplace down
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/api/v1/:path*',
}
