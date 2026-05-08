'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'

export interface CreateProductListingData {
  title: string
  description: string
  categoryId: string
  priceMin: number
  tags: string[]
  fileTypes: string[]
  version?: string
  usageNotes?: string
  instantDelivery: boolean
}

export interface CreateServiceListingData {
  title: string
  description: string
  categoryId: string
  pricingModel: 'fixed' | 'package' | 'custom_quote'
  priceMin: number
  turnaroundDays: number
  revisionsIncluded: number
  scope?: string
  proofOfWorkExpected: boolean
  tags: string[]
  packages: Array<{ name: string; description: string; price: number; turnaroundDays: number; revisions: number }>
  addons: Array<{ name: string; description: string; price: number }>
}

export async function createProductListing(data: CreateProductListingData): Promise<{ listingId: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const { data: identity, error: identityError } = await supabase
    .from('seller_identities')
    .select('id')
    .eq('account_id', user.id)
    .limit(1)
    .single()

  if (identityError || !identity) throw new Error('No seller identity found')

  const slug = slugify(data.title) + '-' + Date.now().toString(36)

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .insert({
      seller_identity_id: identity.id,
      listing_type: 'product',
      title: data.title,
      slug,
      description: data.description,
      category_id: data.categoryId || null,
      status: 'draft',
      price_min: data.priceMin,
      tags: data.tags,
    })
    .select()
    .single()

  if (listingError || !listing) throw new Error(listingError?.message ?? 'Failed to create listing')

  await supabase.from('listing_products').insert({
    listing_id: listing.id,
    file_types: data.fileTypes,
    version: data.version || null,
    usage_notes: data.usageNotes || null,
    instant_delivery: data.instantDelivery,
  })

  revalidatePath('/dashboard/seller')
  return { listingId: listing.id }
}

export async function createServiceListing(data: CreateServiceListingData): Promise<{ listingId: string }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  const { data: identity, error: identityError } = await supabase
    .from('seller_identities')
    .select('id')
    .eq('account_id', user.id)
    .limit(1)
    .single()

  if (identityError || !identity) throw new Error('No seller identity found')

  const slug = slugify(data.title) + '-' + Date.now().toString(36)

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .insert({
      seller_identity_id: identity.id,
      listing_type: 'service',
      title: data.title,
      slug,
      description: data.description,
      category_id: data.categoryId || null,
      status: 'draft',
      price_min: data.priceMin,
      tags: data.tags,
    })
    .select()
    .single()

  if (listingError || !listing) throw new Error(listingError?.message ?? 'Failed to create listing')

  await supabase.from('listing_services').insert({
    listing_id: listing.id,
    pricing_model: data.pricingModel,
    turnaround_days: data.turnaroundDays,
    revisions_included: data.revisionsIncluded,
    scope: data.scope || null,
    proof_of_work_expected: data.proofOfWorkExpected,
  })

  if (data.packages.length > 0) {
    await supabase.from('listing_packages').insert(
      data.packages.map(pkg => ({
        listing_id: listing.id,
        name: pkg.name,
        description: pkg.description,
        price: pkg.price,
        turnaround_days: pkg.turnaroundDays,
        revisions: pkg.revisions,
      }))
    )
  }

  if (data.addons.length > 0) {
    await supabase.from('listing_addons').insert(
      data.addons.map(addon => ({
        listing_id: listing.id,
        name: addon.name,
        description: addon.description,
        price: addon.price,
      }))
    )
  }

  revalidatePath('/dashboard/seller')
  return { listingId: listing.id }
}

export async function saveProductFile(
  listingId: string,
  storagePath: string,
  filename: string,
  fileSize: number
): Promise<void> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  // Verify the listing belongs to this seller
  const { data: identity } = await supabase
    .from('seller_identities')
    .select('id')
    .eq('account_id', user.id)
    .limit(1)
    .single()

  if (!identity) throw new Error('No seller identity')

  const { data: listing } = await supabase
    .from('listings')
    .select('id')
    .eq('id', listingId)
    .eq('seller_identity_id', identity.id)
    .single()

  if (!listing) throw new Error('Listing not found or not owned by you')

  // Remove any previous file for this listing (single-file for MVP)
  await supabase.from('product_files').delete().eq('listing_id', listingId)

  await supabase.from('product_files').insert({
    listing_id: listingId,
    storage_path: storagePath,
    filename,
    file_size: fileSize,
    version: null,
  })

  // Auto-publish the listing once a file is attached
  await supabase
    .from('listings')
    .update({ status: 'active' })
    .eq('id', listingId)
    .eq('seller_identity_id', identity.id)

  revalidatePath('/dashboard/seller')
}

export async function publishListing(listingId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Not authenticated')

  // Verify ownership
  const { data: identity } = await supabase
    .from('seller_identities')
    .select('id')
    .eq('account_id', user.id)
    .limit(1)
    .single()

  if (!identity) throw new Error('No seller identity')

  const { error } = await supabase
    .from('listings')
    .update({ status: 'active' })
    .eq('id', listingId)
    .eq('seller_identity_id', identity.id)

  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/seller')
  redirect(`/dashboard/seller`)
}
