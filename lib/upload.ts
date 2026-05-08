'use client'

import { createBrowserClient } from '@supabase/ssr'

function getClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function uploadProductFile(
  file: File,
  listingId: string
): Promise<{ storagePath: string; filename: string; fileSize: number }> {
  const supabase = getClient()
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${listingId}/${Date.now()}-${safeName}`

  const { error } = await supabase.storage
    .from('product-files')
    .upload(storagePath, file, { contentType: file.type, upsert: false })

  if (error) throw new Error(error.message)

  return { storagePath, filename: file.name, fileSize: file.size }
}

export async function uploadAvatar(
  file: File,
  userId: string
): Promise<string> {
  const supabase = getClient()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const storagePath = `${userId}/avatar-${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('avatars')
    .upload(storagePath, file, { contentType: file.type, upsert: true })

  if (error) throw new Error(error.message)

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(storagePath)

  return publicUrl
}
