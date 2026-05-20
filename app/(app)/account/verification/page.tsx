import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, CheckCircle, Clock, XCircle, Zap, Star, Infinity } from 'lucide-react'
import { StartVerificationButton } from './start-verification-button'
import { CancelVerificationButton } from './cancel-verification-button'
import {
  VERIFICATION_FREE_SLOTS,
  VERIFICATION_LIFETIME_SLOTS,
  VERIFICATION_MONTHLY_USD,
} from '@/lib/constants'

export default async function VerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; tier?: string }>
}) {
  const { success, tier: successTier } = await searchParams

  const supabase = await createClient()
  const serviceClient = await createServiceClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  type IdentityRow = {
    id: string
    display_name: string
    verification_status: string
    verification_tier: string | null
    verification_subscription_status: string | null
  }

  const { data: rawIdentity } = await supabase
    .from('seller_identities')
    .select('id, display_name, verification_status, verification_tier, verification_subscription_status')
    .eq('account_id', user.id)
    .limit(1)
    .single()
  const identity = rawIdentity as IdentityRow | null

  // Current slot count (to show which tier is active for new signups)
  const { data: counterRow } = await serviceClient
    .from('verification_slot_counter')
    .select('total_initiated')
    .eq('id', 1)
    .single()
  const totalInitiated = (counterRow as { total_initiated: number } | null)?.total_initiated ?? 0

  const slotsUsed = totalInitiated
  const freeRemaining = Math.max(0, VERIFICATION_FREE_SLOTS - slotsUsed)
  const lifetimeRemaining = Math.max(
    0,
    VERIFICATION_FREE_SLOTS + VERIFICATION_LIFETIME_SLOTS - slotsUsed
  )

  // Which tier would a new signup get right now?
  const currentTierForNewSignup =
    slotsUsed < VERIFICATION_FREE_SLOTS
      ? 'free'
      : slotsUsed < VERIFICATION_FREE_SLOTS + VERIFICATION_LIFETIME_SLOTS
        ? 'lifetime'
        : 'subscription'

  if (!identity) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center text-muted-foreground">
        <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <h1 className="text-lg font-bold text-foreground mb-2">No seller profile yet</h1>
        <p className="text-sm">Set up a seller identity before requesting verification.</p>
      </div>
    )
  }

  const status = identity.verification_status
  const isSubscriptionCanceling =
    identity.verification_tier === 'subscription' &&
    identity.verification_subscription_status === 'canceled'

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> Seller Verification
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Verified sellers get a shield badge on their profile and listings.
        </p>
      </div>

      {/* Success banner */}
      {success === 'true' && (
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-sm text-green-400 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {successTier === 'free'
            ? 'Verification submitted — free spot claimed! Our team will review within 1–2 business days.'
            : successTier === 'lifetime'
              ? 'Payment received — lifetime spot confirmed. Our team will review within 1–2 business days.'
              : 'Subscription active — our team will review within 1–2 business days.'}
        </div>
      )}

      {/* Current status card */}
      <Card className="bg-card border-border">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{identity.display_name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Your seller identity</p>
            </div>
            {status === 'approved' && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Verified
              </Badge>
            )}
            {status === 'pending' && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1">
                <Clock className="w-3.5 h-3.5" /> Under review
              </Badge>
            )}
            {(status === 'none' || status === 'rejected' || !status) && (
              <Badge variant="outline" className="text-muted-foreground gap-1">
                <XCircle className="w-3.5 h-3.5" /> Not verified
              </Badge>
            )}
          </div>

          {status === 'approved' && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-400">
              Your seller identity is verified.
              {identity.verification_tier === 'free' && ' You claimed a free early-access spot.'}
              {identity.verification_tier === 'lifetime' && ' You hold a lifetime verified spot.'}
              {identity.verification_tier === 'subscription' && !isSubscriptionCanceling && ' Active monthly subscription.'}
              {isSubscriptionCanceling && ' Your subscription is cancelled — badge stays active until the end of this billing period.'}
            </div>
          )}

          {status === 'pending' && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400">
              Your verification request is being reviewed. This typically takes 1–2 business days.
            </div>
          )}

          {(status === 'none' || status === 'rejected' || !status) && (
            <div className="space-y-4">
              {status === 'rejected' && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                  Your previous request was not approved. You can submit a new one below.
                </div>
              )}
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">What you get with verification:</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Shield badge on your profile and all listings</li>
                  <li>Higher placement in search results</li>
                  <li>Access to verified-only task requests</li>
                  <li>Increased buyer trust</li>
                </ul>
              </div>
              <StartVerificationButton
                sellerIdentityId={identity.id}
                currentTier={currentTierForNewSignup}
                freeRemaining={freeRemaining}
                lifetimeRemaining={lifetimeRemaining}
                monthlyPrice={VERIFICATION_MONTHLY_USD}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tier pricing table */}
      {(status === 'none' || status === 'rejected' || !status) && (
        <Card className="bg-card border-border">
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-semibold">Pricing tiers</p>
            <div className="space-y-2">
              <div className={`flex items-center justify-between p-3 rounded-lg text-sm ${currentTierForNewSignup === 'free' ? 'bg-primary/10 border border-primary/20' : 'bg-secondary/30'}`}>
                <div className="flex items-center gap-2">
                  <Zap className={`w-4 h-4 ${currentTierForNewSignup === 'free' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={currentTierForNewSignup === 'free' ? 'font-medium' : 'text-muted-foreground line-through'}>
                    Free — first {VERIFICATION_FREE_SLOTS} spots
                  </span>
                  {currentTierForNewSignup === 'free' && <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">Active now</Badge>}
                  {currentTierForNewSignup !== 'free' && <Badge variant="outline" className="text-[10px] text-muted-foreground">Filled</Badge>}
                </div>
                <span className={currentTierForNewSignup === 'free' ? 'font-semibold' : 'text-muted-foreground'}>$0</span>
              </div>

              <div className={`flex items-center justify-between p-3 rounded-lg text-sm ${currentTierForNewSignup === 'lifetime' ? 'bg-primary/10 border border-primary/20' : 'bg-secondary/30'}`}>
                <div className="flex items-center gap-2">
                  <Infinity className={`w-4 h-4 ${currentTierForNewSignup === 'lifetime' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={currentTierForNewSignup === 'subscription' ? 'text-muted-foreground line-through' : currentTierForNewSignup === 'lifetime' ? 'font-medium' : 'text-muted-foreground'}>
                    Lifetime — next {VERIFICATION_LIFETIME_SLOTS} spots
                  </span>
                  {currentTierForNewSignup === 'lifetime' && <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">Active now</Badge>}
                  {currentTierForNewSignup === 'subscription' && <Badge variant="outline" className="text-[10px] text-muted-foreground">Filled</Badge>}
                  {currentTierForNewSignup === 'free' && <span className="text-xs text-muted-foreground">{lifetimeRemaining} left</span>}
                </div>
                <span className={currentTierForNewSignup === 'lifetime' ? 'font-semibold' : 'text-muted-foreground'}>$49 once</span>
              </div>

              <div className={`flex items-center justify-between p-3 rounded-lg text-sm ${currentTierForNewSignup === 'subscription' ? 'bg-primary/10 border border-primary/20' : 'bg-secondary/30'}`}>
                <div className="flex items-center gap-2">
                  <Star className={`w-4 h-4 ${currentTierForNewSignup === 'subscription' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={currentTierForNewSignup === 'subscription' ? 'font-medium' : 'text-muted-foreground'}>
                    Monthly — unlimited spots
                  </span>
                  {currentTierForNewSignup === 'subscription' && <Badge className="text-[10px] bg-primary/20 text-primary border-primary/30">Active now</Badge>}
                </div>
                <span className={currentTierForNewSignup === 'subscription' ? 'font-semibold' : 'text-muted-foreground'}>
                  ${(VERIFICATION_MONTHLY_USD / 100).toFixed(0)}/mo
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manage subscription — for approved monthly subscribers */}
      {status === 'approved' && identity.verification_tier === 'subscription' && !isSubscriptionCanceling && (
        <Card className="bg-card border-border">
          <CardContent className="p-5 space-y-3">
            <p className="text-sm font-semibold">Manage subscription</p>
            <p className="text-xs text-muted-foreground">
              Your verified badge is kept active by a monthly subscription at ${(VERIFICATION_MONTHLY_USD / 100).toFixed(0)}/month.
              You can cancel at any time — your badge stays active until the end of the current billing period.
            </p>
            <CancelVerificationButton
              sellerIdentityId={identity.id}
              tier="subscription"
              label="Cancel subscription"
            />
          </CardContent>
        </Card>
      )}

      {/* Remove badge — for free or lifetime verified sellers */}
      {status === 'approved' && (identity.verification_tier === 'free' || identity.verification_tier === 'lifetime') && (
        <div className="text-center">
          <CancelVerificationButton
            sellerIdentityId={identity.id}
            tier={identity.verification_tier as 'free' | 'lifetime'}
            label="Remove verified badge"
            variant="ghost"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {identity.verification_tier === 'lifetime'
              ? 'No refunds for lifetime spots. Removal is permanent.'
              : 'Your free spot will be released.'}
          </p>
        </div>
      )}
    </div>
  )
}
