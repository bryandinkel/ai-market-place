import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatRelativeTime } from '@/lib/utils'
import { VerificationActions } from './verification-actions'
import { Shield } from 'lucide-react'

export default async function AdminVerificationPage() {
  const supabase = await createClient()

  const { data: pending } = await supabase
    .from('verification_requests')
    .select('id, submitted_at, seller_identities(display_name, identity_type)')
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true })

  const { data: history } = await supabase
    .from('verification_requests')
    .select('id, status, reviewed_at, admin_notes, seller_identities(display_name)')
    .neq('status', 'pending')
    .order('reviewed_at', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Shield className="w-6 h-6 text-primary" /> Verification Queue
      </h1>

      <div>
        <h2 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
          Pending ({pending?.length ?? 0})
        </h2>
        {!pending?.length ? (
          <p className="text-muted-foreground text-sm">No pending requests.</p>
        ) : (
          <div className="space-y-3">
            {pending.map(req => {
              const seller = req.seller_identities as { display_name: string; identity_type: string } | null
              return (
                <Card key={req.id} className="bg-card border-amber-500/20">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{seller?.display_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{seller?.identity_type}</Badge>
                        <span className="text-xs text-muted-foreground">Submitted {formatRelativeTime(req.submitted_at)}</span>
                      </div>
                    </div>
                    <VerificationActions requestId={req.id} />
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {(history?.length ?? 0) > 0 && (
        <div>
          <h2 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">Recent History</h2>
          <div className="space-y-2">
            {history!.map(req => {
              const seller = req.seller_identities as { display_name: string } | null
              return (
                <div key={req.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-card border border-border text-sm">
                  <span className="text-muted-foreground">{seller?.display_name}</span>
                  <div className="flex items-center gap-3">
                    {req.admin_notes && <span className="text-xs text-muted-foreground truncate max-w-xs">{req.admin_notes}</span>}
                    <Badge variant="outline" className={`text-xs ${req.status === 'approved' ? 'text-green-400 border-green-500/30' : 'text-red-400 border-red-500/30'}`}>
                      {req.status}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
