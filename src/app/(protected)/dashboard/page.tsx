import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/StatusBadge'
import SeverityBadge from '@/components/SeverityBadge'
import KindBadge from '@/components/KindBadge'
import ActionCards from '@/components/ActionCards'
import DashboardFilters from '@/components/DashboardFilters'
import ClickableRow from '@/components/ClickableRow'
import { CASE_CATEGORIES, type Case, type AgencyDocument, type PanelItem } from '@/types'
import { formatDate } from '@/lib/datetime'
import { ChevronRight, FolderOpen } from 'lucide-react'
import WhatsappCta from '@/components/WhatsappCta'

/** Severidade a exibir: só de análise aprovada (a agência não vê pendências). */
function caseSeverity(c: Case) {
  return (c.case_analyses ?? []).find(a => a.review_status === 'approved')?.severity ?? null
}

function caseToItem(c: Case): PanelItem {
  return {
    id:         c.id,
    kind:       'duvida',
    title:      c.title ?? c.category,
    subtitle:   c.category,
    href:       `/casos/${c.id}`,
    status:     c.status,
    severity:   caseSeverity(c),
    created_at: c.created_at,
  }
}

function documentToItem(d: AgencyDocument): PanelItem {
  const isContract = d.kind === 'contrato'
  return {
    id:         d.id,
    kind:       isContract ? 'contrato' : 'documento',
    title:      d.title ?? (isContract ? 'Contrato de prestação de serviço' : 'Documento'),
    subtitle:   d.doc_type ?? (isContract ? 'Intermediação de serviços de turismo' : 'Documento'),
    href:       `/documentos/${d.id}`,
    status:     d.status,
    severity:   null,
    created_at: d.created_at,
  }
}

interface Props {
  searchParams: Promise<{ tipo?: string; categoria?: string; status?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const { tipo, categoria, status } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: agency } = await supabase
    .from('agencies').select('name').eq('id', user!.id).single()

  // Casos e documentos são tabelas separadas, mas uma lista só para a agência.
  // O filtro de categoria só existe em casos; tipo e status são aplicados
  // depois do merge, para a regra valer igual nos dois conjuntos.
  let casesQuery = supabase
    .from('cases')
    .select('*, case_analyses(severity, review_status)')
    .eq('agency_id', user!.id)
    .order('created_at', { ascending: false })

  if (categoria) casesQuery = casesQuery.eq('category', categoria)

  const [{ data: cases }, { data: documents }] = await Promise.all([
    casesQuery,
    supabase
      .from('documents')
      .select('id, kind, title, doc_type, status, created_at')
      .eq('agency_id', user!.id)
      .order('created_at', { ascending: false }),
  ])

  // Uma categoria escolhida é um filtro de caso: documentos saem da lista.
  // `documents` vem null enquanto a migration não rodou — a lista segue com os casos.
  const items: PanelItem[] = [
    ...((cases ?? []) as Case[]).map(caseToItem),
    ...(categoria ? [] : ((documents ?? []) as AgencyDocument[]).map(documentToItem)),
  ]
    .filter(i => !tipo   || i.kind === tipo)
    .filter(i => !status || i.status === status)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  const hasFilter = !!tipo || !!categoria || !!status

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-5">
        <p className="j-overline">Painel</p>
        <h1 className="j-h1 mt-0.5 truncate">{agency?.name ?? 'Agência'}</h1>
      </div>

      {/* Ações: a primeira coisa na tela, antes do histórico */}
      <ActionCards variant="compact" />

      {/* Histórico */}
      <div className="mt-9">
        <div className="j-section-header mb-4">
          <div className="min-w-0">
            <h2 className="j-h2">Histórico</h2>
            <p className="j-caption mt-0.5">
              {hasFilter
                ? `${items.length} resultado${items.length !== 1 ? 's' : ''} filtrado${items.length !== 1 ? 's' : ''}`
                : items.length === 0
                  ? 'Contratos, documentos e casos aparecem aqui'
                  : `${items.length} ${items.length !== 1 ? 'itens' : 'item'} no total`}
            </p>
          </div>
        </div>

        {/* Filtros — só fazem sentido com algo para filtrar */}
        {(items.length > 0 || hasFilter) && (
          <DashboardFilters
            categories={CASE_CATEGORIES}
            currentTipo={tipo}
            currentCategoria={categoria}
            currentStatus={status}
          />
        )}

        {items.length === 0 ? (
          <div className="j-card text-center py-12">
            <FolderOpen className="w-9 h-9 text-ink-40 mx-auto mb-3" />
            {hasFilter ? (
              <>
                <h3 className="j-h3 mb-1">Nada encontrado</h3>
                <p className="j-caption mb-5">Tente remover os filtros para ver tudo</p>
                <Link href="/dashboard" className="btn btn-outline no-underline inline-flex">
                  Limpar filtros
                </Link>
              </>
            ) : (
              <>
                <h3 className="j-h3 mb-1">Nada registrado ainda</h3>
                <p className="j-caption">
                  Escolha uma ação acima para começar.{' '}
                  <Link href="/casos/novo?exemplo=voo" className="text-indigo hover:underline">
                    Ou teste com um caso de exemplo
                  </Link>
                  {' '}·{' '}
                  <Link href="/ajuda?secao=primeiros-passos" className="text-indigo hover:underline">
                    Passo a passo
                  </Link>
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="j-card p-0 overflow-hidden">
            <table className="j-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Tipo</th>
                  <th className="hidden md:table-cell">Assunto</th>
                  <th className="hidden sm:table-cell">Data</th>
                  <th className="hidden lg:table-cell">Severidade</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <ClickableRow key={`${item.kind}-${item.id}`} href={item.href}>
                    <td className="font-medium">
                      <Link href={item.href} className="no-underline text-ink hover:text-indigo transition-colors block">
                        {item.title}
                      </Link>
                    </td>
                    <td><KindBadge kind={item.kind} /></td>
                    <td className="text-ink-40 hidden md:table-cell">{item.subtitle}</td>
                    <td className="text-ink-40 whitespace-nowrap hidden sm:table-cell">
                      {formatDate(item.created_at)}
                    </td>
                    <td className="hidden lg:table-cell">
                      {item.severity
                        ? <SeverityBadge severity={item.severity} compact />
                        : <span className="text-ink-40">—</span>}
                    </td>
                    <td><StatusBadge status={item.status} /></td>
                    <td className="text-right">
                      <Link href={item.href} aria-label="Abrir" className="no-underline">
                        <ChevronRight className="w-4 h-4 text-ink-40 inline hover:text-indigo transition-colors" />
                      </Link>
                    </td>
                  </ClickableRow>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Descoberta do canal WhatsApp. Fica no fim para não empurrar a lista. */}
      <div className="mt-6">
        <WhatsappCta />
      </div>
    </div>
  )
}
