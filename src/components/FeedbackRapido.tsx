'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Loader2, Check } from 'lucide-react'
import {
  MOTIVOS_NEGATIVOS, MOTIVOS_POSITIVOS, COMENTARIO_MAX,
  type FeedbackTarget, type FeedbackRating, type MeuFeedback,
} from '@/lib/feedback-motivos'

interface Props {
  targetType: FeedbackTarget
  targetId:   string
  /** Voto já dado por este usuário — a pergunta não reaparece. */
  inicial?:   MeuFeedback | null
}

type Etapa = 'pergunta' | 'detalhes' | 'obrigado'

/**
 * "Isso ajudou?" com 👍/👎, embutido no fim da análise ou do documento.
 *
 * O voto é gravado no clique — se a pessoa parar ali, o dado já ficou. Os
 * motivos e o comentário são um segundo passo opcional, na mesma linha.
 */
export default function FeedbackRapido({ targetType, targetId, inicial }: Props) {
  const [etapa, setEtapa]     = useState<Etapa>(inicial ? 'obrigado' : 'pergunta')
  const [rating, setRating]   = useState<FeedbackRating | null>(inicial?.rating ?? null)
  const [reasons, setReasons] = useState<string[]>(inicial?.reasons ?? [])
  const [comment, setComment] = useState(inicial?.comment ?? '')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro]       = useState('')

  const pergunta = targetType === 'case' ? 'Esta análise ajudou?' : 'Este documento ficou bom?'

  async function enviar(dados: { rating: FeedbackRating; reasons?: string[]; comment?: string }) {
    const res = await fetch('/api/feedback', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ targetType, targetId, ...dados }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      throw new Error(body?.error ?? 'Não foi possível registrar.')
    }
  }

  async function votar(r: FeedbackRating) {
    setErro('')
    setEnviando(true)
    try {
      await enviar({ rating: r })
      if (r !== rating) setReasons([])
      setRating(r)
      setEtapa('detalhes')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível registrar.')
    } finally {
      setEnviando(false)
    }
  }

  async function concluir() {
    if (!rating) return
    setErro('')
    setEnviando(true)
    try {
      await enviar({ rating, reasons, comment })
      setEtapa('obrigado')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível registrar.')
    } finally {
      setEnviando(false)
    }
  }

  function alternar(m: string) {
    setReasons(rs => rs.includes(m) ? rs.filter(x => x !== m) : [...rs, m])
  }

  if (etapa === 'obrigado') {
    return (
      <div className="j-card mt-4 flex flex-wrap items-center justify-between gap-2 !py-3">
        <p className="j-caption flex items-center gap-1.5">
          <Check className="w-4 h-4 text-teal" />
          Obrigado pelo retorno! Isso nos ajuda a melhorar.
        </p>
        <button
          onClick={() => setEtapa('detalhes')}
          className="j-caption text-ink-40 hover:text-ink transition-colors"
        >
          Alterar avaliação
        </button>
      </div>
    )
  }

  const motivos = rating === -1 ? MOTIVOS_NEGATIVOS[targetType]
                : rating === 1  ? MOTIVOS_POSITIVOS[targetType] : []

  return (
    <div className="j-card mt-4 !py-3">
      <div className="flex flex-wrap items-center gap-3">
        <p className="j-label">{pergunta}</p>
        <div className="flex gap-2">
          <button
            onClick={() => votar(1)} disabled={enviando}
            aria-pressed={rating === 1} aria-label="Sim, ajudou"
            className={`j-chip ${rating === 1 ? 'j-chip-active' : ''}`}
          >
            <ThumbsUp className="w-4 h-4" /> Sim
          </button>
          <button
            onClick={() => votar(-1)} disabled={enviando}
            aria-pressed={rating === -1} aria-label="Não ajudou"
            className={`j-chip ${rating === -1 ? 'j-chip-active' : ''}`}
          >
            <ThumbsDown className="w-4 h-4" /> Não
          </button>
        </div>
        {enviando && <Loader2 className="w-4 h-4 animate-spin text-ink-40" />}
      </div>

      {etapa === 'detalhes' && rating && (
        <div className="mt-3 space-y-3 animate-fade-in">
          <p className="j-caption">
            {rating === -1
              ? 'O que não funcionou? (opcional)'
              : 'Que bom! O que funcionou melhor? (opcional)'}
          </p>
          <div className="flex flex-wrap gap-2">
            {motivos.map(m => (
              <button
                key={m} type="button" onClick={() => alternar(m)}
                aria-pressed={reasons.includes(m)}
                className={`j-chip ${reasons.includes(m) ? 'j-chip-active' : ''}`}
              >
                {m}
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            maxLength={COMENTARIO_MAX}
            rows={2}
            placeholder={rating === -1
              ? 'Conte o que faltou ou estava errado'
              : 'Quer deixar algum comentário?'}
            className="j-input w-full resize-y"
          />
          <div className="flex flex-wrap gap-2">
            <button onClick={concluir} disabled={enviando} className="btn btn-primary btn-sm">
              Enviar
            </button>
            <button onClick={() => setEtapa('obrigado')} disabled={enviando} className="btn btn-ghost btn-sm">
              Agora não
            </button>
          </div>
        </div>
      )}

      {erro && <p className="text-xs text-coral mt-2">{erro}</p>}
    </div>
  )
}
