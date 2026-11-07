import type { CaseStatus, DocumentStatus } from '@/types'

/**
 * Status de um item do painel. Casos e documentos compartilham a mesma lista,
 * então o badge cobre os dois conjuntos de status.
 */
type ItemStatus = CaseStatus | DocumentStatus

const statusMap: Record<ItemStatus, { variant: string; label: string }> = {
  // Casos
  em_analise: { variant: 'amber',   label: 'Em análise' },
  concluido:  { variant: 'success', label: 'Concluído'  },
  // Documentos
  rascunho:   { variant: 'indigo',  label: 'Rascunho'   },
  confirmado: { variant: 'success', label: 'Confirmado' },
  // Comum aos dois
  arquivado:  { variant: 'muted',   label: 'Arquivado'  },
}

export default function StatusBadge({ status }: { status: ItemStatus }) {
  const s = statusMap[status] ?? statusMap.em_analise
  return (
    <span className={`badge badge-${s.variant}`}>
      <span className="badge-dot" aria-hidden="true" />
      {s.label}
    </span>
  )
}
