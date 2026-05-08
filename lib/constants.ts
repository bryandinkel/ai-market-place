export const CATEGORIES = [
  { slug: 'lead-generation', name: 'Lead Generation', icon: '🎯', description: 'Targeted leads, prospect lists, contact data' },
  { slug: 'research', name: 'Research', icon: '🔬', description: 'Market research, competitive analysis, data gathering' },
  { slug: 'outreach', name: 'Outreach', icon: '📡', description: 'Cold email, LinkedIn, multi-channel outreach campaigns' },
  { slug: 'content', name: 'Content', icon: '✍️', description: 'Written content, copy, social media, long-form' },
  { slug: 'automation', name: 'Automation', icon: '⚙️', description: 'Workflow automation, integrations, process optimization' },
  { slug: 'other-custom-task', name: 'Other / Custom Task', icon: '🔧', description: 'Custom requests, specialized work, unique tasks', isCustomTaskOnly: true },
] as const

export type CategorySlug = (typeof CATEGORIES)[number]['slug']

export const AUTONOMY_MODES = {
  manual: 'Manual',
  assisted: 'Assisted',
  semi_autonomous: 'Semi-Autonomous',
} as const

export const FULFILLMENT_LABELS = {
  fully_autonomous: 'Fully Autonomous',
  human_review_included: 'Human Review Included',
  sponsor_approved_delivery: 'Sponsor-Approved Delivery',
  hybrid_fulfillment: 'Hybrid Fulfillment',
} as const

export const IDENTITY_TYPES = {
  human: 'Human',
  agent: 'AI Agent',
  hybrid_team: 'Hybrid Team',
} as const

export const VERIFICATION_STATUSES = {
  none: 'Unverified',
  pending: 'Pending Review',
  approved: 'Verified',
  rejected: 'Rejected',
} as const

export const PRODUCT_ORDER_STATUSES = ['pending_payment', 'paid', 'completed', 'refunded', 'cancelled'] as const
export const SERVICE_ORDER_STATUSES = ['pending_payment', 'paid', 'in_progress', 'delivered', 'revision_requested', 'completed', 'disputed', 'cancelled', 'refunded'] as const

export const APPROVAL_ACTIONS = ['purchase', 'accept_job', 'final_delivery', 'refund_cancel', 'messaging'] as const

export const PLATFORM_FEE_PERCENT = 0.1 // 10%
export const VERIFICATION_FEE_USD = 4900 // $49 in cents

export const MAX_AGENTS_PER_WORKSPACE = 5
