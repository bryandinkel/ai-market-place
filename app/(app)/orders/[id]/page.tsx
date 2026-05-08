import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Package, Wrench, CheckCircle, Clock, AlertTriangle,
  ExternalLink, Download, Star
} from 'lucide-react'
import { formatPrice, formatRelativeTime, getInitials } from '@/lib/utils'
import { OrderActions } from './order-actions'
import { DownloadButton } from './download-button'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  paid: { label: 'Paid', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  in_progress: { label: 'In Progress', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  delivered: { label: 'Delivered — Review Pending', className: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
  revision_requested: { label: 'Revision Requested', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  completed: { label: 'Completed', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  disputed: { label: 'Disputed', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground border-border' },
}

interface OrderDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      listings (id, title, slug, listing_type),
      seller_identities (id, display_name, avatar_url, slug, verification_status),
      order_items (id, package_id, addons, quantity, unit_price),
      deliveries (
        id, summary, notes, delivery_timestamp, status, created_at,
        delivery_assets (id, url, asset_type, filename),
        proof_of_work_cards (id, fulfillment_mode_label, summary, structured_data)
      )
    `)
    .eq('id', id)
    .eq('buyer_id', user.id)
    .single()

  if (!order) notFound()

  // Product purchase entitlement
  const { data: purchase } = order.order_type === 'product'
    ? await supabase
        .from('product_purchases')
        .select('id, download_count, product_files (id, filename, file_size)')
        .eq('order_id', id)
        .single()
    : { data: null }

  // Existing review
  const { data: review } = await supabase
    .from('reviews')
    .select('id, overall_avg, review_text, speed_rating, quality_rating, communication_rating, accuracy_rating, fulfillment_match_rating')
    .eq('order_id', id)
    .eq('reviewer_id', user.id)
    .maybeSingle()

  const seller = order.seller_identities as Record<string, string> | null
  const listing = order.listings as { id: string; title: string; slug: string; listing_type: string } | null
  const deliveries = (order.deliveries as Array<Record<string, unknown>>) ?? []
  const config = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.cancelled
  const productFile = (purchase as Record<string, unknown> | null)?.product_files as Record<string, string | number> | null

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{listing?.title ?? 'Order'}</h1>
          <p className="text-xs text-muted-foreground mt-1">Order #{id.slice(0, 8).toUpperCase()}</p>
        </div>
        <Badge variant="outline" className={`text-sm ${config.className}`}>
          {config.label}
        </Badge>
      </div>

      {/* Seller + order info */}
      <Card className="bg-card border-border">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 rounded-lg">
                <AvatarImage src={seller?.avatar_url} />
                <AvatarFallback className="rounded-lg bg-violet-500/20 text-violet-400 text-xs">
                  {getInitials(seller?.display_name || 'S')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{seller?.display_name}</p>
                <Link
                  href={`/seller/${seller?.slug}`}
                  className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                >
                  View profile <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{formatPrice(order.total_amount)}</p>
              <p className="text-xs text-muted-foreground">{formatRelativeTime(order.created_at)}</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Order type</p>
              <div className="flex items-center gap-1.5 font-medium">
                {order.order_type === 'product'
                  ? <><Package className="w-4 h-4 text-primary" /> Digital Product</>
                  : <><Wrench className="w-4 h-4 text-primary" /> Service</>
                }
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Placed</p>
              <p className="font-medium">{new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product download */}
      {order.order_type === 'product' && (
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <h2 className="font-semibold text-sm mb-4 flex items-center gap-2">
              <Download className="w-4 h-4 text-primary" /> Your Download
            </h2>
            {productFile ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/40">
                <div>
                  <p className="font-medium text-sm">{productFile.filename as string}</p>
                  {productFile.file_size && (
                    <p className="text-xs text-muted-foreground">
                      {(Number(productFile.file_size) / 1024 / 1024).toFixed(1)} MB
                    </p>
                  )}
                </div>
                <DownloadButton orderId={id} filename={productFile.filename as string} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">File not yet available — contact the seller.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Deliveries (service/task orders) */}
      {order.order_type !== 'product' && deliveries.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-primary" /> Deliveries
          </h2>
          {deliveries.map((delivery) => {
            const assets = (delivery.delivery_assets as Array<{ id: string; url: string; filename: string; asset_type: string }>) ?? []
            const pow = (delivery.proof_of_work_cards as Array<{ id: string; fulfillment_mode_label: string; summary: string }>) ?? []
            const deliveryStatus = delivery.status as string
            return (
              <Card key={delivery.id as string} className="bg-card border-border">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{delivery.summary as string}</p>
                      {delivery.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{delivery.notes as string}</p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        deliveryStatus === 'approved'
                          ? 'text-green-400 border-green-500/30 text-xs'
                          : deliveryStatus === 'revision_requested'
                          ? 'text-orange-400 border-orange-500/30 text-xs'
                          : 'text-violet-400 border-violet-500/30 text-xs'
                      }
                    >
                      {deliveryStatus === 'submitted' ? 'Awaiting review' : deliveryStatus}
                    </Badge>
                  </div>

                  {/* Delivery assets */}
                  {assets.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Attached files</p>
                      {assets.map(asset => (
                        <a
                          key={asset.id}
                          href={asset.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 py-2 px-3 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-colors text-sm"
                        >
                          <Download className="w-4 h-4 text-primary shrink-0" />
                          <span className="truncate">{asset.filename}</span>
                          <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 ml-auto" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Proof of work cards */}
                  {pow.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Proof of Work</p>
                      {pow.map(card => (
                        <div key={card.id} className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                          <p className="text-xs font-medium text-primary mb-1">{card.fulfillment_mode_label}</p>
                          <p className="text-sm">{card.summary}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {formatRelativeTime(delivery.created_at as string)}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* No delivery yet for service orders */}
      {order.order_type !== 'product' && deliveries.length === 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-5 text-center text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Awaiting delivery from the seller</p>
          </CardContent>
        </Card>
      )}

      {/* Buyer actions */}
      <OrderActions
        orderId={id}
        orderStatus={order.status}
        orderType={order.order_type}
        sellerIdentityId={order.seller_identity_id}
        hasReview={!!review}
      />

      {/* Existing review */}
      {review && (
        <Card className="bg-card border-border">
          <CardContent className="p-5 space-y-3">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400" /> Your Review
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${star <= Math.round(review.overall_avg) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium">{review.overall_avg.toFixed(1)}</span>
            </div>
            {review.review_text && (
              <p className="text-sm text-muted-foreground">{review.review_text}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active dispute notice */}
      {order.status === 'disputed' && (
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="p-5 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-sm text-red-400">Dispute in progress</p>
              <p className="text-sm text-muted-foreground mt-1">Our team is reviewing your dispute. You&apos;ll receive a notification when it&apos;s resolved.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
