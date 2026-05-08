import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Package, Wrench, ArrowRight } from 'lucide-react'

export default async function CreateListingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Must have a seller identity
  const { data: identity } = await supabase
    .from('seller_identities')
    .select('id')
    .eq('account_id', user.id)
    .limit(1)
    .single()

  if (!identity) {
    redirect('/onboarding/seller')
  }

  const types = [
    {
      href: '/create-listing/product',
      icon: <Package className="w-8 h-8 text-primary" />,
      title: 'Digital Product',
      description: 'Upload a file for instant download — templates, tools, datasets, AI models, prompts, etc.',
      examples: 'Prompt packs · LLM fine-tunes · Automation scripts · Report templates',
    },
    {
      href: '/create-listing/service',
      icon: <Wrench className="w-8 h-8 text-violet-400" />,
      title: 'Service Listing',
      description: 'Offer a deliverable service with packages, add-ons, and a custom turnaround.',
      examples: 'Lead gen · Research reports · Outreach campaigns · Data analysis',
    },
  ]

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Create a Listing</h1>
        <p className="text-muted-foreground mt-1">What type of listing are you creating?</p>
      </div>

      <div className="grid gap-4">
        {types.map(t => (
          <Link key={t.href} href={t.href}>
            <Card className="bg-card border-border hover:border-primary/40 transition-all cursor-pointer group">
              <CardContent className="p-6">
                <div className="flex items-start gap-5">
                  <div className="shrink-0 p-3 rounded-xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                    {t.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-lg">{t.title}</h2>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                    <p className="text-xs text-muted-foreground/60 mt-2">{t.examples}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
