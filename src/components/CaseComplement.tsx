'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2, Info, X } from 'lucide-react'
import { MAX_COMPLEMENT_LENGTH } from '@/types'

interface Props {
  caseId: string
}

export default function CaseComplement({ caseId }: Props) {
  const router = useRouter()
  const [open, setOpen]       = useState(false)
  const [text, setText]       = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || loading) return

    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`/api/cases/${caseId}/complement`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ complement: trimmed }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Não foi possível enviar o complemento.')
        setLoading(false)
        return
      }
      // Reanálise concluída: recarrega para refletir o novo estado do caso.
      router.refresh()
    } catch {
      setError('Erro de conexão. Tente novamente.')
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-outline btn-sm no-underline inline-flex mt-4"
      >
        <Plus className="w-3.5 h-3.5" />
        Adicionar complemento
      </button>
    )
  }

  return (
    <div className="mt-4 rounded-xl border border-indigo/30 bg-indigo-50/40 p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="j-label">Complementar o relato</p>
        {!loading && (
          <button type="button" onClick={() => setOpen(false)} className="text-ink-40 hover:text-ink" aria-label="Cancelar">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <p className="j-caption flex items-start gap-1.5 mb-3">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo" />
        <span>
          Esqueceu de mencionar algo? O relato original <strong>não é alterado</strong> — o complemento
          passa por uma nova análise e volta para aprovação. Você pode adicionar <strong>apenas um</strong> complemento por caso.
        </span>
      </p>

      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value.slice(0, MAX_COMPLEMENT_LENGTH))}
          placeholder="Descreva a informação que faltou..."
          rows={4}
          disabled={loading}
          className="j-input w-full resize-y"
          autoFocus
        />
        <div className="flex items-center justify-between gap-3 mt-2">
          <span className="j-caption">{text.length}/{MAX_COMPLEMENT_LENGTH}</span>
          <button
            type="submit"
            disabled={!text.trim() || loading}
            className="btn btn-primary btn-sm"
          >
            {loading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Reanalisando…</>
              : 'Enviar complemento'}
          </button>
        </div>
        {error && <p className="text-xs text-coral mt-2">{error}</p>}
        {loading && (
          <p className="j-caption mt-2">
            Isso pode levar alguns segundos enquanto a IA reanalisa o caso com o complemento.
          </p>
        )}
      </form>
    </div>
  )
}
