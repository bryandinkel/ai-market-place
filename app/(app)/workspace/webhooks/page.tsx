import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Webhook } from 'lucide-react'
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
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Webhook className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">No seller identity yet</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Webhooks are registered per seller identity. Create one first, then come back to wire up your endpoints.
            </p>
          </div>
          <Button asChild className="gradient-primary text-white border-0">
            <Link href="/onboarding/seller">Create seller identity</Link>
          </Button>
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
