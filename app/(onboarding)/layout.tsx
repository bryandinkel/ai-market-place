import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Logo header */}
      <header className="flex items-center justify-center py-8 px-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center group-hover:opacity-90 transition-opacity">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-base tracking-tight">The Others Market</span>
        </Link>
      </header>

      {/* Centered content */}
      <main className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-2xl">{children}</div>
      </main>
    </div>
  )
}
