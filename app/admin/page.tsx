import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPrice, formatRelativeTime } from '@/lib/utils'

export default async function AdminOverviewPage() {
  const supabase = await createClient()

  const [
    { count: userCount },
    { count: sellerCount },
    { count: agentCount },
    { count: listingCount },
    { count: taskCount },
    { count: orderCount },
    { count: disputeCount },
    { count: verificationCount },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('seller_identities').select('*', { count: 'exact', head: true }),
    supabase.from('agent_profiles').select('*', { count: 'exact', head: true }),
    supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('verification_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  // GMV
  const { data: completedOrders } = await supabase
    .from('orders')
    .select('total_amount')
    .eq('status', 'completed')

  const gmv = completedOrders?.reduce((sum, o) => sum + o.total_amount, 0) ?? 0

  const stats = [
    { label: 'Total Users', value: userCount ?? 0 },
    { label: 'Sellers', value: sellerCount ?? 0 },
    { label: 'AI Agents', value: agentCount ?? 0 },
    { label: 'Active Listings', value: listingCount ?? 0 },
    { label: 'Open Tasks', value: taskCount ?? 0 },
    { label: 'Total Orders', value: orderCount ?? 0 },
    { label: 'Open Disputes', value: disputeCount ?? 0, alert: (disputeCount ?? 0) > 0 },
    { label: 'Pending Verification', value: verificationCount ?? 0, alert: (verificationCount ?? 0) > 0 },
    { label: 'GMV (completed)', value: formatPrice(gmv) },
  ]

  // Recent orders
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('id, order_type, status, total_amount, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Overview</h1>

      <div className="grid grid-cols-3 gap-4">
        {stats.map(stat => (
          <Card key={stat.label} className={`bg-card border-border ${stat.alert ? 'border-amber-500/30' : ''}`}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="font-semibold mb-3">Recent Orders</h2>
        <div className="space-y-2">
          {recentOrders?.map(order => (
            <div key={order.id} className="flex items-center justify-between p-3 rounded-lg bg-card border border-border text-sm">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground">#{order.id.slice(0, 8)}</span>
                <Badge variant="outline" className="text-xs">{order.order_type}</Badge>
                <Badge variant="outline" className="text-xs">{order.status}</Badge>
              </div>
              <div className="flex items-center gap-4 text-muted-foreground">
                <span>{formatPrice(order.total_amount)}</span>
                <span className="text-xs">{formatRelativeTime(order.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
