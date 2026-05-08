'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Key, Plus, Trash2, Copy, Check, AlertTriangle } from 'lucide-react'

interface ApiKey {
  id: string
  name: string
  seller_identity_id: string | null
  scopes: string[]
  is_active: boolean
  last_used_at: string | null
  created_at: string
}

interface Seller {
  id: string
  display_name: string
  identity_type: string
}

export function ApiKeysManager({ sellers }: { sellers: Seller[] }) {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({ name: '', seller_identity_id: '' })

  async function fetchKeys() {
    setLoading(true)
    const res = await fetch('/api/v1/account/keys')
    const json = await res.json()
    setKeys(json.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchKeys()
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    const res = await fetch('/api/v1/account/keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        seller_identity_id: form.seller_identity_id || null,
        scopes: ['read', 'write'],
      }),
    })
    const json = await res.json()
    if (!res.ok) {
      toast.error(json.error)
      setCreating(false)
      return
    }
    setNewKey(json.data.key)
    setShowForm(false)
    setForm({ name: '', seller_identity_id: '' })
    fetchKeys()
    setCreating(false)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/v1/account/keys?id=${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('API key revoked')
      fetchKeys()
    } else {
      toast.error('Failed to revoke key')
    }
  }

  function copyKey() {
    if (!newKey) return
    navigator.clipboard.writeText(newKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="space-y-6">
      {/* New key reveal */}
      {newKey && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Save your API key now</p>
                <p className="text-xs text-muted-foreground">This key will not be shown again after you close this banner.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-background border border-border rounded px-3 py-2 font-mono truncate">
                {newKey}
              </code>
              <Button size="sm" variant="outline" onClick={copyKey}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="mt-2 text-xs text-muted-foreground" onClick={() => setNewKey(null)}>
              I&apos;ve saved it, dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Keys list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Your API Keys</CardTitle>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-1" /> New Key
          </Button>
        </CardHeader>

        {showForm && (
          <>
            <Separator />
            <CardContent className="pt-4">
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Key name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. My Agent Bot"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                {sellers.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="seller">Link to seller identity (optional)</Label>
                    <select
                      id="seller"
                      className="w-full h-8 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                      value={form.seller_identity_id}
                      onChange={e => setForm(f => ({ ...f, seller_identity_id: e.target.value }))}
                    >
                      <option value="">None (buyer-only key)</option>
                      {sellers.map(s => (
                        <option key={s.id} value={s.id}>{s.display_name} ({s.identity_type})</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">Linking enables this key to sell, submit offers, and deliver orders as that identity.</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={creating}>
                    {creating ? 'Creating…' : 'Create key'}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </>
        )}

        <Separator />
        <CardContent className="p-0">
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : keys.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <Key className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No API keys yet. Create one to enable agent access.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {keys.map(k => (
                <div key={k.id} className="flex items-center gap-4 px-5 py-3">
                  <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{k.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {k.scopes.join(', ')}
                      </Badge>
                      {!k.is_active && (
                        <Badge variant="outline" className="text-[10px] text-red-400 border-red-400/30">Revoked</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created {formatDate(k.created_at)}
                      {k.last_used_at && ` · Last used ${formatDate(k.last_used_at)}`}
                    </p>
                  </div>
                  {k.is_active && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(k.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick reference */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quick Reference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground text-xs">Base URL: <code className="text-foreground">https://yourapp.com/api/v1</code></p>
          <div className="space-y-2">
            {[
              { method: 'GET', path: '/listings', desc: 'Browse all listings' },
              { method: 'GET', path: '/listings/:slug', desc: 'Get listing details' },
              { method: 'GET', path: '/tasks', desc: 'Browse open tasks' },
              { method: 'POST', path: '/tasks', desc: 'Post a new task' },
              { method: 'POST', path: '/tasks/:id/offers', desc: 'Submit an offer on a task' },
              { method: 'GET', path: '/orders', desc: 'List your orders' },
              { method: 'POST', path: '/orders/:id/deliver', desc: 'Submit a delivery' },
              { method: 'GET', path: '/sellers', desc: 'Browse sellers & agents' },
              { method: 'GET', path: '/messages', desc: 'List conversations' },
              { method: 'POST', path: '/messages', desc: 'Send a message' },
              { method: 'GET', path: '/account', desc: 'Your profile & seller identity' },
            ].map(r => (
              <div key={`${r.method}-${r.path}`} className="flex items-center gap-3">
                <Badge variant="outline" className="text-[10px] w-10 justify-center shrink-0">
                  {r.method}
                </Badge>
                <code className="text-xs text-primary w-44 shrink-0">{r.path}</code>
                <span className="text-xs text-muted-foreground">{r.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
