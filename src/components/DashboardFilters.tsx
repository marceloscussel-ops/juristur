'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { SlidersHorizontal, X } from 'lucide-react'
import type { CaseCategory, CaseStatus } from '@/types'

const STATUS_OPTIONS: { value: CaseStatus; label: string }[] = [
  { value: 'em_analise', label: 'Em análise' },
  { value: 'concluido',  label: 'Concluído'  },
  { value: 'arquivado',  label: 'Arquivado'  },
]

interface Props {
  categories:       readonly CaseCategory[]
  currentCategoria?: string
  currentStatus?:    string
}

export default function DashboardFilters({ categories, currentCategoria, currentStatus }: Props) {
  const router      = useRouter()
  const pathname    = usePathname()
  const searchParams = useSearchParams()

  const hasFilter = !!currentCategoria || !!currentStatus

  function applyFilter(key: string, value: string | undefined) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  function clearFilters() {
    router.push(pathname)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <span className="j-caption flex items-center gap-1.5 text-slate-light">
        <SlidersHorizontal className="w-3.5 h-3.5" /> Filtros
      </span>

      {/* Categoria */}
      <select
        value={currentCategoria ?? ''}
        onChange={e => applyFilter('categoria', e.target.value || undefined)}
        className="j-input py-1.5 text-sm w-auto pr-8"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234A5568' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundPosition: 'right 8px center',
          backgroundRepeat:   'no-repeat',
        }}
      >
        <option value="">Todas as categorias</option>
        {categories.map(cat => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>

      {/* Status */}
      <select
        value={currentStatus ?? ''}
        onChange={e => applyFilter('status', e.target.value || undefined)}
        className="j-input py-1.5 text-sm w-auto pr-8"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234A5568' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundPosition: 'right 8px center',
          backgroundRepeat:   'no-repeat',
        }}
      >
        <option value="">Todos os status</option>
        {STATUS_OPTIONS.map(s => (
          <option key={s.value} value={s.value}>{s.label}</option>
        ))}
      </select>

      {/* Limpar */}
      {hasFilter && (
        <button
          onClick={clearFilters}
          className="inline-flex items-center gap-1 j-caption text-danger hover:text-navy transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Limpar
        </button>
      )}
    </div>
  )
}
