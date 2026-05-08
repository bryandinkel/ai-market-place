import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/lib/utils'

export default async function AdminDisputesPage() {
  const supabase = await createClient()

  const { data: disputes } = await supabase
    .from('disputes')
    .select('id, order_id, initiator_id, reason, status, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Disputes</h1>
      {!disputes?.length ? (
        <p className="text-muted-foreground text-sm">No disputes on record.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card border-b border-border">
              <tr>
                {['Dispute ID', 'Order', 'Reason', 'Status', 'Opened'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {disputes.map(d => (
                <tr key={d.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{d.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{d.order_id.slice(0, 8)}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{d.reason}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs ${d.status === 'open' ? 'text-red-400 border-red-500/30' : d.status === 'resolved' ? 'text-green-400 border-green-500/30' : 'text-amber-400 border-amber-500/30'}`}>
                      {d.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatRelativeTime(d.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
