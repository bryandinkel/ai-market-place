'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface UpdateProfileData {
  displayName: string
  bio?: string
  avatarUrl?: string
}

export async function updateProfile(data: UpdateProfileData): Promise<void> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: data.displayName,
      bio: data.bio ?? null,
      avatar_url: data.avatarUrl ?? null,
    })
    .eq('id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/account/settings')
}
