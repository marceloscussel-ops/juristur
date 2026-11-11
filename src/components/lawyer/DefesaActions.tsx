'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2, X } from 'lucide-react'
import type { DefenseStatus } from '@/types'
import { DitadoTextarea } from '@/components/Ditado'

type Escolha = 'inclusa' | 'avulsa' | 'descartada' | 'fila'

const ESCOLHAS: { id: Escolha; label: string; desc: string }[] = [
  { id: 'inclusa',    label: 'Defesa utilizada',                 desc: 'Desconta uma defesa inclusa no plano da agência.' },
  { id: 'avulsa',     label: 'Utilizada — cobrada à parte',      desc: 'Fica registrada, mas não desconta da cota do plano.' },
  { id: 'descartada', label: 'Não utilizada',                    desc: 'Resolvido na conversa, sem defesa prestada.' },
  { id: 'fila',       label: 'Voltar para a fila',               desc: 'Desfaz a marcação e volta a aguardar sua decisão.' },
]

/**
 * Marcação da defesa pelo advogado — o ato que define o que a agência vê como
 * "utilizada" na tela dela e o que desconta da cota do plano.
 *
 * Quando a agência não tem defesa inclusa disponível (plano Essential, cota do
 * ano esgotada ou carência em curso), a opção pré-selecionada é "cobrada à
 * parte": é o caso mais comum ali, e evita consumir uma cota que não existe.
 */
export default function DefesaActions({
  id, status, notes, temCotaDisponivel,
}: {
  id: string
  status: DefenseStatus
  notes: string | null
  temCotaDisponivel: boolean
}) {
  const [aberto, setAberto]   = useState(false)
  const [escolha, setEscolha] = useState<Escolha>(temCotaDisponivel ? 'inclusa' : 'avulsa')
  const [obs, setObs]         = useState(notes ?? '')
  const [loading, setLoading] = useState(false)
  const [erro, setErro]       = useState('')
  const router = useRouter()

  const opcoes = ESCOLHAS.filter(o => o.id !== 'fila' || status !== 'solicitada')

  async function salvar() {
    setLoading(true)
    setErro('')
    const body = {
      status: escolha === 'descartada' ? 'descartada' : escolha === 'fila' ? 'solicitada' : 'utilizada',
      consumesQuota: escolha === 'inclusa',
      notes: obs,
    }
    const res = await fetch(`/api/lawyer/defesas/${id}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setErro(data.error || 'Não foi possível salvar.')
      setLoading(false)
      return
    }
    setLoading(false)
    setAberto(false)
    router.refresh()
  }

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className="btn btn-outline btn-sm">
        {status === 'solicitada' ? 'Marcar' : 'Alterar'}
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-overlay px-4 animate-fade-in"
          onClick={() => !loading && setAberto(false)}
        >
          <div
            className="j-card max-w-[460px] w-full relative animate-fade-up text-left"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setAberto(false)}
              className="absolute top-4 right-4 text-ink-40 hover:text-ink transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="j-h3">Esta defesa foi utilizada?</h3>
            <p className="j-caption mt-1">
              {temCotaDisponivel
                ? 'A agência tem defesa inclusa disponível no plano.'
                : 'A agência não tem defesa inclusa disponível agora — o atendimento é cobrado à parte.'}
            </p>

            <div className="mt-4 space-y-2">
              {opcoes.map(o => {
                const ativo = escolha === o.id
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setEscolha(o.id)}
                    className={`w-full flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                      ativo ? 'border-indigo bg-indigo-50' : 'border-line-strong hover:border-indigo/50'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 mt-0.5 rounded-full border-2 shrink-0 ${
                        ativo ? 'border-indigo bg-indigo' : 'border-ink-40'
                      }`}
                    />
                    <span className="min-w-0">
                      <span className="block j-body font-medium">{o.label}</span>
                      <span className="block j-caption">{o.desc}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="mt-4">
              <label className="j-label mb-1 block" htmlFor={`obs-${id}`}>
                Observação (opcional)
              </label>
              <DitadoTextarea
                id={`obs-${id}`}
                value={obs}
                onValueChange={setObs}
                rows={3}
                className="j-input j-textarea"
                placeholder="Ex.: defesa protocolada no processo 0001234-56.2026.8.21.0001"
              />
            </div>

            {erro && <p className="text-danger text-sm mt-3">{erro}</p>}

            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={() => setAberto(false)}
                disabled={loading}
                className="btn btn-outline flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvar}
                disabled={loading}
                className="btn btn-primary flex-1 justify-center"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando…</>
                  : <><CheckCircle className="w-4 h-4" /> Salvar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
