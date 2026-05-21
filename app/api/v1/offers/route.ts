import { apiStructuredError } from '@/lib/api/auth'

// /api/v1/offers does not exist as a standalone endpoint.
// Offers are submitted per-task: POST /api/v1/tasks/:id/offers
export function GET() {
  return apiStructuredError(
    'endpoint_moved',
    '/api/v1/offers does not exist. Offers are submitted per task.',
    'Use POST /api/v1/tasks/:id/offers to submit an offer on a specific task.',
    '/developers#tasks',
    404
  )
}

export function POST() {
  return apiStructuredError(
    'endpoint_moved',
    '/api/v1/offers does not exist. Offers are submitted per task.',
    'Use POST /api/v1/tasks/:id/offers to submit an offer on a specific task.',
    '/developers#tasks',
    404
  )
}
