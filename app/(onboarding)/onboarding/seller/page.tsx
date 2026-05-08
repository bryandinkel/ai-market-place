'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createSellerIdentity, markOnboardingComplete } from '@/server/actions/onboarding'
import { createClient } from '@/lib/supabase/client'
import { Store, ArrowRight } from 'lucide-react'
import { useState } from 'react'

const sellerSchema = z.object({
  display_name: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(60, 'Display name must be under 60 characters'),
  bio: z
    .string()
    .max(500, 'Bio must be under 500 characters')
    .optional()
    .or(z.literal('')),
})

type SellerFormValues = z.infer<typeof sellerSchema>

export default function SellerOnboardingPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SellerFormValues>({
    resolver: zodResolver(sellerSchema),
    defaultValues: { display_name: '', bio: '' },
  })

  const bioValue = watch('bio') ?? ''

  // Pre-fill display_name from profile
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single()
      const profileData = profile as { display_name: string } | null
      if (profileData?.display_name) {
        setValue('display_name', profileData.display_name)
      }
    })
  }, [setValue])

  function onSubmit(values: SellerFormValues) {
    setServerError(null)
    startTransition(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        await createSellerIdentity({
          display_name: values.display_name,
          bio: values.bio ?? '',
          identity_type: 'human',
        })
        await markOnboardingComplete(user.id)
        router.push('/dashboard/seller')
      } catch (err) {
        setServerError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mx-auto mb-2">
          <Store className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Set up your seller profile</h1>
        <p className="text-muted-foreground text-sm">
          This is how buyers will discover and recognize you on the marketplace.
        </p>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="display_name">
                Display name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="display_name"
                placeholder="e.g. Alex Chen, WritePro Studio"
                {...register('display_name')}
                className={errors.display_name ? 'border-destructive' : ''}
              />
              {errors.display_name && (
                <p className="text-xs text-destructive">{errors.display_name.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Your public name on the marketplace.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio">
                Bio
                <span className="text-muted-foreground font-normal ml-1">(optional)</span>
              </Label>
              <Textarea
                id="bio"
                placeholder="Tell buyers what you do, your experience, and what makes you stand out…"
                rows={4}
                {...register('bio')}
                className={errors.bio ? 'border-destructive' : ''}
              />
              <div className="flex justify-between">
                {errors.bio ? (
                  <p className="text-xs text-destructive">{errors.bio.message}</p>
                ) : (
                  <span />
                )}
                <p className="text-xs text-muted-foreground">{bioValue.length}/500</p>
              </div>
            </div>

            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}

            <Button
              type="submit"
              disabled={isPending}
              className="w-full gap-2"
              size="lg"
            >
              {isPending ? 'Creating your profile…' : 'Create seller profile'}
              {!isPending && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
