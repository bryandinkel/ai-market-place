export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ─── Enum types ───────────────────────────────────────────────────────────────

export type IdentityType = 'human' | 'agent' | 'hybrid_team'
export type AutonomyMode = 'manual' | 'assisted' | 'semi_autonomous'
export type FulfillmentLabel =
  | 'fully_autonomous'
  | 'human_review_included'
  | 'sponsor_approved_delivery'
  | 'hybrid_fulfillment'
export type ListingType = 'product' | 'service'
export type ListingStatus = 'draft' | 'active' | 'paused' | 'archived'
export type PricingModel = 'fixed' | 'package' | 'custom_quote'
export type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected'
export type TaskStatus = 'open' | 'in_review' | 'assigned' | 'completed' | 'cancelled'
export type OfferMode = 'receive_offers' | 'direct_hire_only'
export type PreferredSellerType = 'agent' | 'hybrid' | 'human' | 'best_available'
export type TaskOfferStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn'
export type OrderType = 'product' | 'service' | 'task'
export type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'in_progress'
  | 'delivered'
  | 'revision_requested'
  | 'completed'
  | 'disputed'
  | 'cancelled'
  | 'refunded'
export type DeliveryStatus = 'submitted' | 'revision_requested' | 'approved'
export type MessageType = 'text' | 'system' | 'offer' | 'approval_request'
export type ConversationContextType = 'listing' | 'task' | 'order' | 'direct'
export type ApprovalAction = 'purchase' | 'accept_job' | 'final_delivery' | 'refund_cancel' | 'messaging'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type DisputeStatus = 'open' | 'in_review' | 'resolved'
export type ReportStatus = 'open' | 'reviewed' | 'closed'
export type PayoutStatus = 'pending' | 'paid' | 'failed'
export type UserMode = 'buyer' | 'seller' | 'sponsor'

// ─── Table row types ──────────────────────────────────────────────────────────

export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  is_admin: boolean
  onboarding_complete: boolean
  current_mode: UserMode
  created_at: string
  updated_at: string
}

export interface SponsorWorkspace {
  id: string
  owner_id: string
  name: string
  slug: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface SellerIdentity {
  id: string
  account_id: string
  identity_type: IdentityType
  display_name: string
  slug: string
  avatar_url: string | null
  banner_url: string | null
  bio: string | null
  verification_status: VerificationStatus
  is_featured: boolean
  rating_avg: number | null
  review_count: number
  created_at: string
  updated_at: string
}

export interface AgentProfile {
  id: string
  seller_identity_id: string
  sponsor_workspace_id: string
  role_title: string
  short_description: string
  autonomy_mode: AutonomyMode
  fulfillment_label: FulfillmentLabel
  created_at: string
  updated_at: string
}

export interface AgentApprovalRule {
  id: string
  agent_profile_id: string
  action: ApprovalAction
  requires_approval: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  is_custom_task_only: boolean
  created_at: string
}

export interface Listing {
  id: string
  seller_identity_id: string
  listing_type: ListingType
  title: string
  slug: string
  description: string
  category_id: string
  status: ListingStatus
  price_min: number
  is_featured: boolean
  rating_avg: number | null
  review_count: number
  tags: string[]
  created_at: string
  updated_at: string
}

export interface ListingProduct {
  id: string
  listing_id: string
  file_types: string[]
  version: string | null
  usage_notes: string | null
  instant_delivery: boolean
  created_at: string
  updated_at: string
}

export interface ListingService {
  id: string
  listing_id: string
  pricing_model: PricingModel
  turnaround_days: number | null
  revisions_included: number | null
  scope: string | null
  proof_of_work_expected: string | null
  created_at: string
  updated_at: string
}

export interface ListingPackage {
  id: string
  listing_id: string
  name: string
  description: string | null
  price: number
  turnaround_days: number | null
  revisions: number | null
  created_at: string
}

export interface ListingAddon {
  id: string
  listing_id: string
  name: string
  price: number
  description: string | null
  created_at: string
}

export interface Task {
  id: string
  buyer_id: string
  title: string
  description: string
  category_id: string
  budget: number | null
  deadline: string | null
  status: TaskStatus
  offer_mode: OfferMode
  preferred_seller_type: PreferredSellerType
  is_verified_only: boolean
  is_flagged: boolean
  category_fields: Json
  created_at: string
  updated_at: string
}

export interface TaskOffer {
  id: string
  task_id: string
  seller_identity_id: string
  price: number
  delivery_days: number | null
  message: string | null
  status: TaskOfferStatus
  created_at: string
  updated_at: string
}

export interface Order {
  id: string
  buyer_id: string
  seller_identity_id: string
  listing_id: string | null
  task_id: string | null
  order_type: OrderType
  status: OrderStatus
  total_amount: number
  stripe_payment_intent_id: string | null
  stripe_session_id: string | null
  created_at: string
  updated_at: string
}

export interface Delivery {
  id: string
  order_id: string
  summary: string
  notes: string | null
  delivery_timestamp: string
  status: DeliveryStatus
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  order_id: string
  reviewer_id: string
  seller_identity_id: string
  speed_rating: number
  quality_rating: number
  communication_rating: number
  accuracy_rating: number
  fulfillment_match_rating: number
  review_text: string | null
  overall_avg: number
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  context_type: ConversationContextType
  context_id: string | null
  subject: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  message_type: MessageType
  metadata: Json
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  is_read: boolean
  action_url: string | null
  metadata: Json
  created_at: string
}

export interface VerificationRequest {
  id: string
  seller_identity_id: string
  payment_amount: number
  stripe_payment_intent_id: string | null
  status: VerificationStatus
  admin_notes: string | null
  submitted_at: string
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface ApprovalRequest {
  id: string
  agent_profile_id: string
  sponsor_workspace_id: string
  action_type: ApprovalAction
  context: Json
  status: ApprovalStatus
  requested_at: string
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface Dispute {
  id: string
  order_id: string
  initiator_id: string
  reason: string
  description: string | null
  status: DisputeStatus
  resolution_notes: string | null
  created_at: string
  updated_at: string
}

export interface PayoutRecord {
  id: string
  seller_identity_id: string
  amount: number
  stripe_transfer_id: string | null
  status: PayoutStatus
  period_start: string | null
  period_end: string | null
  created_at: string
  updated_at: string
}

export interface Favorite {
  id: string
  buyer_id: string
  seller_identity_id: string
  created_at: string
}

// ─── Join types (query results with relations) ────────────────────────────────

export interface ListingWithSeller extends Listing {
  categories: Category | null
  seller_identities: SellerIdentity & {
    agent_profiles: AgentProfile[] | null
  }
  listing_products: ListingProduct[] | null
  listing_services: ListingService[] | null
  listing_packages: ListingPackage[] | null
  listing_media: { id: string; url: string; media_type: string; sort_order: number }[] | null
}
