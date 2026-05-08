'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Loader2, Plus, X, Wrench, Trash2 } from 'lucide-react'
import { createServiceListing } from '@/server/actions/listings'
import { CATEGORIES } from '@/lib/constants'

const packageSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  price: z.coerce.number().min(100),
  turnaroundDays: z.coerce.number().min(1),
  revisions: z.coerce.number().min(0),
})

const addonSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  price: z.coerce.number().min(100),
})

const schema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(20).max(2000),
  categoryId: z.string(),
  pricingModel: z.enum(['fixed', 'package', 'custom_quote']),
  priceMin: z.coerce.number().min(100),
  turnaroundDays: z.coerce.number().min(1),
  revisionsIncluded: z.coerce.number().min(0),
  scope: z.string().optional(),
  proofOfWorkExpected: z.boolean().default(false),
  packages: z.array(packageSchema).default([]),
  addons: z.array(addonSchema).default([]),
})

type FormData = {
  title: string
  description: string
  categoryId: string
  pricingModel: 'fixed' | 'package' | 'custom_quote'
  priceMin: number
  turnaroundDays: number
  revisionsIncluded: number
  scope?: string
  proofOfWorkExpected: boolean
  packages: Array<{ name: string; description: string; price: number; turnaroundDays: number; revisions: number }>
  addons: Array<{ name: string; description: string; price: number }>
}

export default function CreateServicePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      pricingModel: 'fixed',
      proofOfWorkExpected: false,
      packages: [],
      addons: [],
    },
  })

  const pricingModel = watch('pricingModel')
  const proofOfWork = watch('proofOfWorkExpected')

  const { fields: packageFields, append: appendPackage, remove: removePackage } = useFieldArray({ control, name: 'packages' })
  const { fields: addonFields, append: appendAddon, remove: removeAddon } = useFieldArray({ control, name: 'addons' })

  function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t) && tags.length < 8) {
      setTags(prev => [...prev, t])
      setTagInput('')
    }
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await createServiceListing({ ...data, tags })
      toast.success('Draft saved!')
      router.push('/dashboard/seller')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Wrench className="w-5 h-5 text-violet-400" />
          <h1 className="text-xl font-bold">Create Service Listing</h1>
        </div>
        <p className="text-sm text-muted-foreground">Fill in the details — saved as a draft until you publish.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic info */}
        <Card className="bg-card border-border">
          <CardContent className="p-5 space-y-4">
            <h2 className="font-semibold text-sm">Basic information</h2>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input {...register('title')} placeholder="e.g. AI-Powered Lead List Generation" />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...register('description')} placeholder="Describe the service, methodology, and what buyers receive..." rows={5} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <select
                  {...register('categoryId')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map(c => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Pricing model</Label>
                <select
                  {...register('pricingModel')}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="fixed">Fixed price</option>
                  <option value="package">Package tiers</option>
                  <option value="custom_quote">Custom quote</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing & delivery */}
        <Card className="bg-card border-border">
          <CardContent className="p-5 space-y-4">
            <h2 className="font-semibold text-sm">Pricing & delivery</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Starting price (cents)</Label>
                <Input {...register('priceMin')} type="number" min={100} placeholder="5000" />
                {errors.priceMin && <p className="text-xs text-destructive">{errors.priceMin.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Turnaround (days)</Label>
                <Input {...register('turnaroundDays')} type="number" min={1} placeholder="3" />
              </div>
              <div className="space-y-2">
                <Label>Revisions included</Label>
                <Input {...register('revisionsIncluded')} type="number" min={0} placeholder="2" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Scope of work <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea {...register('scope')} placeholder="What's included, what's not, any prerequisites..." rows={3} />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={proofOfWork}
                onCheckedChange={v => setValue('proofOfWorkExpected', v)}
              />
              <div>
                <Label>Proof of work included</Label>
                <p className="text-xs text-muted-foreground">Delivery will include a structured proof-of-work card</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Packages (if package pricing) */}
        {pricingModel === 'package' && (
          <Card className="bg-card border-border">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm">Packages</h2>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendPackage({ name: '', description: '', price: 5000, turnaroundDays: 3, revisions: 1 })}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add package
                </Button>
              </div>
              {packageFields.map((field, i) => (
                <div key={field.id} className="p-4 rounded-lg bg-secondary/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Package {i + 1}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removePackage(i)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input {...register(`packages.${i}.name`)} placeholder="Name (e.g. Basic)" />
                    <Input {...register(`packages.${i}.price`)} type="number" placeholder="Price (cents)" />
                  </div>
                  <Input {...register(`packages.${i}.description`)} placeholder="What's included" />
                  <div className="grid grid-cols-2 gap-3">
                    <Input {...register(`packages.${i}.turnaroundDays`)} type="number" placeholder="Days" />
                    <Input {...register(`packages.${i}.revisions`)} type="number" placeholder="Revisions" />
                  </div>
                </div>
              ))}
              {packageFields.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Add at least one package tier</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Add-ons */}
        <Card className="bg-card border-border">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Add-ons <span className="text-muted-foreground font-normal">(optional)</span></h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendAddon({ name: '', description: '', price: 2000 })}
              >
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
            {addonFields.map((field, i) => (
              <div key={field.id} className="p-3 rounded-lg bg-secondary/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Add-on {i + 1}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeAddon(i)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input {...register(`addons.${i}.name`)} placeholder="Name" />
                  <Input {...register(`addons.${i}.price`)} type="number" placeholder="Price (cents)" />
                </div>
                <Input {...register(`addons.${i}.description`)} placeholder="Short description" />
              </div>
            ))}
            {addonFields.length === 0 && (
              <p className="text-sm text-muted-foreground">No add-ons yet</p>
            )}
          </CardContent>
        </Card>

        {/* Tags */}
        <Card className="bg-card border-border">
          <CardContent className="p-5 space-y-3">
            <h2 className="font-semibold text-sm">Tags</h2>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="leads, research, outreach..."
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <Badge key={tag} variant="outline" className="gap-1">
                    {tag}
                    <button type="button" onClick={() => setTags(prev => prev.filter(t => t !== tag))}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</> : 'Save as Draft'}
        </Button>
      </form>
    </div>
  )
}
