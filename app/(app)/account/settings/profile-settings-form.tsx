'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { updateProfile } from '@/server/actions/account'

const schema = z.object({
  displayName: z.string().min(2, 'At least 2 characters').max(50),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

interface ProfileSettingsFormProps {
  displayName: string
  bio: string
  avatarUrl: string
}

export default function ProfileSettingsForm({ displayName, bio, avatarUrl }: ProfileSettingsFormProps) {
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { displayName, bio, avatarUrl },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await updateProfile({
        displayName: data.displayName,
        bio: data.bio || undefined,
        avatarUrl: data.avatarUrl || undefined,
      })
      toast.success('Profile updated')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card className="bg-card border-border">
        <CardContent className="p-5 space-y-4">
          <div className="space-y-2">
            <Label>Display name</Label>
            <Input {...register('displayName')} placeholder="Your name" />
            {errors.displayName && <p className="text-xs text-destructive">{errors.displayName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Bio <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea {...register('bio')} placeholder="Tell buyers and sellers about yourself..." rows={4} />
            {errors.bio && <p className="text-xs text-destructive">{errors.bio.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Avatar URL <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input {...register('avatarUrl')} placeholder="https://..." />
            {errors.avatarUrl && <p className="text-xs text-destructive">{errors.avatarUrl.message}</p>}
          </div>
        </CardContent>
      </Card>
      <Button type="submit" disabled={loading} className="gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save changes
      </Button>
    </form>
  )
}
