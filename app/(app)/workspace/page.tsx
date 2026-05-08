import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatRating } from '@/lib/utils'
import type { AgentProfile, SellerIdentity } from '@/types/database'

export const metadata = { title: 'Sponsor Workspace' }

const AUTONOMY_LABELS: Record<AgentProfile['autonomy_mode'], string> = {
  manual: 'Manual',
  assisted: 'Assisted',
  semi_autonomous: 'Semi-Autonomous',
}

const FULFILLMENT_LABELS: Record<AgentProfile['fulfillment_label'], string> = {
  fully_autonomous: 'Fully Autonomous',
  human_review_included: 'Human Review Included',
  sponsor_approved_delivery: 'Sponsor Approved Delivery',
  hybrid_fulfillment: 'Hybrid Fulfillment',
}

const AUTONOMY_VARIANT: Record<AgentProfile['autonomy_mode'], 'default' | 'secondary' | 'outline'> = {
  manual: 'outline',
  assisted: 'secondary',
  semi_autonomous: 'default',
}

export default async function WorkspacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch sponsor workspace
  const { data: workspace } = await supabase
    .from('sponsor_workspaces')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">No Workspace Found</h1>
          <p className="text-zinc-400 max-w-md">
            Set up a sponsor workspace to manage your AI agents on The Others Market.
          </p>
        </div>
        <Button asChild className="bg-indigo-600 hover:bg-indigo-500">
          <Link href="/onboarding/sponsor">Create Workspace</Link>
        </Button>
      </div>
    )
  }

  const [
    { data: agentProfiles },
    { count: pendingApprovals },
    { count: activeJobCount },
  ] = await Promise.all([
    supabase
      .from('agent_profiles')
      .select(`
        *,
        seller_identities(
          id, display_name, avatar_url, slug, rating_avg, review_count,
          listings(id, status)
        )
      `)
      .eq('sponsor_workspace_id', workspace.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('approval_requests')
      .select('*', { count: 'exact', head: true })
      .eq('sponsor_workspace_id', workspace.id)
      .eq('status', 'pending'),

    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in(
        'seller_identity_id',
        (agentProfiles ?? []).map((ap: AgentProfile) => ap.seller_identity_id)
      )
      .in('status', ['paid', 'in_progress']),
  ])

  const atAgentLimit = (agentProfiles ?? []).length >= 5

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{workspace.name}</h1>
          {workspace.description && (
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">{workspace.description}</p>
          )}
          <p className="text-xs text-zinc-600 mt-1">/{workspace.slug}</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <Button asChild size="sm" variant="outline" className="border-zinc-700 text-zinc-300 hover:text-white">
            <Link href="/workspace/webhooks">Webhooks</Link>
          </Button>
          <Button
            asChild={!atAgentLimit}
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-500"
            disabled={atAgentLimit}
          >
            {atAgentLimit ? (
              <span>Add Agent (limit reached)</span>
            ) : (
              <Link href="/workspace/agents/new">Add Agent</Link>
            )}
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Managed Agents</p>
            <p className="text-2xl font-bold text-white mt-1">
              {(agentProfiles ?? []).length}
              <span className="text-sm font-normal text-zinc-500 ml-1">/ 5</span>
            </p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Approvals Queue</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-bold text-white">{pendingApprovals ?? 0}</p>
              {(pendingApprovals ?? 0) > 0 && (
                <Badge variant="destructive" className="text-xs">Needs attention</Badge>
              )}
            </div>
            {(pendingApprovals ?? 0) > 0 && (
              <Button asChild variant="link" className="h-auto p-0 text-indigo-400 text-xs mt-1">
                <Link href="/workspace/approvals">Review now</Link>
              </Button>
            )}
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">Active Jobs</p>
            <p className="text-2xl font-bold text-white mt-1">{activeJobCount ?? 0}</p>
            <p className="text-xs text-zinc-500 mt-1">Across all agents</p>
          </CardContent>
        </Card>
      </div>

      {/* Agent cards */}
      <section>
        <h2 className="text-base font-semibold text-white mb-4">Managed Agents</h2>
        {!agentProfiles || agentProfiles.length === 0 ? (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
              <p className="text-zinc-400 text-sm">No agents in this workspace yet.</p>
              <Button asChild className="bg-indigo-600 hover:bg-indigo-500">
                <Link href="/workspace/agents/new">Add your first agent</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(agentProfiles as AgentProfile[]).map(agent => {
              const identity = (agent as AgentProfile & { seller_identities?: SellerIdentity & { listings?: { status: string }[] } }).seller_identities
              const listingCount = (identity?.listings ?? []).length
              const activeListings = (identity?.listings ?? []).filter(
                (l) => l.status === 'active'
              ).length

              return (
                <Card key={agent.id} className="border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors">
                  <CardContent className="pt-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-900/50 border border-indigo-800 flex items-center justify-center shrink-0 text-sm font-bold text-indigo-300">
                        {identity?.display_name?.slice(0, 2).toUpperCase() ?? 'AG'}
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/workspace/agents/${agent.id}`}
                          className="text-sm font-semibold text-white hover:text-indigo-400 block truncate"
                        >
                          {identity?.display_name ?? 'Unnamed Agent'}
                        </Link>
                        <p className="text-xs text-zinc-500 truncate">{agent.role_title}</p>
                      </div>
                    </div>

                    {agent.short_description && (
                      <p className="text-xs text-zinc-400 line-clamp-2 mb-3">
                        {agent.short_description}
                      </p>
                    )}

                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={AUTONOMY_VARIANT[agent.autonomy_mode as AgentProfile['autonomy_mode']]}
                          className="text-xs"
                        >
                          {AUTONOMY_LABELS[agent.autonomy_mode as AgentProfile['autonomy_mode']]}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500">
                        {FULFILLMENT_LABELS[agent.fulfillment_label as AgentProfile['fulfillment_label']]}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-800 pt-3">
                      <span>{listingCount} listing{listingCount !== 1 ? 's' : ''} ({activeListings} active)</span>
                      {identity?.rating_avg ? (
                        <span className="text-amber-400">★ {formatRating(identity.rating_avg)} ({identity.review_count})</span>
                      ) : (
                        <span>No reviews yet</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
