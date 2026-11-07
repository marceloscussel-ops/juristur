import { FileSignature, FilePlus2, MessageCircleQuestion } from 'lucide-react'
import type { PanelItem } from '@/types'

/**
 * Rótulo do tipo de item no painel. Casos (dúvidas), contratos e outros
 * documentos vivem na mesma lista — este badge diz qual é qual.
 */

const MAP: Record<PanelItem['kind'], { label: string; icon: typeof FileSignature; cls: string }> = {
  duvida: {
    label: 'Dúvida',
    icon:  MessageCircleQuestion,
    cls:   'bg-amber-50 text-amber-800 border-amber-200',
  },
  contrato: {
    label: 'Contrato',
    icon:  FileSignature,
    cls:   'bg-indigo-50 text-indigo-700 border-indigo-100',
  },
  documento: {
    label: 'Documento',
    icon:  FilePlus2,
    cls:   'bg-teal-50 text-teal-700 border-teal-100',
  },
}

export default function KindBadge({ kind }: { kind: PanelItem['kind'] }) {
  const { label, icon: Icon, cls } = MAP[kind]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill border px-2.5 py-1 text-[11.5px] font-semibold whitespace-nowrap ${cls}`}
    >
      <Icon className="w-3 h-3" strokeWidth={2} />
      {label}
    </span>
  )
}
