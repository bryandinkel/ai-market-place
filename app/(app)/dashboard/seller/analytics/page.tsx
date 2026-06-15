import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Eye, ShoppingCart, DollarSign, TrendingUp } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { SellerIdentity } from '@/types/database'

const PAID_STATUSES = ['paid', 'in_progress', 'delivered', 'revision_requested', 'completed', 'disputed', 'refunded']

export default async function SellerAnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rawIdentities } = await supabase
    .from('seller_identities')
    .select('id, display_name')
    .eq('account_id', user.id)
  const identities = (rawIdentities ?? []) as Pick<SellerIdentity, 'id' | 'display_name'>[]

  if (identities.length === 0) {
    redirect('/dashboard/seller')
  }

  const identityIds = identities.map(s => s.id)

  // Listings (with view counts) and all paid-or-beyond orders
  const [{ data: listingsData }, { data: ordersData }] = await Promise.all([
    supabase
      .from('listings')
      .select('id, title, slug, status, view_count, seller_identity_id')
      .in('seller_identity_id', identityIds),
    supabase
      .from('orders')
      .select('listing_id, total_amount, seller_payout_amount, status')
      .in('seller_identity_id', identityIds)
      .in('status', PAID_STATUSES),
  ])

  const listings = (listingsData ?? []) as Array<{
    id: string; title: string; slug: string; status: string; view_count: number
  }>
  const orders = (ordersData ?? []) as Array<{
    listing_id: string | null; total_amount: number | null; seller_payout_amount: number | null; status: string
  }>

  // Aggregate orders per listing
  const byListing = new Map<string, { orders: number; revenue: number; payout: number }>()
  let totalRevenue = 0
  let totalPayout = 0
  for (const o of orders) {
    totalRevenue += o.total_amount ?? 0
    totalPayout += o.seller_payout_amount ?? 0
    if (!o.listing_id) continue
    const cur = byListing.get(o.listing_id) ?? { orders: 0, revenue: 0, payout: 0 }
    cur.orders += 1
    cur.revenue += o.total_amount ?? 0
    cur.payout += o.seller_payout_amount ?? 0
    byListing.set(o.listing_id, cur)
  }

  const totalViews = listings.reduce((s, l) => s + (l.view_count ?? 0), 0)
  const totalOrders = orders.length
  const overallConversion = totalViews > 0 ? (totalOrders / totalViews) * 100 : null

  // Per-listing rows, sorted by revenue then views
  const rows = listings
    .map(l => {
      const agg = byListing.get(l.id) ?? { orders: 0, revenue: 0, payout: 0 }
      const conversion = l.view_count > 0 ? (agg.orders / l.view_count) * 100 : null
      return { ...l, ...agg, conversion }
    })
    .sort((a, b) => b.revenue - a.revenue || b.view_count - a.view_count)

  const stats = [
    { label: 'Total views', value: totalViews.toLocaleString(), icon: Eye },
    { label: 'Orders', value: totalOrders.toLocaleString(), icon: ShoppingCart },
    { label: 'Conversion', value: overallConversion != null ? `${overallConversion.toFixed(1)}%` : '—', icon: TrendingUp },
    { label: 'Revenue (your payout)', value: formatPrice(totalPayout), icon: DollarSign },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href="/dashboard/seller"><ArrowLeft className="w-4 h-4" /> Dashboard</Link>
        </Button>
      </div>

      <div>
        <h1 className="text-xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">Views, orders, and revenue across your listings.</p>
      </div>

      {/* Top-line stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="p-5">
              <Icon className="w-5 h-5 text-primary mb-2" />
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gross vs payout note */}
      <p className="text-xs text-muted-foreground">
        Gross sales: {formatPrice(totalRevenue)} · Platform fee retained: {formatPrice(totalRevenue - totalPayout)}
      </p>

      {/* Per-listing table */}
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No listings yet. <Link href="/create-listing" className="text-primary hover:underline">Create one →</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="p-4 font-medium">Listing</th>
                    <th className="p-4 font-medium text-right">Views</th>
                    <th className="p-4 font-medium text-right">Orders</th>
                    <th className="p-4 font-medium text-right">Conv.</th>
                    <th className="p-4 font-medium text-right">Payout</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-b border-border/50 last:border-0">
                      <td className="p-4">
                        <Link href={`/listing/${r.slug}`} className="hover:text-primary font-medium">
                          {r.title}
                        </Link>
                        {r.status !== 'active' && (
                          <span className="ml-2 text-xs text-muted-foreground">({r.status})</span>
                        )}
                      </td>
                      <td className="p-4 text-right tabular-nums">{(r.view_count ?? 0).toLocaleString()}</td>
                      <td className="p-4 text-right tabular-nums">{r.orders}</td>
                      <td className="p-4 text-right tabular-nums">
                        {r.conversion != null ? `${r.conversion.toFixed(1)}%` : '—'}
                      </td>
                      <td className="p-4 text-right tabular-nums">{formatPrice(r.payout)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
