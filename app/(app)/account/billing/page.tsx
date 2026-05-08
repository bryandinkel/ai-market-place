import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreditCard, ShoppingBag, CheckCircle } from 'lucide-react'
import { StripeConnectButton } from './stripe-connect-button'

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Recent orders summary
  type OrderRow = { id: string; total_amount: number; status: string; created_at: string; listings: { title: string } | null }
  const { data: rawOrders } = await supabase
    .from('orders')
    .select('id, total_amount, status, created_at, listings(title)')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)
  const recentOrders = rawOrders as OrderRow[] | null

  // Seller identity (if any)
  type SellerRow = { id: string; display_name: string; stripe_account_id: string | null; stripe_onboarding_complete: boolean }
  const { data: rawIdentities } = await supabase
    .from('seller_identities')
    .select('id, display_name, stripe_account_id, stripe_onboarding_complete')
    .eq('account_id', user.id)
  const sellerIdentities = rawIdentities as SellerRow[] | null

  // Seller earnings summary
  type PayoutRow = { id: string; net_amount: number | null; amount: number; status: string; created_at: string; paid_at: string | null }
  const { data: rawPayouts } = await supabase
    .from('payout_records')
    .select('id, net_amount, amount, status, created_at, paid_at')
    .in('seller_identity_id', (sellerIdentities ?? []).map(s => s.id))
    .order('created_at', { ascending: false })
    .limit(10)
  const payouts = rawPayouts as PayoutRow[] | null

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" /> Billing & Payouts
        </h1>
      </div>

      {/* Platform fee info */}
      <Card className="bg-card border-border">
        <CardContent className="p-5 space-y-3">
          <h2 className="font-semibold text-sm">Platform fee</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Free to use</p>
              <p className="text-xs text-muted-foreground mt-0.5">No subscription required to buy or sell</p>
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
              <CheckCircle className="w-3 h-3" /> Active
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            10% platform fee on each completed sale. Payouts are sent automatically 7 days after delivery is accepted. Seller verification is a one-time $49 fee.
          </p>
        </CardContent>
      </Card>

      {/* Stripe Connect — shown if user has a seller identity */}
      {sellerIdentities && sellerIdentities.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-5 space-y-4">
            <h2 className="font-semibold text-sm">Payout account</h2>
            <p className="text-xs text-muted-foreground">
              Connect your bank account via Stripe to receive automatic payouts. Required to get paid.
            </p>
            {sellerIdentities.map(identity => (
              <div key={identity.id} className="flex items-center justify-between gap-4 py-2 border-t border-border first:border-0 first:pt-0">
                <div>
                  <p className="text-sm font-medium">{identity.display_name}</p>
                  {identity.stripe_onboarding_complete ? (
                    <p className="text-xs text-green-400 flex items-center gap-1 mt-0.5">
                      <CheckCircle className="w-3 h-3" /> Bank account connected
                    </p>
                  ) : (
                    <p className="text-xs text-amber-400 mt-0.5">Payout account not set up</p>
                  )}
                </div>
                <StripeConnectButton
                  sellerIdentityId={identity.id}
                  isComplete={identity.stripe_onboarding_complete}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Payout history */}
      {payouts && payouts.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-5 space-y-4">
            <h2 className="font-semibold text-sm">Payout history</h2>
            <div className="space-y-2">
              {payouts.map(p => {
                const amount = p.net_amount ?? p.amount
                const statusColors: Record<string, string> = {
                  paid: 'text-green-400 border-green-500/30',
                  pending: 'text-amber-400 border-amber-500/30',
                  scheduled: 'text-indigo-400 border-indigo-500/30',
                  processing: 'text-blue-400 border-blue-500/30',
                  failed: 'text-red-400 border-red-500/30',
                }
                return (
                  <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/40">
                    <div>
                      <p className="text-sm font-medium">${(amount / 100).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.paid_at
                          ? new Date(p.paid_at).toLocaleDateString()
                          : new Date(p.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="outline" className={statusColors[p.status] ?? 'text-muted-foreground'}>
                      {p.status}
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment methods info */}
      <Card className="bg-card border-border">
        <CardContent className="p-5 space-y-3">
          <h2 className="font-semibold text-sm">Buying — payment methods</h2>
          <p className="text-sm text-muted-foreground">
            Payment methods are managed securely through Stripe at checkout. No card details are stored on this platform.
          </p>
        </CardContent>
      </Card>

      {/* Recent orders */}
      <Card className="bg-card border-border">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm">Recent purchases</h2>
            <Link href="/orders" className="text-sm text-muted-foreground hover:text-foreground transition-colors">View all</Link>
          </div>
          {recentOrders && recentOrders.length > 0 ? (
            <div className="space-y-2">
              {recentOrders.map(order => {
                const listing = order.listings
                return (
                  <Link key={order.id} href={`/orders/${order.id}`}>
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-colors">
                      <div>
                        <p className="text-sm font-medium truncate">{listing?.title ?? 'Order'}</p>
                        <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                      <p className="text-sm font-medium">${(order.total_amount / 100).toFixed(2)}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="py-6 text-center text-muted-foreground">
              <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No purchases yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
