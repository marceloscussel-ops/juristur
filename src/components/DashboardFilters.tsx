'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { SlidersHorizontal, X } from 'lucide-react'
import type { CaseCategory, PanelItem } from '@/types'

/** Status possíveis no painel unificado (casos + documentos). */
const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'em_analise', label: 'Em análise' },
  { value: 'concluido',  label: 'Concluído'  },
  { value: 'rascunho',   label: 'Rascunho'   },
  { value: 'confirmado', label: 'Confirmado' },
  { value: 'arquivado',  label: 'Arquivado'  },
]

const TIPO_OPTIONS: { value: PanelItem['kind']; label: string }[] = [
  { value: 'duvida',    label: 'Dúvidas jurídicas' },
  { value: 'contrato',  label: 'Contratos'         },
  { value: 'documento', label: 'Outros documentos' },
]

const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%230D0D1A' stroke-width='2' stroke-opacity='0.4'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`

const SELECT_STYLE = {
  backgroundImage:    CHEVRON,
  backgroundPosition: 'right 8px center',
  backgroundRepeat:   'no-repeat',
} as const

interface Props {
  categories:        readonly CaseCategory[]
  currentTipo?:      string
  currentCategoria?: string
  currentStatus?:    string
}

export default function DashboardFilters({
  categories,
  currentTipo,
  currentCategoria,
  currentStatus,
}: Props) {
  const router       = useRouter()
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  const hasFilter = !!currentTipo || !!currentCategoria || !!currentStatus

  // Categoria só existe em casos: filtrar por ela dentro de documentos não quer
  // dizer nada, então o select desaparece quando o tipo não é "dúvida".
  const showCategoria = !currentTipo || currentTipo === 'duvida'

  function applyFilter(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    // Trocar para um tipo sem categoria descarta o filtro de categoria pendurado.
    if (key === 'tipo' && value && value !== 'duvida') params.delete('categoria')
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <span className="j-caption flex items-center gap-1.5 text-ink-40">
        <SlidersHorizontal className="w-3.5 h-3.5" /> Filtros
      </span>

      {/* Tipo */}
      <select
        value={currentTipo ?? ''}
        onChange={e => applyFilter('tipo', e.target.value || undefined)}
        className="j-input py-1.5 text-sm w-auto max-w-full pr-8"
        style={SELECT_STYLE}
        aria-label="Filtrar por tipo"
      >
        <option value="">Todos os tipos</option>
        {TIPO_OPTIONS.map(t => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {/* Categoria (só para dúvidas jurídicas) */}
      {showCategoria && (
        <select
          value={currentCategoria ?? ''}
          onChange={e => applyFilter('categoria', e.target.value || undefined)}
          className="j-input py-1.5 text-sm w-auto max-w-full pr-8"
          style={SELECT_STYLE}
          aria-label="Filtrar por categoria"
        >
          <option value="">Todas as categorias</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      )}

      {/* Status */}
      <select
        value={currentStatus ?? ''}
        onChange={e => applyFilter('status', e.target.value || undefined)}
        className="j-input py-1.5 text-sm w-auto max-w-full pr-8"
        style={SELECT_STYLE}
        aria-label="Filtrar por status"
      >
        <option value="">Todos os status</option>
        {STATUS_OPTIONS.map(s => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      {/* Limpar */}
      {hasFilter && (
        <button
          onClick={() => router.push(pathname)}
          className="inline-flex items-center gap-1 j-caption text-danger hover:text-ink transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Limpar
        </button>
      )}
    </div>
  )
}
