'use client'

import { useState, useEffect, useRef } from 'react'
import { Send, Loader2, MessageSquare, Lock } from 'lucide-react'
import { CaseMessage, MAX_FOLLOWUP_QUESTIONS } from '@/types'
import { formatTime } from '@/lib/datetime'

interface Props {
  caseId: string
}

export default function CaseFollowUp({ caseId }: Props) {
  const [messages, setMessages] = useState<CaseMessage[]>([])
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch(`/api/cases/${caseId}/messages`)
      .then(r => r.json())
      .then(d => setMessages(d.messages ?? []))
      .catch(() => {})
  }, [caseId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = question.trim()
    if (!trimmed || loading) return

    setError(null)
    const optimistic: CaseMessage = {
      id:         `temp-${Date.now()}`,
      case_id:    caseId,
      role:       'user',
      content:    trimmed,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])
    setQuestion('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setLoading(true)

    try {
      const res = await fetch(`/api/cases/${caseId}/messages`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ question: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Erro ao enviar pergunta.')
        setMessages(prev => prev.filter(m => m.id !== optimistic.id))
        return
      }
      setMessages(prev => [...prev.filter(m => m.id !== optimistic.id), optimistic, data.message])
    } catch {
      setError('Erro de conexão. Tente novamente.')
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const asked = messages.filter(m => m.role === 'user').length
  const remaining = Math.max(0, MAX_FOLLOWUP_QUESTIONS - asked)
  const limitReached = remaining === 0
  const isEmpty = messages.length === 0 && !loading

  return (
    <>
      {/* Histórico da conversa, no fluxo logo abaixo da análise */}
      <div className="j-card mt-4">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-4 h-4 text-indigo" />
          <p className="j-label">Perguntas de acompanhamento</p>
        </div>

        {isEmpty && (
          <p className="j-body text-ink-80">
            Ficou com alguma dúvida sobre a análise? Use o campo fixo na base da tela para
            perguntar — você tem {MAX_FOLLOWUP_QUESTIONS} perguntas incluídas neste caso.
          </p>
        )}

        {messages.length > 0 && (
          <div className="space-y-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`rounded-xl px-4 py-3 max-w-[85%] ${
                    msg.role === 'user'
                      ? 'bg-indigo text-white'
                      : 'bg-surface border border-[rgba(13,13,26,0.07)]'
                  }`}
                >
                  <p
                    className={`text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user' ? 'text-white' : 'text-ink'
                    }`}
                  >
                    {msg.content}
                  </p>
                  <p className={`text-xs mt-1.5 ${msg.role === 'user' ? 'text-white/60' : 'text-ink-light'}`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface border border-[rgba(13,13,26,0.07)] rounded-xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-indigo animate-spin" />
                  <span className="j-caption">Analisando...</span>
                </div>
              </div>
            )}
            {/* scroll-mb reserva espaço para o composer fixo não cobrir a última mensagem */}
            <div ref={bottomRef} className="scroll-mb-40" />
          </div>
        )}

        {limitReached && (
          <div className="flex items-start gap-2 text-[13px] text-ink-light bg-surface border border-[rgba(13,13,26,0.07)] rounded-lg px-4 py-3 mt-4">
            <Lock className="w-4 h-4 text-ink-40 shrink-0 mt-0.5" />
            <span>
              Você atingiu o limite de {MAX_FOLLOWUP_QUESTIONS} perguntas para este caso.
              Para novas dúvidas, abra um <strong>novo caso</strong>.
            </span>
          </div>
        )}
      </div>

      {/* Composer fixo na base da tela — sempre visível, sem precisar rolar */}
      {!limitReached && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-ink-15 bg-white/95 backdrop-blur shadow-[0_-4px_20px_-12px_rgba(11,18,28,0.25)] print:hidden">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
            {isEmpty && (
              <p className="j-caption mb-2 flex items-center gap-1.5 text-indigo">
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                Tem uma dúvida sobre a análise? Pergunte aqui.
              </p>
            )}

            {error && <p className="text-xs text-coral mb-2">{error}</p>}

            <form onSubmit={handleSubmit} className="flex gap-2 items-end">
              <textarea
                ref={textareaRef}
                value={question}
                onChange={e => { setQuestion(e.target.value); autoResize() }}
                onKeyDown={handleKeyDown}
                placeholder="Escreva sua dúvida... (Enter para enviar)"
                rows={1}
                disabled={loading}
                className="j-input flex-1 resize-none overflow-hidden"
                style={{ minHeight: 42 }}
              />
              <button
                type="submit"
                disabled={!question.trim() || loading}
                className="btn btn-primary flex-shrink-0"
                style={{ height: 42, width: 42, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                {loading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />
                }
              </button>
            </form>
            <p className="j-caption mt-1.5 text-right">
              {remaining} pergunta{remaining !== 1 ? 's' : ''} restante{remaining !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
    </>
  )
}
