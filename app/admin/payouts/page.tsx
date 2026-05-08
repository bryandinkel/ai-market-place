import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { TriggerPayoutsButton } from './trigger-payouts-button'

function formatCents(n: number | null) {
  if (n == null) return '—'
  return `$${(n / 100).toFixed(2)}`
}

export default async function AdminPayoutsPage() {
  const supabase = await createClient()

  // Pending payouts (eligible but not yet processed)
  const { data: pendingOrders, count: pendingCount } = await supabase
    .from('orders')
    .select(`
      id,
      total_amount,
      platform_fee_amount,
      seller_payout_amount,
      payout_eligible_at,
      created_at,
      seller_identities (display_name, stripe_onboarding_complete)
    `, { count: 'exact' })
    .lte('payout_eligible_at', new Date().toISOString())
    .is('payout_record_id', null)
    .eq('status', 'paid')
    .order('payout_eligible_at', { ascending: true })
    .limit(20)

  // Upcoming payouts (hold period not yet elapsed)
  const { data: upcomingOrders } = await supabase
    .from('orders')
    .select(`
      id,
      total_amount,
      platform_fee_amount,
      seller_payout_amount,
      payout_eligible_at,
      seller_identities (display_name)
    `)
    .gt('payout_eligible_at', new Date().toISOString())
    .is('payout_record_id', null)
    .eq('status', 'paid')
    .order('payout_eligible_at', { ascending: true })
    .limit(10)

  // Recent payout records
  const { data: payouts } = await supabase
    .from('payout_records')
    .select(`
      id,
      gross_amount,
      platform_fee,
      net_amount,
      amount,
      status,
      stripe_transfer_id,
      paid_at,
      created_at,
      failure_message,
      seller_identities (display_name)
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  const totalPaid = payouts?.filter(p => p.status === 'paid').reduce((s, p) => s + (p.net_amount ?? p.amount), 0) ?? 0
  const totalFees = payouts?.filter(p => p.status === 'paid').reduce((s, p) => s + (p.platform_fee ?? 0), 0) ?? 0

  const statusStyles: Record<string, string> = {
    paid: 'text-green-400 border-green-500/30',
    pending: 'text-amber-400 border-amber-500/30',
    scheduled: 'text-indigo-400 border-indigo-500/30',
    failed: 'text-red-400 border-red-500/30',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-primary" /> Payouts
        </h1>
        <TriggerPayoutsButton />
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total paid out</p>
            <p className="text-xl font-bold text-green-400">{formatCents(totalPaid)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Platform fees collected</p>
            <p className="text-xl font-bold text-primary">{formatCents(totalFees)}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Pending payouts</p>
            <p className="text-xl font-bold text-amber-400">{pendingCount ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending — ready to pay */}
      {(pendingOrders?.length ?? 0) > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" /> Ready to pay out ({pendingCount})
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-card border-b border-border">
                <tr>
                  {['Seller', 'Gross', 'Fee (10%)', 'Net', 'Eligible since', 'Connect?'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingOrders?.map(o => {
                  type SellerCol = { display_name: string; stripe_onboarding_complete: boolean } | null
                  const seller = o.seller_identities as SellerCol
                  return (
                    <tr key={o.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                      <td className="px-4 py-3 font-medium">{seller?.display_name ?? '—'}</td>
                      <td className="px-4 py-3">{formatCents(o.total_amount)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatCents(o.platform_fee_amount)}</td>
                      <td className="px-4 py-3 font-semibold text-green-400">{formatCents(o.seller_payout_amount)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {o.payout_eligible_at ? new Date(o.payout_eligible_at).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {seller?.stripe_onboarding_complete ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upcoming */}
      {(upcomingOrders?.length ?? 0) > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" /> Upcoming (hold period active)
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-card border-b border-border">
                <tr>
                  {['Seller', 'Net payout', 'Eligible on'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {upcomingOrders?.map(o => {
                  const seller = o.seller_identities as { display_name: string } | null
                  return (
                    <tr key={o.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                      <td className="px-4 py-3 font-medium">{seller?.display_name ?? '—'}</td>
                      <td className="px-4 py-3">{formatCents(o.seller_payout_amount)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {o.payout_eligible_at ? new Date(o.payout_eligible_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payout history */}
      <div>
        <h2 className="text-sm font-semibold mb-3">Payout history</h2>
        {!payouts?.length ? (
          <p className="text-muted-foreground text-sm">No payout records yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-card border-b border-border">
                <tr>
                  {['Seller', 'Gross', 'Fee', 'Net', 'Status', 'Transfer ID', 'Paid at'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payouts.map(p => {
                  const seller = p.seller_identities as { display_name: string } | null
                  return (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                      <td className="px-4 py-3 font-medium">{seller?.display_name ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatCents(p.gross_amount)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatCents(p.platform_fee)}</td>
                      <td className="px-4 py-3 font-semibold">{formatCents(p.net_amount ?? p.amount)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-xs ${statusStyles[p.status] ?? 'text-muted-foreground'}`}>
                          {p.status}
                        </Badge>
                        {p.failure_message && (
                          <p className="text-xs text-red-400 mt-0.5 truncate max-w-[140px]">{p.failure_message}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground font-mono">
                        {p.stripe_transfer_id ? p.stripe_transfer_id.slice(0, 16) + '…' : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
