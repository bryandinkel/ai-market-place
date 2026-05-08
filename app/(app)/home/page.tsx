import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Package, MessageSquare, PlusSquare, ArrowRight, Bell } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  type ProfileRow = { onboarding_complete: boolean; current_mode: string; display_name: string | null; avatar_url: string | null }
  const { data: rawProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const profile = rawProfile as ProfileRow | null
  if (!profile?.onboarding_complete) redirect('/welcome')

  // Fetch quick stats
  const [activeOrders, unreadMessages, unreadNotifs] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true })
      .eq('buyer_id', user.id)
      .in('status', ['paid', 'in_progress', 'delivered', 'revision_requested']),
    supabase.from('notifications').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('is_read', false),
    supabase.from('notifications').select('*').eq('user_id', user.id).eq('is_read', false)
      .order('created_at', { ascending: false }).limit(5),
  ])

  const quickActions = [
    { label: 'Browse marketplace', href: '/browse', icon: Package, desc: 'Find products and services' },
    { label: 'Post a task', href: '/post-task', icon: PlusSquare, desc: 'Get offers from agents' },
    { label: 'My orders', href: '/orders', icon: Package, desc: `${activeOrders.count ?? 0} active` },
    { label: 'Messages', href: '/messages', icon: MessageSquare, desc: `${unreadMessages.count ?? 0} unread` },
  ]

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back{profile?.display_name ? `, ${profile.display_name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Here&apos;s what&apos;s happening</p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map(({ label, href, icon: Icon, desc }) => (
          <Link key={href} href={href}>
            <Card className="bg-card border-border hover:border-primary/40 transition-all cursor-pointer group">
              <CardContent className="p-4">
                <Icon className="w-5 h-5 text-primary mb-3" />
                <div className="font-medium text-sm group-hover:text-primary transition-colors">{label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent notifications */}
      {(unreadNotifs.data?.length ?? 0) > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              Recent activity
              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">{unreadMessages.count}</Badge>
            </h2>
          </div>
          <div className="space-y-2">
            {unreadNotifs.data?.map(notif => (
              <Link key={notif.id} href={notif.action_url ?? '/orders'}>
                <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card hover:border-primary/30 transition-colors cursor-pointer">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium">{notif.title}</div>
                    <div className="text-xs text-muted-foreground">{notif.body}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Dashboard links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { href: '/dashboard/buyer', label: 'Buyer Dashboard', desc: 'Orders, tasks, favorites' },
          { href: '/dashboard/seller', label: 'Seller Dashboard', desc: 'Listings, earnings, reviews' },
          { href: '/workspace', label: 'Sponsor Workspace', desc: 'Manage your AI agents' },
        ].map(({ href, label, desc }) => (
          <Link key={href} href={href}>
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/40 transition-all cursor-pointer group">
              <div>
                <div className="font-medium text-sm group-hover:text-primary transition-colors">{label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
