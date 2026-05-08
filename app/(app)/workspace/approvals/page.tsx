import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ApprovalActions } from './approval-actions'
import { CheckSquare, Clock, Bot } from 'lucide-react'
import { formatRelativeTime, getInitials } from '@/lib/utils'

const ACTION_LABELS: Record<string, string> = {
  purchase: 'Purchase Request',
  accept_job: 'Accept Job',
  final_delivery: 'Final Delivery',
  refund_cancel: 'Refund / Cancel',
  messaging: 'Send Message',
}

export default async function ApprovalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: workspace } = await supabase
    .from('sponsor_workspaces')
    .select('id, name')
    .eq('owner_id', user.id)
    .single()

  if (!workspace) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>You don&apos;t have a sponsor workspace yet.</p>
      </div>
    )
  }

  const { data: pending } = await supabase
    .from('approval_requests')
    .select(`
      *,
      agent_profiles (
        role_title,
        seller_identities (display_name, avatar_url)
      )
    `)
    .eq('sponsor_workspace_id', workspace.id)
    .eq('status', 'pending')
    .order('requested_at', { ascending: false })

  const { data: history } = await supabase
    .from('approval_requests')
    .select(`
      *,
      agent_profiles (
        role_title,
        seller_identities (display_name, avatar_url)
      )
    `)
    .eq('sponsor_workspace_id', workspace.id)
    .neq('status', 'pending')
    .order('reviewed_at', { ascending: false })
    .limit(10)

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-primary" /> Approvals Queue
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Actions waiting for your review — workspace: {workspace.name}
        </p>
      </div>

      {/* Pending */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Pending</h2>
          {(pending?.length ?? 0) > 0 && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
              {pending!.length}
            </Badge>
          )}
        </div>

        {!pending?.length ? (
          <div className="py-10 text-center text-muted-foreground border border-dashed border-border rounded-xl">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No pending approvals</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((req) => {
              const ap = req.agent_profiles as Record<string, unknown>
              const si = (ap?.seller_identities as Record<string, unknown>) ?? {}
              return (
                <Card key={req.id} className="bg-card border-amber-500/20">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-9 w-9 rounded-lg">
                          <AvatarImage src={si.avatar_url as string} />
                          <AvatarFallback className="rounded-lg bg-violet-500/20 text-violet-400 text-xs">
                            {getInitials((si.display_name as string) || 'A')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium text-sm">{si.display_name as string}</span>
                            <Bot className="w-3 h-3 text-violet-400" />
                          </div>
                          <div className="text-xs text-muted-foreground">{ap?.role_title as string}</div>
                          <div className="mt-2">
                            <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30">
                              {ACTION_LABELS[req.action_type] ?? req.action_type}
                            </Badge>
                          </div>
                          {req.context && Object.keys(req.context as object).length > 0 && (
                            <div className="mt-2 text-xs text-muted-foreground bg-secondary/50 rounded p-2">
                              {JSON.stringify(req.context, null, 2)}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-2">
                            {formatRelativeTime(req.requested_at)}
                          </div>
                        </div>
                      </div>
                      <ApprovalActions requestId={req.id} />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* History */}
      {(history?.length ?? 0) > 0 && (
        <div>
          <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4">Recent history</h2>
          <div className="space-y-2">
            {history!.map((req) => {
              const ap = req.agent_profiles as Record<string, unknown>
              const si = (ap?.seller_identities as Record<string, unknown>) ?? {}
              return (
                <div key={req.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-card border border-border">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{si.display_name as string}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{ACTION_LABELS[req.action_type] ?? req.action_type}</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={req.status === 'approved'
                      ? 'text-green-400 border-green-500/30 text-xs'
                      : 'text-red-400 border-red-500/30 text-xs'
                    }
                  >
                    {req.status}
                  </Badge>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
