'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, RefreshCw, Loader2 } from 'lucide-react'

export default function ReviewActions({ caseId }: { caseId: string }) {
  const [mode, setMode]       = useState<'idle' | 'revision'>('idle')
  const [notes, setNotes]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const router = useRouter()

  async function handleApprove() {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/lawyer/cases/${caseId}/approve`, { method: 'POST' })
    if (!res.ok) { setError('Erro ao aprovar. Tente novamente.'); setLoading(false); return }
    router.push('/lawyer/dashboard')
    router.refresh()
  }

  async function handleRevision() {
    if (!notes.trim()) { setError('Digite os comentários para a revisão.'); return }
    setLoading(true)
    setError('')
    const res = await fetch(`/api/lawyer/cases/${caseId}/revision`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ notes }),
    })
    if (!res.ok) { setError('Erro ao solicitar revisão. Tente novamente.'); setLoading(false); return }
    setMode('idle')
    setNotes('')
    setLoading(false)
    router.refresh()
  }

  if (mode === 'revision') {
    return (
      <div className="space-y-3">
        <div>
          <label className="j-label mb-1 block">Comentários para a IA</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="j-input j-textarea"
            rows={4}
            placeholder="Ex: Mencionar também o artigo 14 do CDC. Enfatizar que o cliente tem 90 dias para reclamar..."
            autoFocus
          />
        </div>
        {error && <p className="text-danger text-sm">{error}</p>}
        <div className="flex gap-3">
          <button onClick={() => { setMode('idle'); setError('') }} disabled={loading} className="btn btn-outline flex-1">
            Cancelar
          </button>
          <button onClick={handleRevision} disabled={loading} className="btn btn-primary flex-1 justify-center">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando nova análise...</>
              : 'Enviar para revisão'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {error && <p className="text-danger text-sm mb-3">{error}</p>}
      <div className="flex gap-3">
        <button onClick={() => setMode('revision')} disabled={loading} className="btn btn-outline flex-1">
          <RefreshCw className="w-4 h-4" />
          Solicitar revisão
        </button>
        <button onClick={handleApprove} disabled={loading} className="btn btn-primary flex-1 justify-center">
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Aprovando...</>
            : <><CheckCircle className="w-4 h-4" /> Aprovar análise</>}
        </button>
      </div>
    </>
  )
}
