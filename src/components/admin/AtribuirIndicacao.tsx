'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export interface AgenciaOpcao {
  id:          string
  name:        string
  partnerName: string | null
}

export interface IndicadorOpcao {
  slug: string
  name: string
}

/**
 * Atribuição manual da indicação, no painel gerencial.
 *
 * O link /i/<slug> não pega todo mundo: a agência conhece a plataforma no
 * estande da associação e se cadastra direto, dias depois, pelo Google. É aqui
 * que esses casos entram — e é aqui que se corrige uma atribuição errada,
 * porque este é o único caminho que sobrescreve.
 */
export default function AtribuirIndicacao({ agencias, indicadores }: {
  agencias:    AgenciaOpcao[]
  indicadores: IndicadorOpcao[]
}) {
  const router = useRouter()
  const [agencyId, setAgencyId] = useState('')
  const [slug, setSlug]         = useState('')
  const [busca, setBusca]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg]           = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const filtradas = busca.trim()
    ? agencias.filter(a => a.name.toLowerCase().includes(busca.trim().toLowerCase()))
    : agencias

  const selecionada = agencias.find(a => a.id === agencyId)

  async function salvar() {
    if (!agencyId) return
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/admin/indicacao', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ agencyId, slug: slug || null }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMsg({ tipo: 'erro', texto: data.error ?? 'Não foi possível salvar.' })
        return
      }
      setMsg({
        tipo:  'ok',
        texto: data.partner
          ? `Indicação atribuída a ${data.partner.name}.`
          : 'Indicação removida.',
      })
      setAgencyId('')
      setSlug('')
      router.refresh()
    } catch {
      setMsg({ tipo: 'erro', texto: 'Erro de conexão. Tente novamente.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="j-card space-y-3">
      <div>
        <p className="j-caption font-medium text-ink">Atribuir indicação manualmente</p>
        <p className="j-caption mt-0.5">
          Para quem se cadastrou sem passar pelo link do indicador — e para corrigir
          uma atribuição errada.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="j-label" htmlFor="ind-busca">Buscar agência</label>
          <input id="ind-busca" type="text" value={busca} onChange={e => setBusca(e.target.value)}
                 className="j-input" placeholder="Parte do nome" />
        </div>

        <div>
          <label className="j-label" htmlFor="ind-agencia">Agência</label>
          <select id="ind-agencia" value={agencyId} onChange={e => setAgencyId(e.target.value)}
                  className="j-input">
            <option value="">Selecione…</option>
            {filtradas.map(a => (
              <option key={a.id} value={a.id}>
                {a.name}{a.partnerName ? ` — ${a.partnerName}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="j-label" htmlFor="ind-partner">Indicador</label>
          <select id="ind-partner" value={slug} onChange={e => setSlug(e.target.value)}
                  className="j-input">
            <option value="">Sem indicador</option>
            {indicadores.map(i => (
              <option key={i.slug} value={i.slug}>{i.name}</option>
            ))}
          </select>
        </div>
      </div>

      {selecionada?.partnerName && (
        <p className="j-caption">
          Hoje <strong>{selecionada.name}</strong> está atribuída a{' '}
          <strong>{selecionada.partnerName}</strong>. Salvar substitui essa atribuição.
        </p>
      )}

      {msg && (
        <div className={`j-alert text-[13px] ${msg.tipo === 'ok' ? 'j-alert-success' : 'j-alert-danger'}`}>
          {msg.texto}
        </div>
      )}

      <button type="button" onClick={salvar} disabled={loading || !agencyId}
              className="btn btn-primary">
        {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</> : 'Salvar'}
      </button>
    </div>
  )
}
