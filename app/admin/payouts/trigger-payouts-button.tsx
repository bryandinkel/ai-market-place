'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Loader2, CheckCircle } from 'lucide-react'
import { triggerPayouts } from './actions'

export function TriggerPayoutsButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [result, setResult] = useState<string | null>(null)

  async function handleTrigger() {
    setState('loading')
    setResult(null)
    try {
      const data = await triggerPayouts()
      setResult(`Processed ${data.processed} — success: ${data.success}, skipped: ${data.skipped}, failed: ${data.failed}`)
      setState('done')
    } catch (err) {
      setResult(err instanceof Error ? err.message : 'Error')
      setState('error')
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="outline"
        onClick={handleTrigger}
        disabled={state === 'loading'}
        className="gap-1.5"
      >
        {state === 'loading' ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : state === 'done' ? (
          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
        ) : (
          <Play className="w-3.5 h-3.5" />
        )}
        Run payout cron
      </Button>
      {result && (
        <p className={`text-xs ${state === 'error' ? 'text-red-400' : 'text-muted-foreground'}`}>{result}</p>
      )}
    </div>
  )
}
