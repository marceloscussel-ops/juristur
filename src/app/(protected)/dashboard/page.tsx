import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/StatusBadge'
import DashboardFilters from '@/components/DashboardFilters'
import { Case, CASE_CATEGORIES } from '@/types'
import { ChevronRight, FolderOpen, PlusCircle } from 'lucide-react'

interface Props {
  searchParams: Promise<{ categoria?: string; status?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const { categoria, status } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: agency } = await supabase
    .from('agencies').select('name').eq('id', user!.id).single()

  let query = supabase
    .from('cases')
    .select('*')
    .eq('agency_id', user!.id)
    .order('created_at', { ascending: false })

  if (categoria) query = query.eq('category', categoria)
  if (status)    query = query.eq('status', status)

  const { data: cases } = await query
  const typedCases = (cases ?? []) as Case[]

  const hasFilter = !!categoria || !!status

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="j-section-header mb-6">
        <div className="min-w-0 flex-1 mr-3">
          <p className="j-overline">Painel</p>
          <h1 className="j-h1 mt-0.5 truncate">{agency?.name ?? 'Agência'}</h1>
          <p className="j-caption mt-1">
            {hasFilter
              ? `${typedCases.length} resultado${typedCases.length !== 1 ? 's' : ''} filtrado${typedCases.length !== 1 ? 's' : ''}`
              : typedCases.length === 0
                ? 'Nenhum caso aberto ainda'
                : `${typedCases.length} caso${typedCases.length !== 1 ? 's' : ''} no total`}
          </p>
        </div>
        <Link href="/casos/novo" className="btn btn-warm no-underline flex-shrink-0 whitespace-nowrap">
          <PlusCircle className="w-4 h-4" />
          Novo caso
        </Link>
      </div>

      {/* Filtros */}
      <DashboardFilters
        categories={CASE_CATEGORIES}
        currentCategoria={categoria}
        currentStatus={status}
      />

      {/* Lista */}
      {typedCases.length === 0 ? (
        <div className="j-card text-center py-16">
          <FolderOpen className="w-10 h-10 text-ink-40 mx-auto mb-4" />
          {hasFilter ? (
            <>
              <h2 className="j-h3 mb-1">Nenhum caso encontrado</h2>
              <p className="j-caption mb-6">Tente remover os filtros para ver todos os casos</p>
              <Link href="/dashboard" className="btn btn-outline no-underline inline-flex">
                Limpar filtros
              </Link>
            </>
          ) : (
            <>
              <h2 className="j-h3 mb-1">Nenhum caso ainda</h2>
              <p className="j-caption mb-6">Abra seu primeiro caso para receber orientação jurídica</p>
              <Link href="/casos/novo" className="btn btn-warm no-underline inline-flex">
                <PlusCircle className="w-4 h-4" />
                Abrir primeiro caso
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="j-card p-0 overflow-hidden">
          <table className="j-table">
            <thead>
              <tr>
                <th>Caso</th>
                <th>Categoria</th>
                <th>Data</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {typedCases.map(c => (
                <tr key={c.id}>
                  <td className="font-medium">
                    <Link href={`/casos/${c.id}`} className="no-underline text-ink hover:text-indigo transition-colors block">
                      {c.title ?? c.category}
                    </Link>
                  </td>
                  <td className="text-ink-40">{c.category}</td>
                  <td className="text-ink-40 whitespace-nowrap">
                    {new Date(c.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td><StatusBadge status={c.status} /></td>
                  <td className="text-right">
                    <Link href={`/casos/${c.id}`} className="no-underline">
                      <ChevronRight className="w-4 h-4 text-ink-40 inline hover:text-indigo transition-colors" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
