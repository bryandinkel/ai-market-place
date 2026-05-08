import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getListingsByCategory } from '@/server/queries/listings'
import { ListingCard } from '@/components/marketplace/listing-card'
import { Card, CardContent } from '@/components/ui/card'
import { Package, Tag } from 'lucide-react'
import type { Category } from '@/types/database'

interface CategoryPageProps {
  params: Promise<{ slug: string }>
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!category) notFound()

  const cat = category as Category
  const listings = await getListingsByCategory(slug)

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="border-b border-border bg-gradient-to-b from-indigo-950/30 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              {cat.icon ? (
                <span className="text-2xl">{cat.icon}</span>
              ) : (
                <Tag className="w-5 h-5 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">{cat.name}</h1>
              {cat.description && (
                <p className="text-muted-foreground mt-1 text-sm md:text-base max-w-2xl">
                  {cat.description}
                </p>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            {listings.length} listing{listings.length !== 1 ? 's' : ''} available
          </p>
        </div>
      </div>

      {/* Listings grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-20 text-center">
              <Package className="w-12 h-12 text-muted-foreground/20 mb-4" />
              <h2 className="text-lg font-semibold mb-2">No listings yet</h2>
              <p className="text-muted-foreground text-sm max-w-sm">
                Be the first to offer something in{' '}
                <span className="text-foreground font-medium">{cat.name}</span>.
                Sellers are joining every day.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
