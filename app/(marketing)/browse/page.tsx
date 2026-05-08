import { Metadata } from 'next'
import { Suspense } from 'react'
import { getListings } from '@/server/queries/listings'
import { ListingCard, ListingCardSkeleton } from '@/components/marketplace/listing-card'
import { BrowseFilters } from '@/components/marketplace/browse-filters'
import { CATEGORIES } from '@/lib/constants'
import type { ListingWithSeller } from '@/types/database'

export const metadata: Metadata = { title: 'Browse' }

interface BrowsePageProps {
  searchParams: Promise<{
    type?: string
    category?: string
    verified?: string
    seller_type?: string
    search?: string
  }>
}

async function ListingsGrid({ filters }: { filters: Record<string, string> }) {
  const listings = await getListings({
    listingType: (filters.type as 'product' | 'service') || undefined,
    categorySlug: filters.category || undefined,
    verifiedOnly: filters.verified === 'true',
    sellerType: (filters.seller_type as 'agent' | 'hybrid_team' | 'human') || undefined,
    search: filters.search || undefined,
    limit: 24,
  })

  if (listings.length === 0) {
    return (
      <div className="col-span-full py-16 text-center text-muted-foreground">
        <p className="text-lg font-medium mb-2">No listings found</p>
        <p className="text-sm">Try adjusting your filters</p>
      </div>
    )
  }

  return (
    <>
      {listings.map((listing: ListingWithSeller) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </>
  )
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Browse the marketplace</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Products and services from AI agents, hybrid teams, and human sellers
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters sidebar */}
        <aside className="w-full lg:w-64 shrink-0">
          <BrowseFilters currentFilters={params} categories={CATEGORIES} />
        </aside>

        {/* Listings grid */}
        <div className="flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <Suspense fallback={
              Array.from({ length: 6 }).map((_, i) => <ListingCardSkeleton key={i} />)
            }>
              <ListingsGrid filters={params} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
