'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  PlusSquare,
  Package,
  MessageSquare,
  ChevronDown,
  Zap,
  Menu,
  X,
  Bell,
} from 'lucide-react'
import { getInitials } from '@/lib/utils'
import type { Profile } from '@/types/database'

interface NavbarProps {
  user?: { id: string; email?: string } | null
  profile?: Profile | null
  unreadCount?: number
}

const NAV_LINKS = [
  { href: '/browse', label: 'Browse', icon: Search },
  { href: '/agents', label: 'Agents', icon: Zap },
  { href: '/post-task', label: 'Post Task', icon: PlusSquare, requiresAuth: true },
  { href: '/orders', label: 'Orders', icon: Package, requiresAuth: true },
  { href: '/messages', label: 'Messages', icon: MessageSquare, requiresAuth: true },
]

const MODE_OPTIONS = [
  { value: 'buyer', label: 'Buyer', href: '/dashboard/buyer' },
  { value: 'seller', label: 'Seller', href: '/dashboard/seller' },
  { value: 'sponsor', label: 'Sponsor', href: '/workspace' },
] as const

export function Navbar({ user, profile, unreadCount = 0 }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  const currentModeLabel = MODE_OPTIONS.find(m => m.value === profile?.current_mode)?.label ?? 'Buyer'

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-foreground tracking-tight hidden sm:block">
              The Others
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon, requiresAuth }) => {
              if (requiresAuth && !user) return null
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={`desktop-${href}`}
                  href={href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    active
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {label === 'Messages' && unreadCount > 0 && (
                    <Badge variant="default" className="ml-1 h-4 px-1 text-[10px] leading-none bg-primary">
                      {unreadCount}
                    </Badge>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {user && profile ? (
              <>
                {/* Mode Switcher */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors">
                    {currentModeLabel}
                    <ChevronDown className="w-3 h-3" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">Switch mode</div>
                    <DropdownMenuSeparator />
                    {MODE_OPTIONS.map(opt => (
                      <DropdownMenuItem
                        key={opt.value}
                        onClick={() => router.push(opt.href)}
                        className={cn(profile.current_mode === opt.value && 'text-primary')}
                      >
                        {opt.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Notifications */}
                <Link href="/notifications" className="relative p-2 rounded-md hover:bg-secondary/50 text-muted-foreground">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
                  )}
                </Link>

                {/* Account */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile.avatar_url ?? undefined} alt={profile.display_name} />
                      <AvatarFallback className="text-xs bg-primary/20 text-primary">
                        {getInitials(profile.display_name || 'U')}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-1.5 py-1">
                      <div className="text-sm font-medium">{profile.display_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/home')}>Home</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/dashboard/buyer')}>Buyer Dashboard</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/dashboard/seller')}>Seller Dashboard</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/workspace')}>Sponsor Workspace</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/account/settings')}>Settings</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push('/account/verification')}>Verification</DropdownMenuItem>
                    {profile.is_admin && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => router.push('/admin')}>Admin Panel</DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button size="sm" asChild className="gradient-primary text-white border-0">
                  <Link href="/signup">Get started</Link>
                </Button>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-3 space-y-1">
          {NAV_LINKS.map(({ href, label, icon: Icon, requiresAuth }) => {
            if (requiresAuth && !user) return null
            const active = pathname === href
            return (
              <Link
                key={`mobile-${href}`}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium',
                  active ? 'bg-secondary text-foreground' : 'text-muted-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            )
          })}
        </div>
      )}
    </header>
  )
}
