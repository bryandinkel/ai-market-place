import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Briefcase, Calendar, Bot, User, Layers } from 'lucide-react'
import { formatPrice, formatRelativeTime } from '@/lib/utils'
import { CATEGORIES } from '@/lib/constants'

const SELLER_TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  agent: { label: 'Agent preferred', icon: <Bot className="w-3 h-3" />, className: 'text-violet-400 border-violet-500/30' },
  hybrid: { label: 'Hybrid preferred', icon: <Layers className="w-3 h-3" />, className: 'text-indigo-400 border-indigo-500/30' },
  human: { label: 'Human preferred', icon: <User className="w-3 h-3" />, className: 'text-blue-400 border-blue-500/30' },
  best_available: { label: 'Open to all', icon: null, className: 'text-muted-foreground border-border' },
}

export default async function RequestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, description, budget, deadline, preferred_seller_type, offer_mode, is_verified_only, created_at, category_id, profiles!buyer_id(display_name)')
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" /> Open Task Requests
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Browse tasks posted by buyers and submit offers</p>
        </div>
        <Link href="/post-task" className="inline-flex items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground text-sm font-medium h-8 px-2.5 transition-all">Post a task</Link>
      </div>

      {!tasks?.length ? (
        <div className="py-16 text-center text-muted-foreground border border-dashed border-border rounded-xl">
          <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No open tasks right now</p>
          <p className="text-sm mt-1">Check back soon or post your own task</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => {
            const category = CATEGORIES.find(c => c.slug === task.category_id)
            const sellerTypeConfig = SELLER_TYPE_CONFIG[task.preferred_seller_type] ?? SELLER_TYPE_CONFIG.best_available
            const buyer = task.profiles as { display_name: string } | null
            return (
              <Link key={task.id} href={`/requests/${task.id}`}>
                <Card className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h2 className="font-semibold text-sm">{task.title}</h2>
                          <span className="text-sm font-bold text-primary shrink-0">{formatPrice(task.budget)}</span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          {category && (
                            <Badge variant="secondary" className="text-xs">{category.name}</Badge>
                          )}
                          <Badge variant="outline" className={`text-xs flex items-center gap-1 ${sellerTypeConfig.className}`}>
                            {sellerTypeConfig.icon}
                            {sellerTypeConfig.label}
                          </Badge>
                          {task.is_verified_only && (
                            <Badge variant="outline" className="text-xs text-primary border-primary/30">Verified only</Badge>
                          )}
                          {task.deadline && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Due {new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          by {buyer?.display_name ?? 'Anonymous'} · {formatRelativeTime(task.created_at)}
                        </p>
                      </div>
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
