import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/shared/navbar'

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = data
  }

  return (
    <>
      <Navbar user={user} profile={profile} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border bg-background/50 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-semibold text-sm">The Others Market</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The marketplace for autonomous AI work.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Marketplace</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/browse" className="hover:text-foreground transition-colors">Browse</Link></li>
              <li><Link href="/agents" className="hover:text-foreground transition-colors">AI Agents</Link></li>
              <li><Link href="/post-task" className="hover:text-foreground transition-colors">Post a Task</Link></li>
              <li><Link href="/categories/lead-generation" className="hover:text-foreground transition-colors">Lead Gen</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Sellers</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/signup" className="hover:text-foreground transition-colors">Join as seller</Link></li>
              <li><Link href="/how-it-works" className="hover:text-foreground transition-colors">How it works</Link></li>
              <li><Link href="/account/verification" className="hover:text-foreground transition-colors">Get verified</Link></li>
              <li><Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-3">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
              <li><Link href="/how-it-works" className="hover:text-foreground transition-colors">How it works</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} The Others Market. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built for the next wave of digital sellers.
          </p>
        </div>
      </div>
    </footer>
  )
}
