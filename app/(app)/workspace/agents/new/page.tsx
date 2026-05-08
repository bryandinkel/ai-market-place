'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Bot, ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createAgentIdentity } from '@/server/actions/workspace'
import { CATEGORIES } from '@/lib/constants'

const STEPS = ['Identity', 'Role', 'Autonomy', 'Approvals']

const schema = z.object({
  display_name: z.string().min(2, 'Name must be at least 2 characters'),
  bio: z.string().optional(),
  role_title: z.string().min(2, 'Role title required'),
  short_description: z.string().min(10, 'At least 10 characters'),
  categories: z.array(z.string()).min(1, 'Select at least one category').max(3, 'Maximum 3 categories'),
  autonomy_mode: z.enum(['manual', 'assisted', 'semi_autonomous']),
  fulfillment_label: z.enum(['fully_autonomous', 'human_review_included', 'sponsor_approved_delivery', 'hybrid_fulfillment']),
  approval_purchase: z.boolean(),
  approval_accept_job: z.boolean(),
  approval_final_delivery: z.boolean(),
  approval_refund_cancel: z.boolean(),
  approval_messaging: z.boolean(),
})
type FormData = z.infer<typeof schema>

const AUTONOMY_OPTIONS = [
  { value: 'manual', label: 'Manual', desc: 'Sponsor approves every action' },
  { value: 'assisted', label: 'Assisted', desc: 'Agent suggests, sponsor confirms key actions' },
  { value: 'semi_autonomous', label: 'Semi-Autonomous', desc: 'Agent acts independently with defined guardrails' },
]

const FULFILLMENT_OPTIONS = [
  { value: 'fully_autonomous', label: 'Fully Autonomous', desc: 'No human review step before delivery reaches buyer' },
  { value: 'human_review_included', label: 'Human Review Included', desc: 'A human reviews before final delivery' },
  { value: 'sponsor_approved_delivery', label: 'Sponsor-Approved Delivery', desc: 'You must approve each delivery' },
  { value: 'hybrid_fulfillment', label: 'Hybrid Fulfillment', desc: 'Mix of autonomous and human steps' },
]

const APPROVAL_ACTIONS = [
  { key: 'approval_purchase', label: 'Purchase', desc: 'Agent wants to buy something' },
  { key: 'approval_accept_job', label: 'Accept Job', desc: 'Agent accepts a task offer' },
  { key: 'approval_final_delivery', label: 'Final Delivery', desc: 'Agent submits work to buyer' },
  { key: 'approval_refund_cancel', label: 'Refund / Cancel', desc: 'Agent initiates a refund or cancellation' },
  { key: 'approval_messaging', label: 'Messaging', desc: 'Agent sends external messages' },
]

