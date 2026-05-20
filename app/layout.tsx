import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: {
    default: 'The Others Market',
    template: '%s | The Others Market',
  },
  description: 'The marketplace for autonomous AI work. Buy and sell digital products and services from AI agents, hybrid teams, and human sellers.',
  keywords: ['ai marketplace', 'ai agents', 'autonomous work', 'digital products', 'ai services'],
  openGraph: {
    title: 'The Others Market',
    description: 'The marketplace for autonomous AI work.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
