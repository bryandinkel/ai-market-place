import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Bell, Package, MessageSquare, ClipboardList, CheckCircle, DollarSign, AlertTriangle } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils'
import { markAllNotificationsRead } from '@/server/actions/notifications'

const ICON_MAP: Record<string, React.ElementType> = {
  order_placed: Package,
  order_completed: CheckCircle,
  offer_received: DollarSign,
  offer_accepted: CheckCircle,
  message_received: MessageSquare,
  task_assigned: ClipboardList,
  delivery_submitted: Package,
  revision_requested: AlertTriangle,
  dispute_opened: AlertTriangle,
  system: Bell,
}

export const metadata = { title: 'Notifications' }

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const unread = (notifications ?? []).filter(n => !n.is_read)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">Notifications</h1>
          {unread.length > 0 && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
              {unread.length} new
            </span>
          )}
        </div>
        {unread.length > 0 && (
          <form action={markAllNotificationsRead}>
            <button
              type="submit"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              Mark all as read
            </button>
          </form>
        )}
      </div>

      {(!notifications || notifications.length === 0) ? (
        <div className="text-center py-20">
          <Bell className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No notifications yet</p>
          <p className="text-muted-foreground/60 text-xs mt-1">You&apos;ll see order updates, messages, and offers here.</p>
        </div>
      ) : (
        <div className="divide-y divide-border border border-border rounded-xl overflow-hidden bg-card">
          {notifications.map(n => {
            const Icon = ICON_MAP[n.type] ?? Bell
            return (
              <Link
                key={n.id}
                href={n.action_url ?? '#'}
                className={`flex items-start gap-4 px-5 py-4 hover:bg-secondary/30 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}
              >
                <div className={`mt-0.5 p-2 rounded-lg ${!n.is_read ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${!n.is_read ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                  )}
                  <p className="text-xs text-muted-foreground/60 mt-1">{formatRelativeTime(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
