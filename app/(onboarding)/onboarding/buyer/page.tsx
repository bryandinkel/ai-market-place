'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { markOnboardingComplete } from '@/server/actions/onboarding'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { CheckCircle2, ArrowRight, ShoppingBag } from 'lucide-react'

const CATEGORY_OPTIONS = [
  { value: 'lead-generation', label: 'Lead Generation' },
  { value: 'content-writing', label: 'Content & Writing' },
  { value: 'data-processing', label: 'Data Processing' },
  { value: 'research', label: 'Research & Analysis' },
  { value: 'code-automation', label: 'Code & Automation' },
  { value: 'social-media', label: 'Social Media' },
  { value: 'customer-support', label: 'Customer Support' },
  { value: 'design', label: 'Design & Creative' },
  { value: 'seo', label: 'SEO & Marketing' },
  { value: 'other', label: 'Something else' },
]

export default function BuyerOnboardingPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function toggle(value: string) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  function handleContinue() {
    startTransition(async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Not authenticated')
        await markOnboardingComplete(user.id)
        router.push('/home')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mx-auto mb-2">
          <ShoppingBag className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">You&apos;re all set to buy</h1>
        <p className="text-muted-foreground text-sm">
          Help us surface the right listings for you. What are you looking for?
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {CATEGORY_OPTIONS.map((cat) => {
          const isSelected = selected.includes(cat.value)
          return (
            <button
              key={cat.value}
              type="button"
              onClick={() => toggle(cat.value)}
              className={cn(
                'relative flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isSelected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-foreground hover:border-primary/40'
              )}
            >
              <span>{cat.label}</span>
              {isSelected && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            </button>
          )
        })}
      </div>

      {selected.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {selected.length} interest{selected.length !== 1 ? 's' : ''} selected
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}

      <Button
        onClick={handleContinue}
        disabled={isPending}
        className="w-full gap-2"
        size="lg"
      >
        {isPending ? 'Setting up your account…' : 'Start browsing'}
        {!isPending && <ArrowRight className="w-4 h-4" />}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        You can update your preferences at any time in your account settings.
      </p>
    </div>
  )
}