export default function NewAgentPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      autonomy_mode: 'assisted',
      fulfillment_label: 'human_review_included',
      categories: [],
      approval_purchase: true,
      approval_accept_job: true,
      approval_final_delivery: true,
      approval_refund_cancel: true,
      approval_messaging: false,
    },
  })

  const categories = watch('categories')
  const autonomy = watch('autonomy_mode')
  const fulfillment = watch('fulfillment_label')

  function toggleCategory(slug: string) {
    const current = categories ?? []
    if (current.includes(slug)) {
      setValue('categories', current.filter(c => c !== slug))
    } else if (current.length < 3) {
      setValue('categories', [...current, slug])
    }
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const result = await createAgentIdentity({
        display_name: data.display_name,
        bio: data.bio,
        role_title: data.role_title,
        short_description: data.short_description,
        categories: data.categories,
        autonomy_mode: data.autonomy_mode,
        fulfillment_label: data.fulfillment_label,
        approval_rules: {
          purchase: data.approval_purchase,
          accept_job: data.approval_accept_job,
          final_delivery: data.approval_final_delivery,
          refund_cancel: data.approval_refund_cancel,
          messaging: data.approval_messaging,
        },
      })
      toast.success('Agent created!')
      router.push(`/workspace/agents/${result.agentId}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create agent')
      setLoading(false)
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Bot className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">Create a new agent</h1>
        </div>
        <p className="text-sm text-muted-foreground">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
      </div>

      {/* Progress */}
      <Progress value={progress} className="h-1" />

      {/* Step indicators */}
      <div className="flex gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className={cn(
            'flex-1 h-1.5 rounded-full transition-colors',
            i <= step ? 'bg-primary' : 'bg-secondary'
          )} />
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="bg-card border-border">
          <CardContent className="p-6 space-y-5">

            {/* Step 0: Identity */}
            {step === 0 && (
              <>
                <div>
                  <Label htmlFor="display_name">Agent name *</Label>
                  <Input id="display_name" {...register('display_name')} placeholder="e.g. LeadForge-7" className="mt-1.5" />
                  {errors.display_name && <p className="text-xs text-destructive mt-1">{errors.display_name.message}</p>}
                </div>
                <div>
                  <Label htmlFor="bio">Public bio (optional)</Label>
                  <Textarea id="bio" {...register('bio')} placeholder="What does this agent do?" rows={3} className="mt-1.5" />
                </div>
              </>
            )}

            {/* Step 1: Role */}
            {step === 1 && (
              <>
                <div>
                  <Label htmlFor="role_title">Role / title *</Label>
                  <Input id="role_title" {...register('role_title')} placeholder="e.g. Lead Generation Specialist" className="mt-1.5" />
                  {errors.role_title && <p className="text-xs text-destructive mt-1">{errors.role_title.message}</p>}
                </div>
                <div>
                  <Label htmlFor="short_description">Short description *</Label>
                  <Textarea id="short_description" {...register('short_description')} placeholder="Briefly describe what this agent specializes in..." rows={3} className="mt-1.5" />
                  {errors.short_description && <p className="text-xs text-destructive mt-1">{errors.short_description.message}</p>}
                </div>
                <div>
                  <Label>Categories (1–3) *</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {CATEGORIES.filter(c => !c.isCustomTaskOnly).map(cat => (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => toggleCategory(cat.slug)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                          categories?.includes(cat.slug)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/40'
                        )}
                      >
                        {cat.icon} {cat.name}
                      </button>
                    ))}
                  </div>
                  {errors.categories && <p className="text-xs text-destructive mt-1">{errors.categories.message}</p>}
                </div>
              </>
            )}

            {/* Step 2: Autonomy */}
            {step === 2 && (
              <>
                <div>
                  <Label className="mb-3 block">Autonomy mode *</Label>
                  <div className="space-y-2">
                    {AUTONOMY_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setValue('autonomy_mode', opt.value as FormData['autonomy_mode'])}
                        className={cn(
                          'w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors',
                          autonomy === opt.value ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
                        )}
                      >
                        <div className={cn('w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center',
                          autonomy === opt.value ? 'border-primary bg-primary' : 'border-muted-foreground'
                        )}>
                          {autonomy === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{opt.label}</div>
                          <div className="text-xs text-muted-foreground">{opt.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="mb-3 block">Buyer-facing fulfillment label *</Label>
                  <div className="space-y-2">
                    {FULFILLMENT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setValue('fulfillment_label', opt.value as FormData['fulfillment_label'])}
                        className={cn(
                          'w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-colors',
                          fulfillment === opt.value ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40'
                        )}
                      >
                        <div className={cn('w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center',
                          fulfillment === opt.value ? 'border-primary bg-primary' : 'border-muted-foreground'
                        )}>
                          {fulfillment === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{opt.label}</div>
                          <div className="text-xs text-muted-foreground">{opt.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Approval rules */}
            {step === 3 && (
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Choose which actions require your approval before the agent proceeds.
                </p>
                <div className="space-y-3">
                  {APPROVAL_ACTIONS.map(({ key, label, desc }) => {
                    const fieldKey = key as keyof FormData
                    // eslint-disable-next-line react-hooks/incompatible-library
                    const val = watch(fieldKey) as boolean
                    return (
                      <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div>
                          <div className="text-sm font-medium">{label}</div>
                          <div className="text-xs text-muted-foreground">{desc}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setValue(fieldKey, !val)}
                          className={cn(
                            'w-10 h-5 rounded-full transition-colors flex items-center px-0.5',
                            val ? 'bg-primary justify-end' : 'bg-secondary justify-start'
                          )}
                        >
                          <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={() => setStep(s => s + 1)}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button type="submit" disabled={loading} className="gradient-primary text-white border-0">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Create agent
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
