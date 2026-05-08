import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ListingCard } from '@/components/marketplace/listing-card'
import { getInitials, formatRating } from '@/lib/utils'
import type { ListingWithSeller, SellerIdentity, AgentProfile, Review, Profile, SponsorWorkspace } from '@/types/database'
import {
  Shield,
  Bot,
  Users,
  Star,
  MessageSquare,
  ShoppingBag,
  CheckCircle2,
  Cpu,
  UserCircle,
} from 'lucide-react'

interface SellerPageProps {
  params: Promise<{ slug: string }>
}

const AUTONOMY_MODE_LABELS: Record<string, string> = {
  manual: 'Manual',
  assisted: 'Assisted',
  semi_autonomous: 'Semi-Autonomous',
}

const FULFILLMENT_LABELS: Record<string, { label: string; color: string }> = {
  fully_autonomous: { label: 'Fully Autonomous', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  human_review_included: { label: 'Human Review Included', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  sponsor_approved_delivery: { label: 'Sponsor-Approved Delivery', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  hybrid_fulfillment: { label: 'Hybrid Fulfillment', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
}

const IDENTITY_BADGE: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  agent: {
    label: 'AI Agent',
    icon: <Bot className="w-3 h-3" />,
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  },
  hybrid_team: {
    label: 'Hybrid Team',
    icon: <Cpu className="w-3 h-3" />,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  },
  human: {
    label: 'Human',
    icon: <UserCircle className="w-3 h-3" />,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
}

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`w-3.5 h-3.5 ${
            n <= Math.round(value)
              ? 'fill-amber-400 text-amber-400'
              : 'text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  )
}

export default async function SellerProfilePage({ params }: SellerPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetch session in parallel with seller data
  const [{ data: { user } }, { data: sellerData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from('seller_identities')
      .select(`
        *,
        agent_profiles (*)
      `)
      .eq('slug', slug)
      .single(),
  ])

  if (!sellerData) notFound()

  const seller = sellerData as SellerIdentity & { agent_profiles?: AgentProfile[] }
  const agentProfile = seller.agent_profiles?.[0] ?? null

  // Fetch active listings and recent reviews in parallel
  const [{ data: listingsData }, { data: reviewsData }, sponsorWorkspace] = await Promise.all([
    supabase
      .from('listings')
      .select(`
        *,
        seller_identities (*, agent_profiles (*)),
        categories (*),
        listing_products (*),
        listing_services (*),
        listing_packages (*),
        listing_media (url, media_type, sort_order)
      `)
      .eq('seller_identity_id', seller.id)
      .eq('status', 'active')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('reviews')
      .select(`
        *,
        profiles:reviewer_id (display_name, avatar_url)
      `)
      .eq('seller_identity_id', seller.id)
      .order('created_at', { ascending: false })
      .limit(5),
    agentProfile
      ? supabase
          .from('sponsor_workspaces')
          .select('*')
          .eq('id', agentProfile.sponsor_workspace_id)
          .single()
          .then((r) => r.data as SponsorWorkspace | null)
      : Promise.resolve(null),
  ])

  const listings = (listingsData ?? []) as unknown as ListingWithSeller[]
  const reviews = (reviewsData ?? []) as Array<
    Review & { profiles: Pick<Profile, 'display_name' | 'avatar_url'> }
  >

  const isVerified = seller.verification_status === 'approved'
  const identityBadge = IDENTITY_BADGE[seller.identity_type]
  const fulfillmentConfig = agentProfile ? FULFILLMENT_LABELS[agentProfile.fulfillment_label] : null

  const isOwnProfile = user?.id === seller.account_id

  return (
    <div className="min-h-screen bg-background">
      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-indigo-950 via-violet-950 to-background overflow-hidden">
        {seller.banner_url ? (
          <Image
            src={seller.banner_url}
            alt=""
            fill
            className="object-cover opacity-60"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-900/40 via-transparent to-transparent" />
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile header */}
        <div className="relative -mt-16 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <Avatar className="w-28 h-28 ring-4 ring-background shrink-0">
              <AvatarImage src={seller.avatar_url ?? undefined} />
              <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                {getInitials(seller.display_name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold">{seller.display_name}</h1>
                {isVerified && (
                  <Badge
                    variant="outline"
                    className="text-emerald-400 bg-emerald-500/10 border-emerald-500/20 gap-1"
                  >
                    <Shield className="w-3 h-3" />
                    Verified
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={`gap-1 ${identityBadge.color}`}
                >
                  {identityBadge.icon}
                  {identityBadge.label}
                </Badge>
              </div>

              {agentProfile && (
                <p className="text-sm text-muted-foreground mb-1">
                  {agentProfile.role_title}
                </p>
              )}

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {seller.rating_avg ? (
                  <span className="flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-medium text-foreground">
                      {formatRating(seller.rating_avg)}
                    </span>
                    <span>({seller.review_count} reviews)</span>
                  </span>
                ) : (
                  <span>No reviews yet</span>
                )}
                <span>·</span>
                <span>{listings.length} active listing{listings.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pb-1">
              {user && !isOwnProfile && (
                <Link
                  href={`/messages/new?to=${seller.id}`}
                  className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[min(var(--radius-md),12px)] text-[0.8rem] font-medium border border-border bg-background hover:bg-muted hover:text-foreground transition-all`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Message
                </Link>
              )}
              <a
                href="#listings"
                className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[min(var(--radius-md),12px)] text-[0.8rem] font-medium bg-primary text-primary-foreground hover:bg-primary/80 transition-all`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Browse Listings
              </a>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: About + Agent info */}
          <div className="space-y-6">
            {/* Bio */}
            {seller.bio && (
              <Card className="bg-card border-border">
                <CardContent className="p-5">
                  <h2 className="text-sm font-semibold mb-2">About</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{seller.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Agent details */}
            {agentProfile && (
              <Card className="bg-card border-border">
                <CardContent className="p-5 space-y-4">
                  <h2 className="text-sm font-semibold">Agent Details</h2>

                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Fulfillment Mode</p>
                      {fulfillmentConfig && (
                        <Badge
                          variant="outline"
                          className={`gap-1 ${fulfillmentConfig.color}`}
                        >
                          <Bot className="w-3 h-3" />
                          {fulfillmentConfig.label}
                        </Badge>
                      )}
                    </div>

                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Autonomy Mode</p>
                      <span className="font-medium">
                        {AUTONOMY_MODE_LABELS[agentProfile.autonomy_mode] ?? agentProfile.autonomy_mode}
                      </span>
                    </div>

                    {agentProfile.short_description && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Description</p>
                        <p className="text-muted-foreground leading-relaxed">
                          {agentProfile.short_description}
                        </p>
                      </div>
                    )}

                    {sponsorWorkspace && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Operated by</p>
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="font-medium">{sponsorWorkspace.name}</span>
                        </div>
                        {sponsorWorkspace.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {sponsorWorkspace.description}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stats */}
            <Card className="bg-card border-border">
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold mb-3">Stats</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-2xl font-bold">
                      {seller.rating_avg ? formatRating(seller.rating_avg) : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">Rating</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{seller.review_count}</p>
                    <p className="text-xs text-muted-foreground">Reviews</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{listings.length}</p>
                    <p className="text-xs text-muted-foreground">Listings</p>
                  </div>
                  {isVerified && (
                    <div>
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                      <p className="text-xs text-muted-foreground mt-1">Verified</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right column: Listings + Reviews */}
          <div className="lg:col-span-2 space-y-10">
            {/* Listings */}
            <section id="listings">
              <h2 className="text-lg font-semibold mb-4">
                Active Listings
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({listings.length})
                </span>
              </h2>

              {listings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              ) : (
                <Card className="bg-card border-border">
                  <CardContent className="p-10 text-center">
                    <ShoppingBag className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No active listings yet.</p>
                  </CardContent>
                </Card>
              )}
            </section>

            <Separator />

            {/* Reviews */}
            <section>
              <h2 className="text-lg font-semibold mb-4">
                Recent Reviews
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({seller.review_count})
                </span>
              </h2>

              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review.id} className="bg-card border-border">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-7 h-7">
                              <AvatarImage src={review.profiles?.avatar_url ?? undefined} />
                              <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                                {getInitials(review.profiles?.display_name ?? 'A')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium">
                              {review.profiles?.display_name ?? 'Anonymous'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <StarRating value={review.overall_avg} />
                            <span className="text-xs text-muted-foreground font-medium">
                              {formatRating(review.overall_avg)}
                            </span>
                          </div>
                        </div>

                        {review.review_text && (
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {review.review_text}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                          <span>Speed: {review.speed_rating}/5</span>
                          <span>Quality: {review.quality_rating}/5</span>
                          <span>Comms: {review.communication_rating}/5</span>
                          <span>Accuracy: {review.accuracy_rating}/5</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-card border-border">
                  <CardContent className="p-10 text-center">
                    <Star className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No reviews yet.</p>
                  </CardContent>
                </Card>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
