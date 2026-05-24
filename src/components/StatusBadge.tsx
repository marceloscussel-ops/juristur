import { CaseStatus } from '@/types'

const statusMap: Record<CaseStatus, { variant: string; label: string }> = {
  em_analise: { variant: 'gold',    label: 'Em análise' },
  concluido:  { variant: 'success', label: 'Concluído' },
  arquivado:  { variant: 'slate',   label: 'Arquivado' },
}

export default function StatusBadge({ status }: { status: CaseStatus }) {
  const s = statusMap[status] ?? statusMap.em_analise
  return (
    <span className={`badge badge-${s.variant}`}>
      <span className="w-[5px] h-[5px] rounded-full bg-current opacity-80 flex-shrink-0" />
      {s.label}
    </span>
  )
}
