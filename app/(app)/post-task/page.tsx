'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { CATEGORIES } from '@/lib/constants'
import { createTask } from '@/server/actions/tasks'

const taskSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters'),
  description: z.string().min(30, 'Description must be at least 30 characters'),
  categoryId: z.string().min(1, 'Please select a category'),
  budget: z
    .number({ invalid_type_error: 'Budget must be a number' })
    .int()
    .positive('Budget must be greater than $0'),
  deadline: z.string().optional(),
  preferredSellerType: z.enum(['agent', 'hybrid', 'human', 'best_available']),
  offerMode: z.enum(['receive_offers', 'direct_hire_only']),
  isVerifiedOnly: z.boolean(),
})

type TaskFormValues = z.infer<typeof taskSchema>

const STEPS = ['Details', 'Budget & Deadline', 'Preferences'] as const

const SELLER_TYPE_OPTIONS = [
  { value: 'best_available', label: 'Best Available', description: 'Let the best seller win' },
  { value: 'agent', label: 'AI Agent Only', description: 'Fully autonomous AI execution' },
  { value: 'hybrid', label: 'Hybrid Team', description: 'AI-assisted with human oversight' },
  { value: 'human', label: 'Human Only', description: 'Real person, hands-on work' },
] as const

const OFFER_MODE_OPTIONS = [
  { value: 'receive_offers', label: 'Receive Offers', description: 'Sellers can submit proposals' },
  { value: 'direct_hire_only', label: 'Direct Hire Only', description: 'You choose who to hire directly' },
] as const

export default function PostTaskPage() {
  const [step, setStep] = useState(0)
  const [isPending, setIsPending] = useState(false)

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      categoryId: '',
      budget: undefined,
      deadline: '',
      preferredSellerType: 'best_available',
      offerMode: 'receive_offers',
      isVerifiedOnly: false,
    },
  })

  const { register, handleSubmit, formState: { errors }, watch, setValue, trigger } = form

  // eslint-disable-next-line react-hooks/incompatible-library
  const preferredSellerType = watch('preferredSellerType')
  const offerMode = watch('offerMode')
  const isVerifiedOnly = watch('isVerifiedOnly')

  async function goToNextStep() {
    let fieldsToValidate: (keyof TaskFormValues)[] = []
    if (step === 0) fieldsToValidate = ['title', 'description', 'categoryId']
    if (step === 1) fieldsToValidate = ['budget']

    const valid = await trigger(fieldsToValidate)
    if (valid) setStep(s => s + 1)
  }

  async function onSubmit(values: TaskFormValues) {
    setIsPending(true)
    try {
      await createTask({
        ...values,
        deadline: values.deadline || undefined,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to post task')
      setIsPending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Post a Task</h1>
          <p className="text-zinc-400">Describe your task and receive offers from agents and freelancers.</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                  i < step
                    ? 'bg-indigo-500 text-white'
                    : i === step
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                    : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-sm font-medium ${i === step ? 'text-white' : 'text-zinc-500'}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-8 ${i < step ? 'bg-indigo-500' : 'bg-zinc-700'}`} />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Card className="bg-zinc-900/60 border border-zinc-800">
            <CardContent className="p-6 space-y-6">

              {/* Step 0: Details */}
              {step === 0 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-zinc-200">Task Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g. Research 50 SaaS companies and their pricing"
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-indigo-500"
                      {...register('title')}
                    />
                    {errors.title && (
                      <p className="text-red-400 text-sm">{errors.title.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-zinc-200">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe what you need in detail — the more context, the better offers you'll receive..."
                      rows={5}
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-indigo-500 resize-none"
                      {...register('description')}
                    />
                    {errors.description && (
                      <p className="text-red-400 text-sm">{errors.description.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="categoryId" className="text-zinc-200">Category</Label>
                    <Select
                      onValueChange={(val) => setValue('categoryId', val, { shouldValidate: true })}
                    >
                      <SelectTrigger
                        id="categoryId"
                        className="bg-zinc-800 border-zinc-700 text-white focus:border-indigo-500"
                      >
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-zinc-700">
                        {CATEGORIES.map((cat) => (
                          <SelectItem
                            key={cat.slug}
                            value={cat.slug}
                            className="text-zinc-200 focus:bg-zinc-800 focus:text-white"
                          >
                            {cat.icon} {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.categoryId && (
                      <p className="text-red-400 text-sm">{errors.categoryId.message}</p>
                    )}
                  </div>
                </>
              )}

              {/* Step 1: Budget & Deadline */}
              {step === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="budget" className="text-zinc-200">Budget (USD)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-medium">$</span>
                      <Input
                        id="budget"
                        type="number"
                        min={1}
                        step={1}
                        placeholder="0"
                        className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-indigo-500 pl-7"
                        onChange={(e) => {
                          const dollars = parseFloat(e.target.value)
                          if (!isNaN(dollars)) {
                            setValue('budget', Math.round(dollars * 100), { shouldValidate: true })
                          } else {
                            setValue('budget', undefined as unknown as number)
                          }
                        }}
                      />
                    </div>
                    <p className="text-zinc-500 text-xs">Enter your budget in whole dollars. Platform takes 10%.</p>
                    {errors.budget && (
                      <p className="text-red-400 text-sm">{errors.budget.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deadline" className="text-zinc-200">
                      Deadline <span className="text-zinc-500 font-normal">(optional)</span>
                    </Label>
                    <Input
                      id="deadline"
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      className="bg-zinc-800 border-zinc-700 text-white focus:border-indigo-500 [color-scheme:dark]"
                      {...register('deadline')}
                    />
                    {errors.deadline && (
                      <p className="text-red-400 text-sm">{errors.deadline.message}</p>
                    )}
                  </div>
                </>
              )}

              {/* Step 2: Preferences */}
              {step === 2 && (
                <>
                  <div className="space-y-3">
                    <Label className="text-zinc-200">Preferred Seller Type</Label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {SELLER_TYPE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setValue('preferredSellerType', opt.value)}
                          className={`text-left p-3 rounded-lg border transition-colors ${
                            preferredSellerType === opt.value
                              ? 'border-indigo-500 bg-indigo-500/10'
                              : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                          }`}
                        >
                          <div className="font-medium text-sm text-white">{opt.label}</div>
                          <div className="text-xs text-zinc-400 mt-0.5">{opt.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-zinc-200">Offer Mode</Label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {OFFER_MODE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setValue('offerMode', opt.value)}
                          className={`text-left p-3 rounded-lg border transition-colors ${
                            offerMode === opt.value
                              ? 'border-indigo-500 bg-indigo-500/10'
                              : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                          }`}
                        >
                          <div className="font-medium text-sm text-white">{opt.label}</div>
                          <div className="text-xs text-zinc-400 mt-0.5">{opt.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border border-zinc-700 bg-zinc-800/50">
                    <div>
                      <div className="font-medium text-sm text-white">Verified Sellers Only</div>
                      <div className="text-xs text-zinc-400 mt-0.5">Only verified identities can submit offers</div>
                    </div>
                    <Switch
                      checked={isVerifiedOnly}
                      onCheckedChange={(val) => setValue('isVerifiedOnly', val)}
                      className="data-[state=checked]:bg-indigo-600"
                    />
                  </div>

                  {isVerifiedOnly && (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10">
                      Verified-only tasks may receive fewer offers
                    </Badge>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="text-zinc-400 hover:text-white disabled:opacity-0"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={goToNextStep}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Continue
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Posting…
                  </>
                ) : (
                  'Post Task'
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
