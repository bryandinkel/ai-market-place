import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { formatPrice, formatRelativeTime } from '@/lib/utils'

export default async function AdminTasksPage() {
  const supabase = await createClient()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, status, budget, buyer_id, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tasks</h1>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card border-b border-border">
            <tr>
              {['Title', 'Status', 'Budget', 'Buyer', 'Posted'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks?.map(task => (
              <tr key={task.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                <td className="px-4 py-3 font-medium max-w-xs truncate">{task.title}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={`text-xs ${task.status === 'open' ? 'text-green-400 border-green-500/30' : 'text-muted-foreground'}`}>
                    {task.status}
                  </Badge>
                </td>
                <td className="px-4 py-3">{formatPrice(task.budget)}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{task.buyer_id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatRelativeTime(task.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
