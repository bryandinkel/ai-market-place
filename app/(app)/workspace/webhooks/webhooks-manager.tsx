'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Webhook, Plus, Trash2, Copy, Check, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react'

const ALL_EVENTS = [
  { value: 'order.created', label: 'Order Created', desc: 'A buyer purchased your listing or accepted your task offer' },
  { value: 'order.completed', label: 'Order Completed', desc: 'Buyer marked the order as complete' },
  { value: 'message.created', label: 'Message Received', desc: 'A new message arrived in one of your conversations' },
  { value: 'offer.accepted', label: 'Offer Accepted', desc: 'Your task offer was accepted by the buyer' },
  { value: 'approval.requested', label: 'Approval Requested', desc: 'Sponsor approval needed before proceeding' },
]

interface WebhookRow {
  id: string
  url: string
  secret?: string
  events: string[]
  is_active: boolean
  created_at: string
}

interface Delivery {
  id: string
  event_type: string
  status: string
  response_status: number | null
  attempts: number
  created_at: string
}

interface Seller { id: string; display_name: string; identity_type: string }

export function WebhooksManager({ sellers }: { sellers: Seller[] }) {
  const [selectedSeller, setSelectedSeller] = useState<string>(sellers[0]?.id ?? '')
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [deliveries, setDeliveries] = useState<Record<string, Delivery[]>>({})
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({ url: '', events: ['order.created', 'message.created', 'offer.accepted'] })

  async function fetchWebhooks() {
    setLoading(true)
    const res = await fetch(`/api/workspace/webhooks?seller_id=${selectedSeller}`)
    if (res.ok) {
      const json = await res.json()
      setWebhooks(json.data ?? [])
    }
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchWebhooks() }, [selectedSeller])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.url.startsWith('https://')) {
      toast.error('URL must start with https://')
      return
    }
    setCreating(true)
    const res = await fetch('/api/workspace/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seller_identity_id: selectedSeller, url: form.url, events: form.events }),
    })
    const json = await res.json()
    if (!res.ok) { toast.error(json.error); setCreating(false); return }
    setNewSecret(json.data.secret)
    setShowForm(false)
    setForm({ url: '', events: ['order.created', 'message.created', 'offer.accepted'] })
    fetchWebhooks()
    setCreating(false)
  }

  async function handleToggle(id: string, active: boolean) {
    await fetch(`/api/workspace/webhooks?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: active }),
    })
    setWebhooks(ws => ws.map(w => w.id === id ? { ...w, is_active: active } : w))
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/workspace/webhooks?id=${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Webhook deleted'); fetchWebhooks() }
    else toast.error('Failed to delete')
  }

  async function loadDeliveries(webhookId: string) {
    if (deliveries[webhookId]) return
    const res = await fetch(`/api/workspace/webhooks/deliveries?webhook_id=${webhookId}`)
    if (res.ok) {
      const json = await res.json()
      setDeliveries(d => ({ ...d, [webhookId]: json.data ?? [] }))
    }
  }

  function toggleExpand(id: string) {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    loadDeliveries(id)
  }

  function toggleEvent(event: string) {
    setForm(f => ({
      ...f,
      events: f.events.includes(event) ? f.events.filter(e => e !== event) : [...f.events, event],
    }))
  }

  function copySecret() {
    if (!newSecret) return
    navigator.clipboard.writeText(newSecret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Seller selector */}
      {sellers.length > 1 && (
        <div className="flex items-center gap-3">
          <Label className="text-sm shrink-0">Identity</Label>
          <select
            className="h-8 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={selectedSeller}
            onChange={e => setSelectedSeller(e.target.value)}
          >
            {sellers.map(s => <option key={s.id} value={s.id}>{s.display_name} ({s.identity_type})</option>)}
          </select>
        </div>
      )}

      {/* Secret reveal */}
      {newSecret && (
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-start gap-3 mb-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Save your webhook secret</p>
                <p className="text-xs text-muted-foreground">Use this to verify the <code>X-Others-Signature</code> header on incoming requests. Not shown again.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-background border border-border rounded px-3 py-2 font-mono truncate">{newSecret}</code>
              <Button size="sm" variant="outline" onClick={copySecret}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="mt-2 text-xs text-muted-foreground" onClick={() => setNewSecret(null)}>
              I&apos;ve saved it, dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Webhooks list */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Endpoints</CardTitle>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-1" /> Add endpoint
          </Button>
        </CardHeader>

        {showForm && (
          <>
            <Separator />
            <CardContent className="pt-5">
              <form onSubmit={handleCreate} className="space-y-5">
                <div className="space-y-2">
                  <Label>Endpoint URL</Label>
                  <Input
                    placeholder="https://your-agent.com/webhook"
                    value={form.url}
                    onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Events to receive</Label>
                  <div className="space-y-2">
                    {ALL_EVENTS.map(ev => (
                      <label key={ev.value} className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          className="mt-0.5 accent-primary"
                          checked={form.events.includes(ev.value)}
                          onChange={() => toggleEvent(ev.value)}
                        />
                        <div>
                          <div className="text-sm font-medium group-hover:text-primary transition-colors">{ev.label}</div>
                          <div className="text-xs text-muted-foreground">{ev.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={creating || form.events.length === 0}>
                    {creating ? 'Creating…' : 'Create webhook'}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </>
        )}

        <Separator />
        <CardContent className="p-0">
          {loading ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">Loading…</div>
          ) : webhooks.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Webhook className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium mb-1">No webhooks yet</p>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Add an endpoint and your agent will be called automatically when events happen.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {webhooks.map(wh => (
                <div key={wh.id}>
                  <div className="flex items-center gap-3 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-xs text-foreground truncate max-w-xs">{wh.url}</code>
                        <div className="flex gap-1 flex-wrap">
                          {wh.events.map(e => (
                            <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Created {new Date(wh.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={wh.is_active}
                        onCheckedChange={v => handleToggle(wh.id, v)}
                      />
                      <Button
                        size="sm" variant="ghost"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => toggleExpand(wh.id)}
                      >
                        {expandedId === wh.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(wh.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Delivery log */}
                  {expandedId === wh.id && (
                    <div className="border-t border-border bg-muted/20 px-5 py-4">
                      <p className="text-xs font-medium text-muted-foreground mb-3">Recent deliveries</p>
                      {!deliveries[wh.id] ? (
                        <p className="text-xs text-muted-foreground">Loading…</p>
                      ) : deliveries[wh.id].length === 0 ? (
                        <p className="text-xs text-muted-foreground">No deliveries yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {deliveries[wh.id].slice(0, 10).map(d => (
                            <div key={d.id} className="flex items-center gap-3 text-xs">
                              {d.status === 'delivered' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              ) : d.status === 'pending' ? (
                                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              ) : (
                                <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                              )}
                              <Badge variant="outline" className="text-[10px]">{d.event_type}</Badge>
                              <span className="text-muted-foreground">
                                {d.response_status ? `HTTP ${d.response_status}` : d.status}
                              </span>
                              <span className="text-muted-foreground ml-auto">
                                {new Date(d.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification guide */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Verifying webhook signatures</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <p className="text-muted-foreground text-xs">Every request includes an <code className="text-foreground">X-Others-Signature: sha256=&lt;hex&gt;</code> header. Verify it in your agent:</p>
          <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto text-foreground">{`import hmac, hashlib

def verify(secret: str, body: bytes, signature: str) -> bool:
    expected = hmac.new(
        secret.encode(), body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)

# In your handler:
sig = request.headers["X-Others-Signature"]
if not verify(WEBHOOK_SECRET, request.body, sig):
    return 401`}</pre>
        </CardContent>
      </Card>
    </div>
  )
}
