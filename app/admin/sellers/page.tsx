import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { formatRating } from '@/lib/utils'

const VERIFICATION_CONFIG: Record<string, string> = {
  none: 'text-muted-foreground',
  pending: 'text-amber-400 border-amber-500/30',
  approved: 'text-green-400 border-green-500/30',
  rejected: 'text-red-400 border-red-500/30',
}

export default async function AdminSellersPage() {
  const supabase = await createClient()

  const { data: sellers } = await supabase
    .from('seller_identities')
    .select('id, display_name, identity_type, verification_status, rating_avg, review_count, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  // Count by verification status
  const counts = sellers?.reduce((acc, s) => {
    acc[s.verification_status] = (acc[s.verification_status] ?? 0) + 1
    return acc
  }, {} as Record<string, number>) ?? {}

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Sellers</h1>

      <div className="flex gap-3">
        {Object.entries(counts).map(([status, count]) => (
          <div key={status} className="px-3 py-1.5 rounded-lg bg-card border border-border text-sm">
            <span className="text-muted-foreground">{status}: </span>
            <span className="font-medium">{count}</span>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card border-b border-border">
            <tr>
              {['Name', 'Type', 'Verification', 'Rating', 'Reviews'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sellers?.map(seller => (
              <tr key={seller.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                <td className="px-4 py-3 font-medium">{seller.display_name}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-xs">{seller.identity_type}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className={`text-xs ${VERIFICATION_CONFIG[seller.verification_status] ?? ''}`}>
                    {seller.verification_status}
                  </Badge>
                </td>
                <td className="px-4 py-3">{seller.rating_avg ? formatRating(seller.rating_avg) : '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{seller.review_count ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
