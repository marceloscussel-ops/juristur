'use client'

import { useState } from 'react'
import { Shield, CheckCircle2 } from 'lucide-react'
import { formatDate } from '@/lib/datetime'

export interface DefesaCase {
  id:           string
  title:        string
  category:     string
  created_at:   string
  escalated:    boolean
  whatsappUrl:  string
}

interface Props {
  cases:       DefesaCase[]
  /** Sem cota: os botões ficam desabilitados (o aviso fica acima, na página). */
  canEscalate: boolean
}

/**
 * Lista de casos já abertos, cada um com um botão "Solicitar defesa".
 *
 * O link abre o WhatsApp direto (evita bloqueio de popup) e o registro da
 * escalada vai em segundo plano — o servidor valida a cota e é idempotente por
 * caso, a mesma mecânica do botão dentro do caso.
 */
export default function DefesaCaseList({ cases, canEscalate }: Props) {
  const [escalated, setEscalated] = useState<Record<string, boolean>>(
    Object.fromEntries(cases.filter(c => c.escalated).map(c => [c.id, true]))
  )

  function record(id: string) {
    if (escalated[id]) return
    setEscalated(prev => ({ ...prev, [id]: true }))
    fetch(`/api/cases/${id}/escalate`, { method: 'POST' }).catch(() => {})
  }

  return (
    <ul className="space-y-2 list-none m-0 p-0">
      {cases.map(c => {
        const done = !!escalated[c.id]
        return (
          <li
            key={c.id}
            className="flex flex-wrap items-center gap-3 bg-surface rounded-lg px-3.5 py-3"
          >
            <div className="min-w-0 flex-1">
              <p className="j-body font-medium truncate">{c.title}</p>
              <p className="j-caption truncate">
                {c.category} · {formatDate(c.created_at)}
              </p>
            </div>

            {done ? (
              <span className="j-caption flex items-center gap-1.5 shrink-0 text-teal-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal" />
                Defesa solicitada
              </span>
            ) : canEscalate ? (
              <a
                href={c.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => record(c.id)}
                className="btn btn-outline btn-sm no-underline shrink-0"
              >
                <Shield className="w-3.5 h-3.5" />
                Solicitar defesa
              </a>
            ) : (
              <button type="button" disabled className="btn btn-outline btn-sm shrink-0">
                <Shield className="w-3.5 h-3.5" />
                Solicitar defesa
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
