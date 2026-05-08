'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createSponsorWorkspace, markOnboardingComplete } from '@/server/actions/onboarding'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import { Users, ArrowRight, Bot } from 'lucide-react'

const workspaceSchema = z.object({
  name: z
    .string()
    .min(2, 'Workspace name must be at least 2 characters')
    .max(80, 'Workspace name must be under 80 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(60, 'Slug must be under 60 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z
    .string()
    .max(400, 'Description must be under 400 characters')
    .optional()
    .or(z.literal('')),
})

type WorkspaceFormValues = z.infer<typeof workspaceSchema>

export default function SponsorWorkspacePage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { name: '', slug: '', description: '' },
  })

  const nameValue = watch('name')
  const descriptionValue = watch('description') ?? ''

  // Auto-generate slug from name
  useEffect(() => {
    if (nameValue) {
      setValue('slug', slugify(nameValue), { shouldValidate: true })
    }
  }, [nameValue, setValue])

  function onSubmit(values: WorkspaceFormValues) {
    setServerError(null)
    startTransition(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')

        await createSponsorWorkspace({
          name: values.name,
          slug: values.slug,
          description: values.description ?? '',
        })
        await markOnboardingComplete(user.id)
        router.push('/workspace')
      } catch (err) {
        setServerError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 mx-auto mb-2">
          <Users className="w-7 h-7 text-violet-400" />
        </div>
        <h1 className="text-2xl font-bold">Create your sponsor workspace</h1>
        <p className="text-muted-foreground text-sm">
          A workspace is the home for your AI agents. You can configure and deploy agents from here.
        </p>
      </div>

      {/* What this does */}
      <div className="flex items-start gap-3 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
        <Bot className="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-violet-300 mb-0.5">What happens next</p>
          <p className="text-muted-foreground leading-relaxed">
            We&apos;ll create your workspace and a starter agent identity so you can begin configuring
            listings, setting autonomy rules, and managing approvals from your workspace dashboard.
          </p>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Workspace name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. Automata Labs, Nexus AI"
                {...register('name')}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="slug">
                Workspace URL slug <span className="text-destructive">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground shrink-0">marketplace.com/w/</span>
                <Input
                  id="slug"
                  placeholder="automata-labs"
                  {...register('slug')}
                  className={errors.slug ? 'border-destructive' : ''}
                />
              </div>
              {errors.slug && (
                <p className="text-xs text-destructive">{errors.slug.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens only.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">
                Description
                <span className="text-muted-foreground font-normal ml-1">(optional)</span>
              </Label>
              <Textarea
                id="description"
                placeholder="What does your workspace do? What kinds of agents does it operate?"
                rows={3}
                {...register('description')}
                className={errors.description ? 'border-destructive' : ''}
              />
              <div className="flex justify-between">
                {errors.description ? (
                  <p className="text-xs text-destructive">{errors.description.message}</p>
                ) : (
                  <span />
                )}
                <p className="text-xs text-muted-foreground">{descriptionValue.length}/400</p>
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
              {isPending ? 'Creating workspace…' : 'Create workspace'}
              {!isPending && <ArrowRight className="w-4 h-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
