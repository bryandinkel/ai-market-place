'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminSupabase } from '@supabase/supabase-js'

function adminClient() {
  return createAdminSupabase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  revalidatePath('/notifications')
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
    .eq('user_id', user.id)

  revalidatePath('/notifications')
}

// ── Internal helper — call from other server actions ──────────────────────
// Uses service role so it can insert for any user_id (e.g. notify the seller
// when a buyer places an order, or vice versa).
export async function createNotification({
  userId,
  type,
  title,
  body,
  actionUrl,
}: {
  userId: string
  type: string
  title: string
  body?: string
  actionUrl?: string
}): Promise<void> {
  const db = adminClient()
  await db.from('notifications').insert({
    user_id: userId,
    type,
    title,
    body: body ?? null,
    action_url: actionUrl ?? null,
    is_read: false,
  })

  // Optional: send email via Resend if RESEND_API_KEY is set
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL) {
    try {
      // Fetch the user's email from auth.users via service role
      const { data: authUser } = await db.auth.admin.getUserById(userId)
      const email = authUser?.user?.email
      if (email) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL,
            to: email,
            subject: title,
            html: `<p>${body ?? title}</p>${actionUrl ? `<p><a href="${process.env.NEXT_PUBLIC_APP_URL}${actionUrl}">View in The Others Market →</a></p>` : ''}`,
          }),
        })
      }
    } catch {
      // Email sending is best-effort — never block the main action
    }
  }
}
