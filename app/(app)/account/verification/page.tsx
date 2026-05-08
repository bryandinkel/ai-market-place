import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, CheckCircle, Clock, XCircle } from 'lucide-react'
import { StartVerificationButton } from './start-verification-button'

export default async function VerificationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  type IdentityRow = { id: string; display_name: string; verification_status: string }
  const { data: rawIdentity } = await supabase
    .from('seller_identities')
    .select('id, display_name, verification_status')
    .eq('account_id', user.id)
    .limit(1)
    .single()
  const identity = rawIdentity as IdentityRow | null

  if (!identity) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center text-muted-foreground">
        <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <h1 className="text-lg font-bold text-foreground mb-2">No seller profile yet</h1>
        <p className="text-sm">Set up a seller identity before requesting verification.</p>
      </div>
    )
  }

  const status = identity.verification_status as string

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
            {(status === 'none' || status === 'rejected') && (
              <Badge variant="outline" className="text-muted-foreground gap-1">
                <XCircle className="w-3.5 h-3.5" /> Not verified
              </Badge>
            )}
          </div>

          {status === 'approved' && (
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-400">
              Your seller identity is verified. The shield badge is now visible on your profile and listings.
            </div>
          )}

          {status === 'pending' && (
            <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400">
              Your verification request is being reviewed by our team. This typically takes 1–2 business days.
            </div>
          )}

          {(status === 'none' || status === 'rejected') && (
            <div className="space-y-4">
              {status === 'rejected' && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                  Your previous verification request was not approved. You can submit a new request below.
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
                <p className="text-xs pt-2">One-time fee: <span className="text-foreground font-medium">$49</span></p>
              </div>
              <StartVerificationButton sellerIdentityId={identity.id} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
