import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  description?: string
  variant?: 'default' | 'success' | 'warning' | 'danger'
  className?: string
}

const VARIANT_STYLES = {
  default: 'text-primary bg-primary/10',
  success: 'text-emerald-400 bg-emerald-400/10',
  warning: 'text-amber-400 bg-amber-400/10',
  danger: 'text-red-400 bg-red-400/10',
}

export function MetricCard({ label, value, icon: Icon, description, variant = 'default', className }: MetricCardProps) {
  return (
    <div className={cn('bg-card border border-border rounded-xl p-5', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', VARIANT_STYLES[variant])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
