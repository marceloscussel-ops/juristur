'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Plus, X } from 'lucide-react'
import { DEFENSE_KIND_LABELS, type DefenseKind } from '@/types'

export interface AgenciaOpcao {
  id:    string
  name:  string
  saldo: string
}

/**
 * Lançamento de uma defesa que não passou pelo botão da plataforma — chegou por
 * WhatsApp, por telefone, ou foi uma audiência marcada direto com o advogado.
 *
 * Sem isto a cota só enxergaria o que veio da plataforma e o saldo mostrado à
 * agência estaria errado justamente nos casos mais relevantes.
 */
export default function NovaDefesa({ agencias, caseId, label }: {
  agencias: AgenciaOpcao[]
  /** Vincula o lançamento a um caso (usado na tela do caso). */
  caseId?: string
  label?:  string
}) {
  const [aberto, setAberto]   = useState(false)
  // Uma agência só (tela do caso): já vem selecionada.
  const [agencyId, setAgency] = useState(agencias.length === 1 ? agencias[0].id : '')
  const [kind, setKind]       = useState<DefenseKind>('defesa')
  const [subject, setSubject] = useState('')
  const [notes, setNotes]     = useState('')
  const [avulsa, setAvulsa]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro]       = useState('')
  const router = useRouter()

  async function salvar() {
    if (!agencyId) { setErro('Selecione a agência.'); return }
    setLoading(true)
    setErro('')
    const res = await fetch('/api/lawyer/defesas', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        agencyId,
        ...(caseId ? { caseId } : {}),
        kind,
        subject: subject.trim() || null,
        notes:   notes.trim() || null,
        status:  'utilizada',
        consumesQuota: !avulsa,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErro(data.error || 'Não foi possível registrar.')
      setLoading(false)
      return
    }
    setLoading(false)
    setAberto(false)
    setAgency(agencias.length === 1 ? agencias[0].id : '')
    setSubject(''); setNotes(''); setAvulsa(false); setKind('defesa')
    router.refresh()
  }

  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="btn btn-outline">
        <Plus className="w-4 h-4" />
        {label ?? 'Registrar defesa utilizada'}
      </button>
    )
  }

  const selecionada = agencias.find(a => a.id === agencyId)

  return (
    <div className="j-card relative">
      <button
        type="button"
        onClick={() => setAberto(false)}
        className="absolute top-4 right-4 text-ink-40 hover:text-ink transition-colors"
        aria-label="Fechar"
      >
        <X className="w-5 h-5" />
      </button>

      <p className="j-label mb-1">Registrar defesa utilizada</p>
      <p className="j-caption mb-4">
        Para a defesa que chegou fora da plataforma. Entra no saldo da agência na hora.
      </p>

      <div className="space-y-3">
        <div>
          <label className="j-label mb-1 block" htmlFor="defesa-agencia">Agência</label>
          <select
            id="defesa-agencia"
            value={agencyId}
            onChange={e => { setAgency(e.target.value); setErro('') }}
            disabled={loading}
            className="j-input"
          >
            <option value="">Selecione…</option>
            {agencias.map(a => (
              <option key={a.id} value={a.id}>{a.name} — {a.saldo}</option>
            ))}
          </select>
          {selecionada && (
            <p className="j-hint">Saldo atual: {selecionada.saldo}</p>
          )}
        </div>

        <div>
          <label className="j-label mb-1 block" htmlFor="defesa-tipo">Tipo de escalonamento</label>
          <select
            id="defesa-tipo"
            value={kind}
            onChange={e => setKind(e.target.value as DefenseKind)}
            disabled={loading}
            className="j-input"
          >
            {(Object.keys(DEFENSE_KIND_LABELS) as DefenseKind[]).map(k => (
              <option key={k} value={k}>{DEFENSE_KIND_LABELS[k]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="j-label mb-1 block" htmlFor="defesa-assunto">Assunto</label>
          <input
            id="defesa-assunto"
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            disabled={loading}
            className="j-input"
            placeholder="Ex.: defesa em ação de cancelamento de pacote"
          />
        </div>

        <div>
          <label className="j-label mb-1 block" htmlFor="defesa-obs">Observação (opcional)</label>
          <textarea
            id="defesa-obs"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            disabled={loading}
            rows={3}
            className="j-input j-textarea"
            placeholder="Ex.: audiência de conciliação em 12/12, processo 0001234-56.2026.8.21.0001"
          />
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={avulsa}
            onChange={e => setAvulsa(e.target.checked)}
            disabled={loading}
            className="mt-1"
          />
          <span className="min-w-0">
            <span className="block j-body">Cobrada à parte</span>
            <span className="block j-caption">
              Registra o atendimento sem descontar da cota do plano.
            </span>
          </span>
        </label>
      </div>

      {erro && <p className="text-danger text-sm mt-3">{erro}</p>}

      <div className="flex gap-3 mt-5">
        <button type="button" onClick={() => setAberto(false)} disabled={loading} className="btn btn-outline flex-1">
          Cancelar
        </button>
        <button type="button" onClick={salvar} disabled={loading} className="btn btn-primary flex-1 justify-center">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Registrando…</> : 'Registrar'}
        </button>
      </div>
    </div>
  )
}
