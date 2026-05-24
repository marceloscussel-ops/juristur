import { CaseStatus } from '@/types'

const statusConfig: Record<CaseStatus, { label: string; className: string }> = {
  em_analise: {
    label: 'Em análise',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  concluido: {
    label: 'Concluído',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  arquivado: {
    label: 'Arquivado',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
}

export default function StatusBadge({ status }: { status: CaseStatus }) {
  const config = statusConfig[status] ?? statusConfig.em_analise
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  )
}
