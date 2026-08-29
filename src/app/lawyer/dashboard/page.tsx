import { createClient as createServiceClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { CheckCircle, FolderOpen, AlertCircle } from 'lucide-react'
import { env } from '@/lib/env'
import DashboardRefresh from '@/components/lawyer/DashboardRefresh'
import { formatDate } from '@/lib/datetime'

function getServiceClient() {
  return createServiceClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
}

const reviewStatusLabel: Record<string, { label: string; className: string }> = {
  pending:            { label: 'Aguardando revisão', className: 'badge-amber'   },
  revision_requested: { label: 'Revisão em curso',   className: 'badge-muted'   },
  approved:           { label: 'Aprovado',            className: 'badge-success' },
}

const filterOptions = [
  { value: 'pendentes', label: 'Pendentes' },
  { value: 'aprovados', label: 'Aprovados' },
  { value: 'todos',     label: 'Todos'     },
]

interface Props {
  searchParams: Promise<{ filtro?: string }>
}

export default async function LawyerDashboardPage({ searchParams }: Props) {
  const { filtro } = await searchParams
  const activeFilter = filtro ?? 'pendentes'

  const db = getServiceClient()

  // Query análises com base no filtro
  let query = db
    .from('case_analyses')
    .select('id, case_id, review_status, lawyer_notes, from_complement, created_at')
    .order('created_at', { ascending: false })

  if (activeFilter === 'pendentes') {
    query = query.in('review_status', ['pending', 'revision_requested'])
  } else if (activeFilter === 'aprovados') {
    query = query.eq('review_status', 'approved')
  }
  // 'todos' → sem filtro de review_status

  const { data: analyses, error: analysesError } = await query

  // Configurações do advogado
  const { data: settings } = await db.from('lawyer_settings').select('auto_approve').single()

  // Dados dos casos
  const caseIds = (analyses ?? []).map(a => a.case_id)
  const { data: cases } = caseIds.length > 0
    ? await db.from('cases').select('id, title, category, status, created_at, agency_id').in('id', caseIds)
    : { data: [] }

  // Nomes das agências
  const agencyIds = Array.from(new Set((cases ?? []).map(c => c.agency_id)))
  const { data: agencies } = agencyIds.length > 0
    ? await db.from('agencies').select('id, name').in('id', agencyIds)
    : { data: [] }

  const agencyMap = Object.fromEntries((agencies ?? []).map(a => [a.id, a.name]))
  const caseMap   = Object.fromEntries((cases ?? []).map(c => [c.id, c]))

  const autoApprove   = settings?.auto_approve ?? false
  const pendingCount  = (analyses ?? []).filter(a =>
    a.review_status === 'pending' || a.review_status === 'revision_requested'
  ).length

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="j-section-header mb-6">
        <div>
          <p className="j-overline">Painel do Advogado</p>
          <h1 className="j-h1 mt-0.5">Casos</h1>
          <p className="j-caption mt-1">
            {autoApprove
              ? 'Aprovação automática ativa'
              : pendingCount > 0 && activeFilter !== 'pendentes'
                ? `${pendingCount} caso${pendingCount !== 1 ? 's' : ''} aguardando revisão`
                : `${analyses?.length ?? 0} resultado${(analyses?.length ?? 0) !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <DashboardRefresh autoApprove={autoApprove} />
          <Link href="/lawyer/configuracoes" className="btn btn-outline no-underline">
            Configurações
          </Link>
        </div>
      </div>

      {/* Aviso auto-approve */}
      {autoApprove && (
        <div className="j-alert j-alert-warning mb-4">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <div>
            <span className="font-semibold">Aprovação automática ativada — </span>
            análises entregues sem revisão.
            <Link href="/lawyer/configuracoes" className="ml-2 underline text-amber">Alterar</Link>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {filterOptions.map(opt => (
          <Link
            key={opt.value}
            href={opt.value === 'pendentes' ? '/lawyer/dashboard' : `/lawyer/dashboard?filtro=${opt.value}`}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors no-underline border ${
              activeFilter === opt.value
                ? 'bg-indigo text-white border-indigo'
                : 'bg-white text-ink-40 border-[rgba(13,13,26,0.12)] hover:border-indigo hover:text-indigo'
            }`}
          >
            {opt.label}
            {opt.value === 'pendentes' && pendingCount > 0 && activeFilter !== 'pendentes' && (
              <span className="ml-1.5 bg-indigo text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Erro */}
      {analysesError && (
        <div className="j-alert j-alert-danger mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Erro ao carregar casos: {(analysesError as Error).message}
        </div>
      )}

      {/* Lista */}
      {!analyses?.length ? (
        <div className="j-card text-center py-16">
          <FolderOpen className="w-10 h-10 text-ink-40 mx-auto mb-4" />
          <h2 className="j-h3 mb-1">Nenhum caso encontrado</h2>
          <p className="j-caption">
            {activeFilter === 'pendentes' ? 'Nenhuma análise aguardando revisão.' : 'Nenhum caso neste filtro.'}
          </p>
          {activeFilter !== 'todos' && (
            <Link href="/lawyer/dashboard?filtro=todos" className="btn btn-outline no-underline inline-flex mt-4">
              Ver todos os casos
            </Link>
          )}
        </div>
      ) : (
        <div className="j-card p-0 overflow-hidden">
          <table className="j-table">
            <thead>
              <tr>
                <th>Caso</th>
                <th>Agência</th>
                <th>Categoria</th>
                <th>Data</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(analyses ?? []).map(a => {
                const c = caseMap[a.case_id]
                if (!c) return null
                const statusInfo = reviewStatusLabel[a.review_status] ?? { label: a.review_status, className: 'badge-muted' }
                return (
                  <tr key={a.id}>
                    <td className="font-medium">
                      <Link href={`/lawyer/casos/${c.id}`} className="no-underline text-ink hover:text-indigo transition-colors block">
                        {c.title ?? c.category}
                      </Link>
                      {a.from_complement && (
                        <span className="badge badge-indigo mt-1 inline-flex">Complemento</span>
                      )}
                    </td>
                    <td className="text-ink-40">{agencyMap[c.agency_id] ?? '—'}</td>
                    <td className="text-ink-40">{c.category}</td>
                    <td className="text-ink-40 whitespace-nowrap">
                      {formatDate(a.created_at)}
                    </td>
                    <td>
                      <span className={`badge ${statusInfo.className}`}>{statusInfo.label}</span>
                    </td>
                    <td className="text-right">
                      <Link href={`/lawyer/casos/${c.id}`} className="btn btn-outline btn-sm no-underline">
                        {a.review_status === 'approved' ? 'Ver' : 'Revisar'}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
