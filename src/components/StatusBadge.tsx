import { CaseStatus } from '@/types'

const statusMap: Record<CaseStatus, { variant: string; label: string }> = {
  em_analise: { variant: 'amber',   label: 'Em análise' },
  concluido:  { variant: 'success', label: 'Concluído'  },
  arquivado:  { variant: 'muted',   label: 'Arquivado'  },
}

export default function StatusBadge({ status }: { status: CaseStatus }) {
  const s = statusMap[status] ?? statusMap.em_analise
  return (
    <span className={`badge badge-${s.variant}`}>
      <span className="badge-dot" aria-hidden="true" />
      {s.label}
    </span>
  )
}
