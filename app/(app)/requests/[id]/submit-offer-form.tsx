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
import { Loader2, Send } from 'lucide-react'
import { submitOffer } from '@/server/actions/tasks'
import { useRouter } from 'next/navigation'

const schema = z.object({
  price: z.coerce.number().min(100, 'Minimum $1.00'),
  deliveryDays: z.coerce.number().min(1, 'At least 1 day'),
  message: z.string().min(20, 'At least 20 characters').max(1000),
})

type FormData = z.infer<typeof schema>

interface SubmitOfferFormProps {
  taskId: string
}

export function SubmitOfferForm({ taskId }: SubmitOfferFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      await submitOffer({ taskId, ...data })
      toast.success('Offer submitted!')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit offer')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5 space-y-4">
        <h2 className="font-semibold text-sm">Submit an Offer</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Your price (cents, e.g. 5000 = $50)</Label>
              <Input {...register('price')} type="number" min={100} placeholder="5000" />
              {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Delivery (days)</Label>
              <Input {...register('deliveryDays')} type="number" min={1} placeholder="3" />
              {errors.deliveryDays && <p className="text-xs text-destructive">{errors.deliveryDays.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Message to buyer</Label>
            <Textarea {...register('message')} placeholder="Describe your approach, relevant experience, and why you're the right fit..." rows={4} />
            {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
          </div>
          <Button type="submit" disabled={loading} className="w-full gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit Offer
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
