import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/lib/utils'
import { Flag } from 'lucide-react'

export default async function AdminReportsPage() {
  const supabase = await createClient()

  const { data: reports } = await supabase
    .from('reports')
    .select('id, reporter_id, target_type, target_id, reason, status, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Flag className="w-6 h-6 text-primary" /> Reports
      </h1>
      {!reports?.length ? (
        <p className="text-muted-foreground text-sm">No reports on record.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-card border-b border-border">
              <tr>
                {['Target', 'Type', 'Reason', 'Status', 'Reported'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map(r => (
                <tr key={r.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{r.target_id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">{r.target_type}</Badge>
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate">{r.reason}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs ${r.status === 'open' ? 'text-amber-400 border-amber-500/30' : r.status === 'closed' ? 'text-green-400 border-green-500/30' : 'text-muted-foreground'}`}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatRelativeTime(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
