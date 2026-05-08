'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
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
import { Loader2, Plus, X, Package, Upload, CheckCircle2, FileText } from 'lucide-react'
import { createProductListing, saveProductFile } from '@/server/actions/listings'
import { uploadProductFile } from '@/lib/upload'
import { CATEGORIES } from '@/lib/constants'

const schema = z.object({
  title: z.string().min(5, 'At least 5 characters').max(100),
  description: z.string().min(20, 'At least 20 characters').max(2000),
  categoryId: z.string(),
  priceMin: z.coerce.number().min(100, 'Minimum $1.00'),
  version: z.string().optional(),
  usageNotes: z.string().optional(),
  instantDelivery: z.boolean().default(true),
})

type FormData = {
  title: string
  description: string
  categoryId: string
  priceMin: number
  version?: string
  usageNotes?: string
  instantDelivery: boolean
}

export default function CreateProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [fileTypes, setFileTypes] = useState<string[]>([])
  const [fileTypeInput, setFileTypeInput] = useState('')
  // Upload state
  const [step, setStep] = useState<'details' | 'upload'>('details')
  const [listingId, setListingId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: { instantDelivery: true },
  })

  const instantDelivery = watch('instantDelivery')

  function addTag() {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t) && tags.length < 8) {
      setTags(prev => [...prev, t])
      setTagInput('')
    }
  }

  function addFileType() {
    const t = fileTypeInput.trim().toLowerCase()
    if (t && !fileTypes.includes(t)) {
      setFileTypes(prev => [...prev, t])
      setFileTypeInput('')
    }
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const result = await createProductListing({ ...data, tags, fileTypes })
      setListingId(result.listingId)
      setStep('upload')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create listing')
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload() {
    if (!selectedFile || !listingId) return
    setUploading(true)
    try {
      const { storagePath, filename, fileSize } = await uploadProductFile(selectedFile, listingId)
      await saveProductFile(listingId, storagePath, filename, fileSize)
      toast.success('File uploaded — listing is now live!')
      router.push('/dashboard/seller')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function handleSkip() {
    toast.info('Listing saved as draft. Upload a file later from your dashboard.')
    router.push('/dashboard/seller')
  }

  // ── Step 2: File upload ──────────────────────────────────────────────────
  if (step === 'upload') {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Upload className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold">Upload your product file</h1>
          </div>
          <p className="text-sm text-muted-foreground">This is what buyers will download after purchase.</p>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-6 space-y-4">
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-primary" />
                  <div className="text-left">
                    <p className="font-medium text-sm">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-400 ml-2" />
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto" />
                  <p className="text-sm font-medium">Click to select file</p>
                  <p className="text-xs text-muted-foreground">Any file type up to 500MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={e => setSelectedFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex gap-3">
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="flex-1"
              >
                {uploading
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Uploading...</>
                  : <><Upload className="w-4 h-4 mr-2" />Upload & Publish</>
                }
              </Button>
              <Button variant="outline" onClick={handleSkip} disabled={uploading}>
                Skip for now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Step 1: Listing details ──────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Package className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">Create Digital Product</h1>
        </div>
        <p className="text-sm text-muted-foreground">Fill in the details, then upload your file.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic info */}
        <Card className="bg-card border-border">
          <CardContent className="p-5 space-y-4">
            <h2 className="font-semibold text-sm">Basic information</h2>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input {...register('title')} placeholder="e.g. GPT-4o Sales Email Prompt Pack" />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea {...register('description')} placeholder="Describe what buyers get, how to use it, and any requirements..." rows={5} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

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
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card className="bg-card border-border">
          <CardContent className="p-5 space-y-4">
            <h2 className="font-semibold text-sm">Pricing</h2>
            <div className="space-y-2">
              <Label>Price (in cents, e.g. 2500 = $25.00)</Label>
              <Input {...register('priceMin')} type="number" min={100} placeholder="2500" />
              {errors.priceMin && <p className="text-xs text-destructive">{errors.priceMin.message}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Product details */}
        <Card className="bg-card border-border">
          <CardContent className="p-5 space-y-4">
            <h2 className="font-semibold text-sm">Product details</h2>

            <div className="space-y-2">
              <Label>File types included</Label>
              <div className="flex gap-2">
                <Input
                  value={fileTypeInput}
                  onChange={e => setFileTypeInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFileType() } }}
                  placeholder="PDF, CSV, JSON..."
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm" onClick={addFileType}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {fileTypes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {fileTypes.map(ft => (
                    <Badge key={ft} variant="secondary" className="gap-1">
                      {ft.toUpperCase()}
                      <button type="button" onClick={() => setFileTypes(prev => prev.filter(x => x !== ft))}>
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Version <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input {...register('version')} placeholder="v1.0" />
            </div>

            <div className="space-y-2">
              <Label>Usage notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea {...register('usageNotes')} placeholder="Any setup instructions or requirements..." rows={3} />
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={instantDelivery}
                onCheckedChange={v => setValue('instantDelivery', v)}
              />
              <div>
                <Label>Instant delivery</Label>
                <p className="text-xs text-muted-foreground">Buyer can download immediately after purchase</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card className="bg-card border-border">
          <CardContent className="p-5 space-y-3">
            <h2 className="font-semibold text-sm">Tags <span className="text-muted-foreground font-normal">(up to 8)</span></h2>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="automation, gpt, prompt..."
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
          {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : 'Continue to file upload →'}
        </Button>
      </form>
    </div>
  )
}
