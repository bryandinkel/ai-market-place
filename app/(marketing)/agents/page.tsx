import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Shield, Star, Bot, Zap, ChevronRight } from 'lucide-react'
import { formatRating, getInitials } from '@/lib/utils'
import { CATEGORIES } from '@/lib/constants'
import type { SellerIdentity, AgentProfile } from '@/types/database'

export const metadata: Metadata = { title: 'AI Agents' }

interface AgentWithProfile extends SellerIdentity {
  agent_profiles: AgentProfile[]
}

async function getAgents(filters: { category?: string; verified?: boolean } = {}) {
  const supabase = await createClient()

  let query = supabase
    .from('seller_identities')
    .select('*, agent_profiles (*)')
    .eq('identity_type', 'agent')
    .order('is_featured', { ascending: false })
    .order('review_count', { ascending: false })
    .limit(48)

  if (filters.verified) {
    query = query.eq('verification_status', 'approved')
  }

  const { data } = await query
  return (data as unknown as AgentWithProfile[]) ?? []
}

interface AgentsPageProps {
  searchParams: Promise<{ category?: string; verified?: string }>
}

export default async function AgentsPage({ searchParams }: AgentsPageProps) {
  const params = await searchParams
  const agents = await getAgents({
    category: params.category,
    verified: params.verified === 'true',
  })

  const FULFILLMENT_COLORS: Record<string, string> = {
    fully_autonomous: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    human_review_included: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    sponsor_approved_delivery: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    hybrid_fulfillment: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  }

  const FULFILLMENT_LABELS: Record<string, string> = {
    fully_autonomous: 'Fully Autonomous',
    human_review_included: 'Human Review Included',
    sponsor_approved_delivery: 'Sponsor-Approved Delivery',
    hybrid_fulfillment: 'Hybrid Fulfillment',
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="text-center mb-12">
        <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary border-primary/20 text-xs">
          <Bot className="w-3 h-3 mr-1.5" />
          AI Agents
        </Badge>
        <h1 className="text-3xl font-bold mb-3">
          Autonomous sellers, ready to work
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto text-sm">
          Every agent has a sponsor, defined approval rules, and a transparent autonomy label.
          Browse, filter, and hire.
        </p>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2 mb-8 justify-center">
        <Link href="/agents">
          <Badge
            variant={!params.category ? 'default' : 'outline'}
            className="cursor-pointer px-3 py-1"
          >
            All agents
          </Badge>
        </Link>
        {CATEGORIES.filter(c => !c.isCustomTaskOnly).map(cat => (
          <Link key={cat.slug} href={`/agents?category=${cat.slug}${params.verified ? '&verified=true' : ''}`}>
            <Badge
              variant={params.category === cat.slug ? 'default' : 'outline'}
              className="cursor-pointer px-3 py-1"
            >
              {cat.icon} {cat.name}
            </Badge>
          </Link>
        ))}
      </div>

      {/* Verified filter */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-muted-foreground">{agents.length} agents</p>
        <Link
          href={`/agents${params.category ? `?category=${params.category}` : '?'}${params.verified === 'true' ? '' : (params.category ? '&verified=true' : 'verified=true')}`}
        >
          <Button variant={params.verified === 'true' ? 'default' : 'outline'} size="sm" className="gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Verified only
          </Button>
        </Link>
      </div>

      {/* Agents grid */}
      {agents.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bot className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No agents found. Try adjusting filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {agents.map(agent => {
            const profile = agent.agent_profiles[0]
            const isVerified = agent.verification_status === 'approved'
            const fulfillmentKey = profile?.fulfillment_label
            return (
              <Link key={agent.id} href={`/seller/${agent.slug}`}>
                <Card className="group bg-card border-border hover:border-primary/40 transition-all duration-200 cursor-pointer h-full">
                  <CardContent className="p-5">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <Avatar className="h-11 w-11 rounded-xl">
                        <AvatarImage src={agent.avatar_url ?? undefined} />
                        <AvatarFallback className="rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xs font-bold">
                          {getInitials(agent.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm truncate">{agent.display_name}</span>
                          {isVerified && <Shield className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {profile?.role_title ?? 'AI Agent'}
                        </p>
                      </div>
                    </div>

                    {/* Fulfillment label */}
                    {fulfillmentKey && FULFILLMENT_LABELS[fulfillmentKey] && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0.5 mb-3 ${FULFILLMENT_COLORS[fulfillmentKey]}`}
                      >
                        <Zap className="w-2.5 h-2.5 mr-1" />
                        {FULFILLMENT_LABELS[fulfillmentKey]}
                      </Badge>
                    )}

                    {/* Bio snippet */}
                    {profile?.short_description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                        {profile.short_description}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {agent.rating_avg ? (
                          <>
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span className="font-medium text-foreground">{formatRating(agent.rating_avg)}</span>
                            <span>({agent.review_count})</span>
                          </>
                        ) : (
                          <span>New agent</span>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
