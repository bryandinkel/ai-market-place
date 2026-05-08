import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, DollarSign, Clock, CheckCircle } from 'lucide-react'
import { formatPrice, formatRelativeTime, getInitials } from '@/lib/utils'
import { CATEGORIES } from '@/lib/constants'
import { SubmitOfferForm } from './submit-offer-form'

const SELLER_TYPE_LABELS: Record<string, string> = {
  agent: 'Agent preferred',
  hybrid: 'Hybrid team preferred',
  human: 'Human preferred',
  best_available: 'Open to all',
}

interface RequestDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function RequestDetailPage({ params }: RequestDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: task } = await supabase
    .from('tasks')
    .select('*, profiles!buyer_id(display_name, avatar_url)')
    .eq('id', id)
    .single()

  if (!task) notFound()

  // Current user's seller identity
  const { data: identity } = await supabase
    .from('seller_identities')
    .select('id')
    .eq('account_id', user.id)
    .limit(1)
    .maybeSingle()

  // Check if user already submitted an offer
  const { data: existingOffer } = identity
    ? await supabase
        .from('task_offers')
        .select('id, status, price, delivery_days')
        .eq('task_id', id)
        .eq('seller_identity_id', identity.id)
        .maybeSingle()
    : { data: null }

  // All offers (only shown to task owner)
  const isOwner = task.buyer_id === user.id
  const { data: offers } = isOwner
    ? await supabase
        .from('task_offers')
        .select('id, price, delivery_days, message, status, created_at, seller_identities(display_name, avatar_url, slug)')
        .eq('task_id', id)
        .order('created_at', { ascending: false })
    : { data: null }

  const buyer = task.profiles as { display_name: string; avatar_url: string } | null
  const category = CATEGORIES.find(c => c.slug === task.category_id)
  const canSubmitOffer = identity && !isOwner && !existingOffer && task.status === 'open'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Task header */}
      <Card className="bg-card border-border">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-xl font-bold">{task.title}</h1>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 shrink-0">
              {task.status}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed">{task.description}</p>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <DollarSign className="w-4 h-4 text-primary" />
              Budget: {formatPrice(task.budget)}
            </div>
            {task.deadline && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Deadline: {new Date(task.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {category && <Badge variant="secondary">{category.name}</Badge>}
            <Badge variant="outline" className="text-muted-foreground">
              {SELLER_TYPE_LABELS[task.preferred_seller_type] ?? task.preferred_seller_type}
            </Badge>
            {task.is_verified_only && (
              <Badge variant="outline" className="text-primary border-primary/30">Verified sellers only</Badge>
            )}
            <Badge variant="outline" className="text-muted-foreground">
              {task.offer_mode === 'receive_offers' ? 'Accepting offers' : 'Direct hire only'}
            </Badge>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Avatar className="h-7 w-7 rounded-full">
              <AvatarImage src={buyer?.avatar_url} />
              <AvatarFallback className="text-xs bg-muted">{getInitials(buyer?.display_name || 'B')}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">
              Posted by <span className="text-foreground">{buyer?.display_name}</span> · {formatRelativeTime(task.created_at)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Existing offer notice */}
      {existingOffer && (
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>You submitted an offer for <strong>{formatPrice(existingOffer.price)}</strong> · {existingOffer.delivery_days}d delivery</span>
              <Badge variant="outline" className={existingOffer.status === 'accepted' ? 'text-green-400 border-green-500/30' : 'text-muted-foreground'}>
                {existingOffer.status}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit offer form */}
      {canSubmitOffer && task.offer_mode === 'receive_offers' && (
        <SubmitOfferForm taskId={id} />
      )}

      {!identity && !isOwner && (
        <Card className="bg-card border-border">
          <CardContent className="p-5 text-sm text-muted-foreground">
            You need a seller identity to submit offers. <Link href="/onboarding/seller" className="text-primary hover:underline">Set up your seller profile →</Link>
          </CardContent>
        </Card>
      )}

      {/* Offers (owner only) */}
      {isOwner && offers && offers.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm">{offers.length} Offer{offers.length !== 1 ? 's' : ''}</h2>
          {offers.map(offer => {
            const seller = offer.seller_identities as Record<string, string> | null
            return (
              <Card key={offer.id} className="bg-card border-border">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 rounded-lg">
                        <AvatarImage src={seller?.avatar_url} />
                        <AvatarFallback className="rounded-lg bg-violet-500/20 text-violet-400 text-xs">
                          {getInitials(seller?.display_name || 'S')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{seller?.display_name}</p>
                        <p className="text-xs text-muted-foreground">{formatRelativeTime(offer.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">{formatPrice(offer.price)}</p>
                      <p className="text-xs text-muted-foreground">{offer.delivery_days}d delivery</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{offer.message}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={offer.status === 'accepted' ? 'text-green-400 border-green-500/30' : 'text-muted-foreground'}>
                      {offer.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {isOwner && offers?.length === 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-5 text-center text-muted-foreground">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No offers yet — check back soon</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
