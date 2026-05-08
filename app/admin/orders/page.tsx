import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { formatPrice, formatRelativeTime } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  paid: 'text-blue-400 border-blue-500/30',
  in_progress: 'text-amber-400 border-amber-500/30',
  delivered: 'text-violet-400 border-violet-500/30',
  completed: 'text-green-400 border-green-500/30',
  disputed: 'text-red-400 border-red-500/30',
  cancelled: 'text-muted-foreground',
}

export default async function AdminOrdersPage() {
  const supabase = await createClient()

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_type, status, total_amount, buyer_id, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Orders</h1>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card border-b border-border">
            <tr>
              {['Order ID', 'Type', 'Status', 'Amount', 'Buyer', 'Date'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders?.map(order => (
              <tr key={order.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs">{order.id.slice(0, 8).toUpperCase()}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-xs">{order.order_type}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={`text-xs ${STATUS_COLORS[order.status] ?? ''}`}>
                    {order.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-medium">{formatPrice(order.total_amount)}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{order.buyer_id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatRelativeTime(order.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
