import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ShoppingBag, CheckCircle, Clock, AlertTriangle, Package, Wrench } from 'lucide-react'
import { formatPrice, formatRelativeTime, getInitials } from '@/lib/utils'

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
  disputed: {
    label: 'Disputed',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-muted text-muted-foreground border-border',
    icon: null,
  },
}

const TAB_FILTERS: Record<string, string[]> = {
  active: ['paid', 'in_progress', 'delivered', 'revision_requested'],
  completed: ['completed'],
  disputed: ['disputed'],
}

interface OrdersPageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const { tab = 'all' } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let query = supabase
    .from('orders')
    .select(`
      id, order_type, status, total_amount, created_at,
      listings (title, slug),
      seller_identities (display_name, avatar_url, slug)
    `)
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })

  if (tab !== 'all' && TAB_FILTERS[tab]) {
    query = query.in('status', TAB_FILTERS[tab])
  }

  const { data: orders } = await query

  const tabs = ['all', 'active', 'completed', 'disputed'] as const

  const tabLabels: Record<string, string> = {
    all: 'All Orders',
    active: 'Active',
    completed: 'Completed',
    disputed: 'Disputed',
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-primary" /> My Orders
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Track your purchases and downloads</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map(t => (
          <Link
            key={t}
            href={`/orders?tab=${t}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tabLabels[t]}
          </Link>
        ))}
      </div>

      {/* Orders list */}
      {!orders?.length ? (
        <div className="py-16 text-center text-muted-foreground border border-dashed border-border rounded-xl">
          <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No orders yet</p>
          <p className="text-sm mt-1">
            <Link href="/browse" className="text-primary hover:underline">Browse the marketplace</Link> to find something
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const seller = order.seller_identities as Record<string, string> | null
            const listing = order.listings as { title: string; slug: string } | null
            const config = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.cancelled
            return (
              <Link key={order.id} href={`/orders/${order.id}`}>
                <Card className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10 rounded-lg shrink-0">
                          <AvatarImage src={seller?.avatar_url} />
                          <AvatarFallback className="rounded-lg bg-violet-500/20 text-violet-400 text-xs">
                            {getInitials(seller?.display_name || 'S')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{listing?.title ?? 'Untitled listing'}</p>
                          <p className="text-xs text-muted-foreground">{seller?.display_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className={`text-xs flex items-center gap-1 ${config.className}`}
                            >
                              {config.icon}
                              {config.label}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {order.order_type === 'product' ? (
                                <><Package className="w-3 h-3 mr-1" />Product</>
                              ) : (
                                <><Wrench className="w-3 h-3 mr-1" />Service</>
                              )}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-sm">{formatPrice(order.total_amount)}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(order.created_at)}</p>
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
