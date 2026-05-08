import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LayoutDashboard, ShoppingCart, ClipboardList, CheckCircle, Clock, AlertTriangle, CalendarClock } from 'lucide-react'
import { formatPrice, formatRelativeTime, getInitials } from '@/lib/utils'
import type { Order, Task } from '@/types/database'

export const metadata = { title: 'Your Dashboard — The Others Market' }

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  paid: {
    label: 'Paid',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    icon: <Clock className="w-3 h-3" />,
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    icon: <Clock className="w-3 h-3" />,
  },
  delivered: {
    label: 'Delivered',
    className: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  revision_requested: {
    label: 'Revision',
    className: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
    icon: <CheckCircle className="w-3 h-3" />,
  },
}

export default async function BuyerDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const activeStatuses: Order['status'][] = ['paid', 'in_progress', 'delivered', 'revision_requested']

  const [
    { data: activeOrders },
    { data: postedTasks },
    { data: completedOrders },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select(`
        id, status, total_amount, created_at,
        listings (title),
        seller_identities (display_name, avatar_url)
      `)
      .eq('buyer_id', user.id)
      .in('status', activeStatuses)
      .order('created_at', { ascending: false }),

    supabase
      .from('tasks')
      .select('id, title, budget, deadline, status, created_at')
      .eq('buyer_id', user.id)
      .eq('status', 'open')
      .order('created_at', { ascending: false }),

    supabase
      .from('orders')
      .select('id, total_amount, created_at')
      .eq('buyer_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const activeCount = (activeOrders ?? []).length
  const tasksCount = (postedTasks ?? []).length
  const completedCount = (completedOrders ?? []).length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-indigo-400" />
            Your Dashboard
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Track your orders and posted tasks</p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline" size="sm" className="border-zinc-700 text-zinc-300 hover:text-white">
            <Link href="/browse">Browse Listings</Link>
          </Button>
          <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-500">
            <Link href="/post-task">Post a Task</Link>
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="w-4 h-4 text-indigo-400" />
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Active Orders</p>
            </div>
            <p className="text-3xl font-bold text-white">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList className="w-4 h-4 text-violet-400" />
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Open Tasks</p>
            </div>
            <p className="text-3xl font-bold text-white">{tasksCount}</p>
          </CardContent>
        </Card>
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <p className="text-xs text-zinc-500 uppercase tracking-wider">Completed Orders</p>
            </div>
            <p className="text-3xl font-bold text-white">{completedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Orders */}
      <section>
        <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          Active Orders
          {activeCount > 0 && (
            <Badge variant="secondary" className="text-xs font-normal">{activeCount}</Badge>
          )}
        </h2>
        {activeCount === 0 ? (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <ShoppingCart className="w-8 h-8 text-zinc-600" />
              <p className="text-sm text-zinc-400">No active orders right now.</p>
              <Button asChild variant="link" className="text-indigo-400 h-auto p-0 text-sm">
                <Link href="/browse">Browse listings to get started</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {(activeOrders as Order[]).map(order => {
              const seller = order.seller_identities as { display_name: string; avatar_url: string | null } | null
              const listing = order.listings as { title: string } | null
              const config = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.paid
              return (
                <Link key={order.id} href={`/orders/${order.id}`}>
                  <Card className="border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 rounded-lg shrink-0">
                          <AvatarImage src={seller?.avatar_url ?? undefined} />
                          <AvatarFallback className="rounded-lg bg-indigo-900/50 text-indigo-300 text-xs">
                            {getInitials(seller?.display_name ?? 'S')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">
                            {listing?.title ?? 'Task Order'}
                          </p>
                          <p className="text-xs text-zinc-500 mt-0.5">
                            {seller?.display_name ?? 'Unknown Seller'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <Badge
                            variant="outline"
                            className={`text-xs flex items-center gap-1 ${config.className}`}
                          >
                            {config.icon}
                            {config.label}
                          </Badge>
                          <span className="text-sm font-semibold text-zinc-200">
                            {formatPrice(order.total_amount)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Open Tasks */}
      <section>
        <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
          Open Tasks
          {tasksCount > 0 && (
            <Badge variant="secondary" className="text-xs font-normal">{tasksCount}</Badge>
          )}
        </h2>
        {tasksCount === 0 ? (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <ClipboardList className="w-8 h-8 text-zinc-600" />
              <p className="text-sm text-zinc-400">No open tasks posted yet.</p>
              <Button asChild variant="link" className="text-indigo-400 h-auto p-0 text-sm">
                <Link href="/post-task">Post your first task</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(postedTasks as Task[]).map(task => (
              <Link key={task.id} href={`/requests/${task.id}`}>
                <Card className="border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 transition-colors cursor-pointer h-full">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-2 h-full">
                      <p className="text-sm font-medium text-white line-clamp-2">{task.title}</p>
                      <div className="flex items-center gap-2 mt-auto pt-2 flex-wrap">
                        {task.budget && (
                          <Badge variant="secondary" className="text-xs">
                            {formatPrice(task.budget)}
                          </Badge>
                        )}
                        {task.deadline && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1 text-amber-400 border-amber-500/30 bg-amber-500/10">
                            <CalendarClock className="w-3 h-3" />
                            {new Date(task.deadline).toLocaleDateString()}
                          </Badge>
                        )}
                        <span className="text-xs text-zinc-500 ml-auto">
                          {formatRelativeTime(task.created_at)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recent Completed Orders */}
      {completedCount > 0 && (
        <section>
          <h2 className="text-base font-semibold text-white mb-3">Recently Completed</h2>
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="pt-4 pb-2">
              <ul className="divide-y divide-zinc-800">
                {(completedOrders as Order[]).map(order => (
                  <li key={order.id} className="py-3 flex items-center justify-between gap-4">
                    <Link
                      href={`/orders/${order.id}`}
                      className="text-sm font-medium text-zinc-300 hover:text-white truncate"
                    >
                      Order #{order.id.slice(0, 8)}
                    </Link>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge
                        variant="outline"
                        className="text-xs bg-green-500/10 text-green-400 border-green-500/30"
                      >
                        Completed
                      </Badge>
                      <span className="text-sm font-medium text-zinc-300">
                        {formatPrice(order.total_amount)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  )
}
