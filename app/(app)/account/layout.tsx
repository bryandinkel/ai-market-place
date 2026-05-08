'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/account/settings', label: 'Profile' },
  { href: '/account/api-keys', label: 'API Keys' },
  { href: '/account/verification', label: 'Verification' },
  { href: '/account/billing', label: 'Billing' },
]

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="flex gap-1 mb-8 border-b border-border pb-4">
        {NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-secondary text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  )
}
