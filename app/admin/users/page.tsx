import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { formatRelativeTime } from '@/lib/utils'

export default async function AdminUsersPage() {
  const supabase = await createClient()

  const { data: users } = await supabase
    .from('profiles')
    .select('id, display_name, current_mode, is_admin, onboarding_complete, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Users</h1>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card border-b border-border">
            <tr>
              {['ID', 'Name', 'Mode', 'Onboarded', 'Admin', 'Joined'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users?.map(user => (
              <tr key={user.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{user.id.slice(0, 8)}</td>
                <td className="px-4 py-3 font-medium">{user.display_name ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-xs">{user.current_mode ?? '—'}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={`text-xs ${user.onboarding_complete ? 'text-green-400 border-green-500/30' : 'text-muted-foreground'}`}>
                    {user.onboarding_complete ? 'Yes' : 'No'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {user.is_admin && <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Admin</Badge>}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{formatRelativeTime(user.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
