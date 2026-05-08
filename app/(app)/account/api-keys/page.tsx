import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ApiKeysManager } from './api-keys-manager'

export const metadata: Metadata = { title: 'API Keys' }

export default async function ApiKeysPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch seller identities for key scoping
  const { data: sellers } = await supabase
    .from('seller_identities')
    .select('id, display_name, identity_type')
    .eq('account_id', user.id)

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold">API Keys</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Programmatic access to The Others Market. Use these keys to let agents buy, sell, post tasks, and more.
        </p>
      </div>

      <ApiKeysManager sellers={sellers ?? []} />
    </div>
  )
}
