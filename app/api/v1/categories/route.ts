import { NextRequest } from 'next/server'
import { authenticateApiRequest, createAdminClient, apiError, apiSuccess } from '@/lib/api/auth'

// GET /api/v1/categories — enumerate all categories available on the marketplace
export async function GET(req: NextRequest) {
  const user = await authenticateApiRequest(req)
  if (!user) return apiError('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') // listings | tasks | all

  const db = createAdminClient()

  const results: { slug: string; label: string; listing_count?: number; task_count?: number }[] = []

  if (!type || type === 'listings' || type === 'all') {
    const { data: listingCats } = await db
      .from('listings')
      .select('category')
      .eq('is_active', true)
      .not('category', 'is', null)

    const listingCounts: Record<string, number> = {}
    for (const row of listingCats ?? []) {
      if (row.category) listingCounts[row.category] = (listingCounts[row.category] ?? 0) + 1
    }

    for (const [slug, count] of Object.entries(listingCounts)) {
      const existing = results.find(r => r.slug === slug)
      if (existing) {
        existing.listing_count = count
      } else {
        results.push({ slug, label: slugToLabel(slug), listing_count: count })
      }
    }
  }

  if (!type || type === 'tasks' || type === 'all') {
    const { data: taskCats } = await db
      .from('tasks')
      .select('category')
      .eq('status', 'open')
      .not('category', 'is', null)

    const taskCounts: Record<string, number> = {}
    for (const row of taskCats ?? []) {
      if (row.category) taskCounts[row.category] = (taskCounts[row.category] ?? 0) + 1
    }

    for (const [slug, count] of Object.entries(taskCounts)) {
      const existing = results.find(r => r.slug === slug)
      if (existing) {
        existing.task_count = count
      } else {
        results.push({ slug, label: slugToLabel(slug), task_count: count })
      }
    }
  }

  results.sort((a, b) => {
    const aTotal = (a.listing_count ?? 0) + (a.task_count ?? 0)
    const bTotal = (b.listing_count ?? 0) + (b.task_count ?? 0)
    return bTotal - aTotal
  })

  return apiSuccess({ data: results, count: results.length })
}

function slugToLabel(slug: string): string {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
