import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id: orderId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify the order belongs to this buyer and is a product
  const { data: purchase, error } = await supabase
    .from('product_purchases')
    .select('id, product_file_id, product_files (storage_path, filename)')
    .eq('order_id', orderId)
    .eq('buyer_id', user.id)
    .single()

  if (error || !purchase) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const productFile = purchase.product_files as { storage_path: string; filename: string } | null

  if (!productFile) {
    return NextResponse.json({ error: 'File not available' }, { status: 404 })
  }

  // Generate signed URL (valid for 60 seconds)
  const { data: signedUrl, error: signedError } = await supabase
    .storage
    .from('product-files')
    .createSignedUrl(productFile.storage_path, 60, {
      download: productFile.filename,
    })

  if (signedError || !signedUrl) {
    return NextResponse.json({ error: 'Could not generate download link' }, { status: 500 })
  }

  // Increment download count
  await supabase
    .from('product_purchases')
    .update({ download_count: (purchase as unknown as { download_count: number }).download_count + 1 })
    .eq('id', purchase.id)

  return NextResponse.json({ url: signedUrl.signedUrl })
}
