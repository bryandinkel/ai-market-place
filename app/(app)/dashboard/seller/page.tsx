import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatPrice, formatRating } from '@/lib/utils'
import type { Order, Review, SellerIdentity } from '@/types/database'

export const metadata = { title: 'Seller Dashboard' }

const ORDER_STATUS_LABELS: Record<Order['status'], string> = {
  pending_payment: 'Pending Payment',
  paid: 'Paid',
  in_progress: 'In Progress',
  delivered: 'Delivered',
  revision_requested: 'Revision Requested',
  completed: 'Completed',
  disputed: 'Disputed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
}

const LISTING_STATUS_VARIANT: Record<Listing['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  active: 'default',
  draft: 'outline',
  paused: 'secondary',
  archived: 'secondary',
}

export default async function SellerDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch seller identities for this user
  const { data: rawSellerIdentities } = await supabase
    .from('seller_identities')
    .select('*')
    .eq('account_id', user.id)
    .order('created_at', { ascending: false })
  const sellerIdentities = rawSellerIdentities as SellerIdentity[] | null

  // If no seller identity, show CTA
  if (!sellerIdentities || sellerIdentities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">No Seller Identity Found</h1>
          <p className="text-zinc-400 max-w-md">
            You need to create a seller identity before you can start selling on The Others Market.
          </p>
        </div>
        <Button asChild className="bg-indigo-600 hover:bg-indigo-500">
          <Link href="/onboarding/seller">Create Seller Identity</Link>
        </Button>
      </div>
    )
  }

  const sellerIdentityIds = sellerIdentities.map(s => s.id)

  const [
    { data: activeOrders },
    { data: pendingOffers },
    { data: listings },
    { data: completedOrders },
    { data: reviews },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('*, listings(id, title, slug), buyer: profiles!orders_buyer_id_fkey(id, display_name)')
      .in('seller_identity_id', sellerIdentityIds)
      .in('status', ['paid', 'in_progress', 'delivered', 'revision_requested'])
      .order('updated_at', { ascending: false }),

    supabase
      .from('task_offers')
      .select('*, tasks(id, title, budget)')
      .in('seller_identity_id', sellerIdentityIds)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),

    supabase
      .from('listings')
      .select('*')
      .in('seller_identity_id', sellerIdentityIds)
      .order('updated_at', { ascending: false }),

    supabase
      .from('orders')
      .select('total_amount, seller_identity_id')
      .in('seller_identity_id', sellerIdentityIds)
      .eq('status', 'completed'),

    supabase
      .from('reviews')
      .select('*')
      .in('seller_identity_id', sellerIdentityIds)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const deliveryQueue = (activeOrders ?? []).filter(
    (o: Order) => o.status === 'paid' || o.status === 'in_progress'
  )

  const totalEarnings = (completedOrders ?? []).reduce(
    (sum: number, o: Order) => sum + (o.total_amount ?? 0),
    0
  )

  const avgRating =
    (sellerIdentities as SellerIdentity[]).reduce((sum, s) => sum + (s.rating_avg ?? 0), 0) /
    sellerIdentities.filter(s => s.rating_avg !== null).length || null

  const totalReviewCount = (sellerIdentities as SellerIdentity[]).reduce(
    (sum, s) => sum + s.review_count,
    0
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Seller Dashboard</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {sellerIdentities.length} seller{sellerIdentities.length !== 1 ? ' identities' : ' identity'}
          </p>
        </div>
        <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-500">
          <Link href="/create-listing">New Listing</Link>
        </Button>
      </div>

      {/* Earnings + Reviews Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Earnings</p>
            <p className="text-2xl font-bold text-white mt-1">{formatPrice(totalEarnings)}</p>
            <p className="text-xs text-zinc-500 mt-1">From completed orders</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Avg Rating</p>
            <p className="text-2xl font-bold text-white mt-1">
              {avgRating ? formatRating(avgRating) : '—'}
              <span className="text-sm font-normal text-zinc-500 ml-1">/ 5</span>
            </p>
            <p className="text-xs text-zinc-500 mt-1">{totalReviewCount} reviews total</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Pending Offers</p>
            <p className="text-2xl font-bold text-white mt-1">{(pendingOffers ?? []).length}</p>
            <p className="text-xs text-zinc-500 mt-1">Awaiting buyer response</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Jobs */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-white flex items-center justify-between">
            Active Jobs
            <Badge variant="secondary" className="text-xs font-normal">
              {(activeOrders ?? []).length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!activeOrders || activeOrders.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-6">No active jobs right now.</p>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {(activeOrders as Order[]).map(order => (
                <li key={order.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/orders/${order.id}`}
                      className="text-sm font-medium text-white hover:text-indigo-400 truncate block"
                    >
                      {order.listings?.title ?? 'Task Order'}
                    </Link>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Buyer: {order.buyer?.display_name ?? 'Unknown'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="outline" className="text-xs">
                      {ORDER_STATUS_LABELS[order.status as Order['status']]}
                    </Badge>
                    <span className="text-sm font-medium text-zinc-300">
                      {formatPrice(order.total_amount)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Delivery Queue */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-white flex items-center justify-between">
              Delivery Queue
              <Badge
                variant={deliveryQueue.length > 0 ? 'default' : 'secondary'}
                className="text-xs font-normal"
              >
                {deliveryQueue.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {deliveryQueue.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-6">No jobs awaiting delivery.</p>
            ) : (
              <ul className="divide-y divide-zinc-800">
                {(deliveryQueue as Order[]).map(order => (
                  <li key={order.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <Link
                        href={`/orders/${order.id}`}
                        className="text-sm font-medium text-white hover:text-indigo-400 truncate block"
                      >
                        {order.listings?.title ?? 'Task Order'}
                      </Link>
                    </div>
                    <Button asChild size="sm" className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-xs h-7 px-3">
                      <Link href={`/orders/${order.id}`}>Deliver</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* My Listings */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold text-white flex items-center justify-between">
              My Listings
              <Badge variant="secondary" className="text-xs font-normal">
                {(listings ?? []).length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!listings || listings.length === 0 ? (
              <div className="text-center py-6 text-zinc-500">
                <p className="text-sm">No listings yet.</p>
                <Button asChild variant="link" className="mt-1 text-indigo-400 h-auto p-0 text-sm">
                  <Link href="/create-listing">Create your first listing</Link>
                </Button>
              </div>
            ) : (
              <ul className="divide-y divide-zinc-800">
                {(listings as Listing[]).map(listing => (
                  <li key={listing.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{listing.title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5 capitalize">{listing.listing_type}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={LISTING_STATUS_VARIANT[listing.status]}
                        className="text-xs capitalize"
                      >
                        {listing.status}
                      </Badge>
                      <Button asChild variant="ghost" size="sm" className="text-xs h-7 px-2 text-zinc-400 hover:text-white">
                        <Link href={`/create-listing?edit=${listing.id}`}>Edit</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Reviews */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-white">Recent Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          {!reviews || reviews.length === 0 ? (
            <p className="text-sm text-zinc-500 text-center py-6">No reviews yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-800">
              {(reviews as Review[]).map(review => (
                <li key={review.id} className="py-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-amber-400">
                      ★ {formatRating(review.overall_avg)}
                    </span>
                    <span className="text-xs text-zinc-500">
                      Speed {review.speed_rating} · Quality {review.quality_rating} ·
                      Comms {review.communication_rating}
                    </span>
                  </div>
                  {review.review_text && (
                    <p className="text-sm text-zinc-300 line-clamp-2">{review.review_text}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
