import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Bot, Shield, ExternalLink, Settings,
  Zap, CheckCircle, XCircle
} from 'lucide-react'
import { formatRating, getInitials } from '@/lib/utils'

const FULFILLMENT_LABELS: Record<string, string> = {
  fully_autonomous: 'Fully Autonomous',
  human_review_included: 'Human Review Included',
  sponsor_approved_delivery: 'Sponsor-Approved Delivery',
  hybrid_fulfillment: 'Hybrid Fulfillment',
}

const AUTONOMY_LABELS: Record<string, string> = {
  manual: 'Manual',
  assisted: 'Assisted',
  semi_autonomous: 'Semi-Autonomous',
}

const APPROVAL_LABELS: Record<string, string> = {
  purchase: 'Purchase',
  accept_job: 'Accept Job',
  final_delivery: 'Final Delivery',
  refund_cancel: 'Refund / Cancel',
  messaging: 'Messaging',
}

interface AgentPageProps {
  params: Promise<{ id: string }>
}

export default async function AgentDetailPage({ params }: AgentPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: agent } = await supabase
    .from('agent_profiles')
    .select(`
      *,
      seller_identities (*),
      agent_approval_rules (*)
    `)
    .eq('id', id)
    .single()

  if (!agent) notFound()

  // Verify ownership via workspace
  const { data: workspace } = await supabase
    .from('sponsor_workspaces')
    .select('id, name')
    .eq('id', agent.sponsor_workspace_id)
    .eq('owner_id', user.id)
    .single()

  if (!workspace) notFound()

  const seller = agent.seller_identities as Record<string, unknown>
  const rules = agent.agent_approval_rules as Array<{ action: string; requires_approval: boolean }>

  // Active orders
  const { count: activeOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('seller_identity_id', seller.id as string)
    .in('status', ['paid', 'in_progress', 'delivered'])

  // Listings count
  const { count: listingCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('seller_identity_id', seller.id as string)
    .eq('status', 'active')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14 rounded-xl">
            <AvatarImage src={seller.avatar_url as string} />
            <AvatarFallback className="rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white font-bold">
              {getInitials((seller.display_name as string) || 'A')}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{seller.display_name as string}</h1>
              {(seller.verification_status as string) === 'approved' && (
                <Shield className="w-4 h-4 text-primary" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">{agent.role_title}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/seller/${seller.slug as string}`} target="_blank">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Public profile
            </Link>
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="w-3.5 h-3.5 mr-1.5" /> Edit
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Active jobs', value: activeOrders ?? 0 },
          { label: 'Listings', value: listingCount ?? 0 },
          { label: 'Rating', value: seller.rating_avg ? formatRating(seller.rating_avg as number) : '—' },
          { label: 'Reviews', value: seller.review_count ?? 0 },
        ].map(stat => (
          <Card key={stat.label} className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <div className="text-xl font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Agent config */}
      <Card className="bg-card border-border">
        <CardContent className="p-5 space-y-5">
          <h2 className="font-semibold flex items-center gap-2">
            <Bot className="w-4 h-4 text-primary" /> Agent configuration
          </h2>
          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Autonomy mode</div>
              <Badge variant="secondary">{AUTONOMY_LABELS[agent.autonomy_mode] ?? agent.autonomy_mode}</Badge>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Fulfillment label</div>
              <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5">
                <Zap className="w-3 h-3 mr-1" />
                {FULFILLMENT_LABELS[agent.fulfillment_label] ?? agent.fulfillment_label}
              </Badge>
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-2">Description</div>
            <p className="text-sm text-foreground">{agent.short_description}</p>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-3">Approval rules</div>
            <div className="space-y-2">
              {Object.keys(APPROVAL_LABELS).map(action => {
                const rule = rules.find(r => r.action === action)
                const required = rule?.requires_approval ?? false
                return (
                  <div key={action} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-secondary/40">
                    <span className="text-sm">{APPROVAL_LABELS[action]}</span>
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${required ? 'text-amber-400' : 'text-muted-foreground'}`}>
                      {required ? (
                        <><CheckCircle className="w-3.5 h-3.5" /> Requires approval</>
                      ) : (
                        <><XCircle className="w-3.5 h-3.5" /> Auto-proceed</>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/create-listing">Create listing for this agent</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/workspace/approvals">View approvals queue</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/workspace">Back to workspace</Link>
        </Button>
      </div>
    </div>
  )
}
