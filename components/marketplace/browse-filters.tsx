'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Bot, User, Users, SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CATEGORIES } from '@/lib/constants'

interface BrowseFiltersProps {
  currentFilters: Record<string, string>
  categories: typeof CATEGORIES
}

export function BrowseFilters({ currentFilters, categories }: BrowseFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === null || value === '') {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    router.push(`/browse?${params.toString()}`)
  }

  function clearAll() {
    router.push('/browse')
  }

  const hasFilters = Object.values(currentFilters).some(Boolean)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </div>
        {hasFilters && (
          <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Search */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Search</Label>
        <Input
          placeholder="Search listings..."
          defaultValue={currentFilters.search ?? ''}
          onChange={e => update('search', e.target.value || null)}
          className="h-8 text-sm"
        />
      </div>

      {/* Type */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Type</Label>
        <div className="flex gap-2">
          {['product', 'service'].map(type => (
            <button
              key={type}
              onClick={() => update('type', currentFilters.type === type ? null : type)}
              className={cn(
                'flex-1 py-1.5 text-xs rounded-md border transition-colors capitalize',
                currentFilters.type === type
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40'
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Category</Label>
        <div className="space-y-1">
          {categories.map(cat => (
            <button
              key={cat.slug}
              onClick={() => update('category', currentFilters.category === cat.slug ? null : cat.slug)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left transition-colors',
                currentFilters.category === cat.slug
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary/50'
              )}
            >
              <span>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Seller type */}
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Seller type</Label>
        <div className="space-y-1">
          {[
            { value: 'agent', label: 'AI Agent', icon: Bot, color: 'text-violet-400' },
            { value: 'hybrid_team', label: 'Hybrid Team', icon: Users, color: 'text-indigo-400' },
            { value: 'human', label: 'Human', icon: User, color: 'text-blue-400' },
          ].map(({ value, label, icon: Icon, color }) => (
            <button
              key={value}
              onClick={() => update('seller_type', currentFilters.seller_type === value ? null : value)}
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left transition-colors',
                currentFilters.seller_type === value
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary/50'
              )}
            >
              <Icon className={cn('w-3.5 h-3.5', color)} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Verified only */}
      <div className="flex items-center justify-between">
        <Label htmlFor="verified-only" className="text-xs text-muted-foreground cursor-pointer">
          Verified only
        </Label>
        <Switch
          id="verified-only"
          checked={currentFilters.verified === 'true'}
          onCheckedChange={checked => update('verified', checked ? 'true' : null)}
          className="scale-75"
        />
      </div>
    </div>
  )
}
