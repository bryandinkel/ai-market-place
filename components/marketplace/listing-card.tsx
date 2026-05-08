import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Star, Shield, Bot, Zap, Package } from 'lucide-react'
import { formatPrice, formatRating, getInitials } from '@/lib/utils'
import type { ListingWithSeller } from '@/types/database'

interface ListingCardProps {
  listing: ListingWithSeller
}

const FULFILLMENT_LABELS: Record<string, { label: string; color: string }> = {
  fully_autonomous: { label: 'Fully Autonomous', color: 'text-violet-400 bg-violet-500/10 border-violet-500/20' },
  human_review_included: { label: 'Human Review', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  sponsor_approved_delivery: { label: 'Sponsor-Approved', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
  hybrid_fulfillment: { label: 'Hybrid', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
}

export function ListingCard({ listing }: ListingCardProps) {
  const seller = listing.seller_identities
  const isAgent = seller.identity_type === 'agent'
  const agentProfile = seller.agent_profiles?.[0]
  const fulfillment = agentProfile ? FULFILLMENT_LABELS[agentProfile.fulfillment_label] : null
  const isVerified = seller.verification_status === 'approved'
  const media = listing.listing_media?.[0]

  return (
    <Link href={`/listing/${listing.slug}`}>
      <Card className="group bg-card border-border hover:border-primary/40 transition-all duration-200 hover:shadow-lg hover:shadow-primary/10 cursor-pointer overflow-hidden h-full flex flex-col">
        {/* Preview image */}
        <div className="aspect-video bg-secondary relative overflow-hidden">
          {media ? (
            <Image
              src={media.url}
              alt={listing.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              {listing.listing_type === 'product' ? (
                <Package className="w-8 h-8 text-muted-foreground/30" />
              ) : (
                <Zap className="w-8 h-8 text-muted-foreground/30" />
              )}
            </div>
          )}
          <div className="absolute top-2 right-2">
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0.5 bg-background/80 backdrop-blur-sm"
            >
              {listing.listing_type === 'product' ? 'Product' : 'Service'}
            </Badge>
          </div>
        </div>

        <CardContent className="p-4 flex-1 flex flex-col">
          {/* Seller identity */}
          <div className="flex items-center gap-2 mb-3">
            <Avatar className="h-6 w-6">
              <AvatarImage src={seller.avatar_url ?? undefined} />
              <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                {getInitials(seller.display_name)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground truncate">{seller.display_name}</span>
            {isVerified && <Shield className="w-3 h-3 text-primary shrink-0" />}
            {isAgent && <Bot className="w-3 h-3 text-violet-400 shrink-0" />}
          </div>

          {/* Title */}
          <h3 className="font-medium text-sm leading-snug mb-2 line-clamp-2 group-hover:text-primary transition-colors flex-1">
            {listing.title}
          </h3>

          {/* Fulfillment label for agents */}
          {fulfillment && (
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0.5 w-fit mb-3 ${fulfillment.color}`}
            >
              <Bot className="w-2.5 h-2.5 mr-1" />
              {fulfillment.label}
            </Badge>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {listing.rating_avg ? (
                <>
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span className="font-medium text-foreground">{formatRating(listing.rating_avg)}</span>
                  <span>({listing.review_count})</span>
                </>
              ) : (
                <span>No reviews yet</span>
              )}
            </div>
            <div className="text-sm font-semibold text-foreground">
              From {formatPrice(listing.price_min)}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function ListingCardSkeleton() {
  return (
    <Card className="bg-card border-border overflow-hidden">
      <div className="aspect-video bg-secondary animate-pulse" />
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-secondary animate-pulse" />
          <div className="h-3 w-24 bg-secondary rounded animate-pulse" />
        </div>
        <div className="h-4 bg-secondary rounded animate-pulse" />
        <div className="h-4 w-3/4 bg-secondary rounded animate-pulse" />
        <div className="h-3 w-16 bg-secondary rounded animate-pulse" />
      </CardContent>
    </Card>
  )
}
