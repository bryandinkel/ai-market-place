import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getListingBySlug } from '@/server/queries/listings'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Star, Shield, Bot, Package, Zap, Download, Clock, RefreshCw,
  ShoppingCart, Check
} from 'lucide-react'
import Image from 'next/image'
import { MessageSellerButton } from '@/components/shared/message-seller-button'
import { formatPrice, formatRating, getInitials } from '@/lib/utils'

interface ListingPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: ListingPageProps): Promise<Metadata> {
  const { slug } = await params
  const listing = await getListingBySlug(slug)
  if (!listing) return { title: 'Not found' }
  return { title: listing.title }
}

const FULFILLMENT_INFO: Record<string, { label: string; color: string; desc: string }> = {
  fully_autonomous: {
    label: 'Fully Autonomous',
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    desc: 'This agent operates independently without human review steps.',
  },
  human_review_included: {
    label: 'Human Review Included',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    desc: 'A human reviews deliveries before they reach you.',
  },
  sponsor_approved_delivery: {
    label: 'Sponsor-Approved Delivery',
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    desc: "The agent's sponsor approves final deliveries.",
  },
  hybrid_fulfillment: {
    label: 'Hybrid Fulfillment',
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    desc: 'Human and AI collaboration — varies by task.',
  },
}

export default async function ListingPage({ params }: ListingPageProps) {
  const { slug } = await params
  const [listing, { data: { user } }] = await Promise.all([
    getListingBySlug(slug),
    createClient().then(s => s.auth.getUser()),
  ])

  if (!listing) notFound()

  const seller = listing.seller_identities
  const isAgent = seller.identity_type === 'agent'
  const agentProfile = seller.agent_profiles?.[0]
  const fulfillment = agentProfile ? FULFILLMENT_INFO[agentProfile.fulfillment_label] : null
  const isVerified = seller.verification_status === 'approved'
  const isProduct = listing.listing_type === 'product'
  const productDetails = listing.listing_products?.[0]
  const serviceDetails = listing.listing_services?.[0]
  const packages = listing.listing_packages ?? []
  const media = listing.listing_media ?? []

  // Fetch reviews
  const supabase = await createClient()
  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, profiles:reviewer_id (display_name, avatar_url)')
    .eq('seller_identity_id', seller.id)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Title + badges */}
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge variant="secondary" className="text-xs">
                {isProduct ? <Package className="w-3 h-3 mr-1" /> : <Zap className="w-3 h-3 mr-1" />}
                {isProduct ? 'Digital Product' : 'Service'}
              </Badge>
              {listing.categories && (
                <Badge variant="outline" className="text-xs">{listing.categories.name}</Badge>
              )}
              {isVerified && (
                <Badge variant="outline" className="text-xs text-primary border-primary/30 bg-primary/5">
                  <Shield className="w-3 h-3 mr-1" /> Verified
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold mb-3">{listing.title}</h1>

            {/* Rating */}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {listing.rating_avg ? (
                <>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-foreground">{formatRating(listing.rating_avg)}</span>
                  </div>
                  <span>({listing.review_count} reviews)</span>
                </>
              ) : (
                <span>No reviews yet</span>
              )}
            </div>
          </div>

          {/* Media gallery */}
          {media.length > 0 && (
            <div className="rounded-xl overflow-hidden border border-border aspect-video bg-secondary">
              <Image
                src={media[0].url}
                alt={listing.title}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <h2 className="font-semibold mb-3">Description</h2>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {listing.description}
            </p>
          </div>

          {/* Product-specific */}
          {isProduct && productDetails && (
            <div className="space-y-4">
              <h2 className="font-semibold">What&apos;s included</h2>
              <div className="grid grid-cols-2 gap-3">
                {productDetails.file_types.length > 0 && (
                  <div className="p-3 rounded-lg border border-border bg-card">
                    <div className="text-xs text-muted-foreground mb-1">File types</div>
                    <div className="text-sm font-medium">{productDetails.file_types.join(', ')}</div>
                  </div>
                )}
                {productDetails.version && (
                  <div className="p-3 rounded-lg border border-border bg-card">
                    <div className="text-xs text-muted-foreground mb-1">Version</div>
                    <div className="text-sm font-medium">{productDetails.version}</div>
                  </div>
                )}
              </div>
              {productDetails.instant_delivery && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Download className="w-4 h-4" />
                  Instant download after purchase
                </div>
              )}
              {productDetails.usage_notes && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Usage notes</h3>
                  <p className="text-sm text-muted-foreground">{productDetails.usage_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Service-specific */}
          {!isProduct && serviceDetails && (
            <div className="space-y-4">
              {serviceDetails.scope && (
                <div>
                  <h2 className="font-semibold mb-2">Scope</h2>
                  <p className="text-sm text-muted-foreground">{serviceDetails.scope}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                {serviceDetails.turnaround_days && (
                  <div className="p-3 rounded-lg border border-border bg-card text-center">
                    <Clock className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <div className="text-xs text-muted-foreground">Turnaround</div>
                    <div className="text-sm font-semibold">{serviceDetails.turnaround_days}d</div>
                  </div>
                )}
                {serviceDetails.revisions_included !== null && (
                  <div className="p-3 rounded-lg border border-border bg-card text-center">
                    <RefreshCw className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <div className="text-xs text-muted-foreground">Revisions</div>
                    <div className="text-sm font-semibold">{serviceDetails.revisions_included}</div>
                  </div>
                )}
              </div>
              {serviceDetails.proof_of_work_expected && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Proof of work</h3>
                  <p className="text-sm text-muted-foreground">{serviceDetails.proof_of_work_expected}</p>
                </div>
              )}
            </div>
          )}

          {/* Packages */}
          {packages.length > 0 && (
            <div>
              <h2 className="font-semibold mb-4">Packages</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {packages.map(pkg => (
                  <div key={pkg.id} className="p-4 rounded-xl border border-border bg-card">
                    <div className="font-medium mb-1">{pkg.name}</div>
                    <div className="text-xl font-bold text-foreground mb-2">{formatPrice(pkg.price)}</div>
                    {pkg.description && (
                      <p className="text-xs text-muted-foreground mb-3">{pkg.description}</p>
                    )}
                    <div className="space-y-1 text-xs text-muted-foreground">
                      {pkg.turnaround_days && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {pkg.turnaround_days} day delivery
                        </div>
                      )}
                      {pkg.revisions !== null && (
                        <div className="flex items-center gap-1">
                          <RefreshCw className="w-3 h-3" /> {pkg.revisions} revisions
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          {(reviews?.length ?? 0) > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="font-semibold">Reviews</h2>
                <Badge variant="secondary" className="text-xs">{listing.review_count}</Badge>
              </div>
              <div className="space-y-4">
                {reviews?.map((review: Record<string, unknown>) => (
                  <div key={review.id as string} className="p-4 rounded-xl border border-border bg-card">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={(review.profiles as Record<string, unknown>)?.avatar_url as string} />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(((review.profiles as Record<string, unknown>)?.display_name as string) || 'U')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{((review.profiles as Record<string, unknown>)?.display_name as string) ?? 'Buyer'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs font-medium">{Number(review.overall_avg).toFixed(1)}</span>
                      </div>
                    </div>
                    {review.review_text && (
                      <p className="text-sm text-muted-foreground">{review.review_text as string}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — CTA */}
        <div className="space-y-4">
          {/* Seller card */}
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <Link href={`/seller/${seller.slug}`}>
                <div className="flex items-center gap-3 mb-4 group">
                  <Avatar className="h-12 w-12 rounded-xl">
                    <AvatarImage src={seller.avatar_url ?? undefined} />
                    <AvatarFallback className="rounded-xl bg-primary/20 text-primary font-bold">
                      {getInitials(seller.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold group-hover:text-primary transition-colors">
                        {seller.display_name}
                      </span>
                      {isVerified && <Shield className="w-4 h-4 text-primary" />}
                      {isAgent && <Bot className="w-4 h-4 text-violet-400" />}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {seller.identity_type === 'agent' ? 'AI Agent' :
                       seller.identity_type === 'hybrid_team' ? 'Hybrid Team' : 'Human Seller'}
                    </div>
                  </div>
                </div>
              </Link>

              {/* Fulfillment label */}
              {fulfillment && (
                <div className={`rounded-lg border p-3 mb-4 ${fulfillment.color}`}>
                  <div className="flex items-center gap-1.5 text-xs font-medium mb-1">
                    <Bot className="w-3.5 h-3.5" />
                    {fulfillment.label}
                  </div>
                  <p className="text-xs opacity-80">{fulfillment.desc}</p>
                </div>
              )}

              <Separator className="mb-4" />

              {/* Price */}
              <div className="mb-4">
                <div className="text-xs text-muted-foreground mb-1">
                  {isProduct ? 'Price' : 'Starting from'}
                </div>
                <div className="text-2xl font-bold">{formatPrice(listing.price_min)}</div>
              </div>

              {/* CTA */}
              {user ? (
                <div className="space-y-2">
                  <Button className="w-full gradient-primary text-white border-0" asChild>
                    <Link href={`/listing/${listing.slug}/checkout`}>
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      {isProduct ? 'Buy now' : 'Order service'}
                    </Link>
                  </Button>
                  <MessageSellerButton
                    sellerIdentityId={listing.seller_identities.id}
                    listingId={listing.id}
                    listingTitle={listing.title}
                    sellerName={listing.seller_identities.display_name}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Button className="w-full gradient-primary text-white border-0" asChild>
                    <Link href={`/login?redirectTo=/listing/${listing.slug}`}>
                      Sign in to purchase
                    </Link>
                  </Button>
                </div>
              )}

              {isProduct && (
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-primary" />
                    Instant download
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3 h-3 text-primary" />
                    Current version
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
