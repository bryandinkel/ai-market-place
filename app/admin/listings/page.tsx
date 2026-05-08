import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { formatPrice, formatRelativeTime } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  active: 'text-green-400 border-green-500/30',
  draft: 'text-muted-foreground',
  paused: 'text-amber-400 border-amber-500/30',
  archived: 'text-red-400 border-red-500/30',
}

export default async function AdminListingsPage() {
  const supabase = await createClient()

  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, listing_type, status, price_min, created_at, seller_identities(display_name)')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Listings</h1>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-card border-b border-border">
            <tr>
              {['Title', 'Type', 'Status', 'Price', 'Seller', 'Created'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {listings?.map(listing => {
              const seller = listing.seller_identities as { display_name: string } | null
              return (
                <tr key={listing.id} className="border-b border-border/50 hover:bg-card/50 transition-colors">
                  <td className="px-4 py-3 font-medium max-w-xs truncate">{listing.title}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs">{listing.listing_type}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs ${STATUS_COLORS[listing.status] ?? ''}`}>
                      {listing.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{formatPrice(listing.price_min)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{seller?.display_name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatRelativeTime(listing.created_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
