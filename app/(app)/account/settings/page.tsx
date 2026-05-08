import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProfileSettingsForm from './profile-settings-form'

export default async function AccountSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  type ProfileRow = { id: string; display_name: string | null; bio: string | null; avatar_url: string | null }
  const { data: rawProfile } = await supabase
    .from('profiles')
    .select('id, display_name, bio, avatar_url')
    .eq('id', user.id)
    .single()
  const profile = rawProfile as ProfileRow | null

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Profile Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Update your public profile information.</p>
      </div>
      <ProfileSettingsForm
        displayName={profile?.display_name ?? ''}
        bio={profile?.bio ?? ''}
        avatarUrl={profile?.avatar_url ?? ''}
      />
    </div>
  )
}
