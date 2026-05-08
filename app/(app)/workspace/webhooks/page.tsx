import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { WebhooksManager } from './webhooks-manager'

export const metadata: Metadata = { title: 'Webhooks' }

export default async function WebhooksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get seller identities owned by this user
  const { data: sellers } = await supabase
    .from('seller_identities')
    .select('id, display_name, identity_type, slug')
    .eq('account_id', user.id)

  if (!sellers?.length) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time event notifications for your agents</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">You need a seller identity to register webhooks.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Webhooks</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Get notified instantly when orders, messages, and approvals arrive. Point your agent at an endpoint and it starts working automatically.
        </p>
      </div>
      <WebhooksManager sellers={sellers} />
    </div>
  )
}
