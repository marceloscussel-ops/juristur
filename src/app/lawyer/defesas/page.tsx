import Link from 'next/link'
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'
import { AlertCircle, FolderOpen, ShieldCheck } from 'lucide-react'
import { env } from '@/lib/env'
import { formatDate } from '@/lib/datetime'
import { getDefenseInfo, planYearWindow, type DefenseAgency, type DefenseInfo } from '@/lib/plans'
import { DEFENSE_AGENCY_COLUMNS, DEFENSE_AGENCY_COLUMNS_BASE } from '@/lib/defesas'
import DefesaActions from '@/components/lawyer/DefesaActions'
import NovaDefesa from '@/components/lawyer/NovaDefesa'
import DashboardRefresh from '@/components/lawyer/DashboardRefresh'
import {
  DEFENSE_KIND_LABELS, DEFENSE_STATUS_LABELS,
  type DefenseKind, type DefenseStatus,
} from '@/types'

/**
 * Painel de defesas do advogado.
 *
 * É aqui que se decide o que a agência vê na tela de defesa: a solicitação
 * nasce como "aguardando" e só vira consumo da cota do plano quando o advogado
 * marca "defesa utilizada". A régua existe porque a maior parte dos pedidos
 * morre numa orientação por WhatsApp — cobrar a defesa inclusa por isso seria
 * injusto, e não cobrar nunca tornaria o limite do plano decorativo.
 *
 * O saldo de cada agência aparece na própria linha, para a decisão ser tomada
 * com a informação na frente (e para o advogado saber quando a defesa já é
 * cobrada à parte).
 */

function getServiceClient() {
  return createServiceClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
}

/**
 * Agências do painel + a lista do lançamento manual.
 *
 * Com fallback: `plan_started_at` é coluna nova e, sem a migration aplicada, o
 * PostgREST recusa a consulta inteira — a lista viria vazia e o painel pareceria
 * quebrado em vez de só não mostrar o ano de assinatura.
 */
/** Agência como o painel precisa dela: identificação + dados da cota. */
type AgenciaLinha = { id: string; name: string } & DefenseAgency

async function carregarAgencias(db: SupabaseClient): Promise<AgenciaLinha[]> {
  const completo = await db
    .from('agencies')
    .select(`id, name, ${DEFENSE_AGENCY_COLUMNS}`)
    .order('name')
    .limit(500)

  if (!completo.error) return (completo.data ?? []) as AgenciaLinha[]

  const basico = await db
    .from('agencies')
    .select(`id, name, ${DEFENSE_AGENCY_COLUMNS_BASE}`)
    .order('name')
    .limit(500)

  return (basico.data ?? []) as AgenciaLinha[]
}

const STATUS_BADGE: Record<DefenseStatus, string> = {
  solicitada: 'badge-amber',
  utilizada:  'badge-success',
  descartada: 'badge-muted',
}

const filterOptions = [
  { value: 'pendentes',  label: 'Aguardando' },
  { value: 'utilizadas', label: 'Utilizadas' },
  { value: 'todos',      label: 'Todas'      },
]

interface Props {
  searchParams: Promise<{ filtro?: string }>
}

export default async function LawyerDefesasPage({ searchParams }: Props) {
  const { filtro } = await searchParams
  const activeFilter = filtro ?? 'pendentes'

  const db = getServiceClient()

  let query = db
    .from('defense_requests')
    .select('id, agency_id, case_id, origin, kind, status, consumes_quota, subject, lawyer_notes, requested_at, used_at')
    .order('requested_at', { ascending: false })
    .limit(200)

  if (activeFilter === 'pendentes')       query = query.eq('status', 'solicitada')
  else if (activeFilter === 'utilizadas') query = query.eq('status', 'utilizada')

  const { data: pedidos, error } = await query

  const agencias = await carregarAgencias(db)

  const caseIds = Array.from(new Set((pedidos ?? []).map(p => p.case_id).filter(Boolean))) as string[]
  const { data: casos } = caseIds.length
    ? await db.from('cases').select('id, title, category').in('id', caseIds)
    : { data: [] }

  // Defesas já confirmadas (que descontam cota), para montar o saldo de cada
  // agência: uma consulta só, janela do ano calculada depois, em memória.
  const { data: confirmadas } = await db
    .from('defense_requests')
    .select('agency_id, used_at')
    .eq('status', 'utilizada')
    .eq('consumes_quota', true)
    .not('used_at', 'is', null)

  const { count: pendentesTotal } = await db
    .from('defense_requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'solicitada')

  const casoMap = Object.fromEntries((casos ?? []).map(c => [c.id, c]))

  // Saldo por agência: conta as confirmadas dentro do ano de assinatura dela.
  const saldo = new Map<string, DefenseInfo>()
  for (const a of agencias ?? []) {
    const startedAt = a.plan_started_at ? new Date(a.plan_started_at) : null
    const inicio = startedAt ? planYearWindow(startedAt).start.getTime() : 0
    const usedThisYear = (confirmadas ?? []).filter(
      c => c.agency_id === a.id && new Date(c.used_at as string).getTime() >= inicio
    ).length
    saldo.set(a.id, getDefenseInfo(a, { usedThisYear }))
  }

  const agenciaMap = Object.fromEntries((agencias ?? []).map(a => [a.id, a.name as string]))
  const opcoesAgencia = (agencias ?? []).map(a => ({
    id:    a.id as string,
    name:  a.name as string,
    saldo: resumoCurto(saldo.get(a.id as string)),
  }))

  return (
    <div className="animate-fade-in">
      <div className="j-section-header mb-6">
        <div>
          <p className="j-overline">Painel do Advogado</p>
          <h1 className="j-h1 mt-0.5">Defesas</h1>
          <p className="j-caption mt-1">
            {pendentesTotal
              ? `${pendentesTotal} solicitação${pendentesTotal !== 1 ? 'ões' : ''} aguardando sua marcação`
              : 'Nenhuma solicitação aguardando marcação'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <DashboardRefresh autoApprove={false} />
          <Link href="/lawyer/dashboard" className="btn btn-outline no-underline">
            Revisões
          </Link>
        </div>
      </div>

      <div className="j-alert j-alert-info mb-4">
        <ShieldCheck className="w-4 h-4 shrink-0" />
        <div>
          <span className="font-semibold">Marcar &ldquo;utilizada&rdquo; desconta a defesa do plano da agência. </span>
          Professional inclui 1 por ano e Enterprise 3, após 60 dias de carência; no Essential
          toda defesa é cobrada à parte. Use <strong>cobrada à parte</strong> para registrar o
          atendimento sem descontar da cota.
        </div>
      </div>

      {/* Lançamento de defesa que não passou pelo botão da plataforma */}
      <NovaDefesa agencias={opcoesAgencia} />

      <div className="flex gap-2 mb-4 mt-4 flex-wrap">
        {filterOptions.map(opt => (
          <Link
            key={opt.value}
            href={opt.value === 'pendentes' ? '/lawyer/defesas' : `/lawyer/defesas?filtro=${opt.value}`}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors no-underline border ${
              activeFilter === opt.value
                ? 'bg-indigo-solid text-white border-indigo-solid'
                : 'bg-card text-ink-40 border-line-strong hover:border-indigo hover:text-indigo'
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {error && (
        <div className="j-alert j-alert-danger mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          Erro ao carregar as defesas: {error.message}
          {error.code === '42P01' && (
            <> — a migration <code>2026-11-08-defesas-inclusas.sql</code> ainda não foi aplicada.</>
          )}
        </div>
      )}

      {!pedidos?.length ? (
        <div className="j-card text-center py-16">
          <FolderOpen className="w-10 h-10 text-ink-40 mx-auto mb-4" />
          <h2 className="j-h3 mb-1">Nenhuma defesa aqui</h2>
          <p className="j-caption">
            {activeFilter === 'pendentes'
              ? 'Nenhuma solicitação aguardando marcação.'
              : 'Nenhuma defesa neste filtro.'}
          </p>
        </div>
      ) : (
        <div className="j-card p-0 overflow-hidden">
          <table className="j-table">
            <thead>
              <tr>
                <th>Agência</th>
                <th>Pedido</th>
                <th>Saldo do plano</th>
                <th>Solicitada</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map(p => {
                const caso = p.case_id ? casoMap[p.case_id] : null
                const info = saldo.get(p.agency_id)
                return (
                  <tr key={p.id}>
                    <td className="font-medium">
                      {agenciaMap[p.agency_id] ?? '—'}
                      <span className="badge badge-muted ml-1.5">{info?.planLabel ?? '—'}</span>
                    </td>
                    <td className="text-ink-40">
                      {caso ? (
                        <Link href={`/lawyer/casos/${caso.id}`} className="no-underline text-ink hover:text-indigo">
                          {caso.title ?? caso.category}
                        </Link>
                      ) : (
                        p.subject || 'Pedido sem caso vinculado'
                      )}
                      <span className="block j-caption">
                        {DEFENSE_KIND_LABELS[p.kind as DefenseKind] ?? p.kind} · via {p.origin}
                      </span>
                    </td>
                    <td className="text-ink-40 whitespace-nowrap">{resumoCurto(info)}</td>
                    <td className="text-ink-40 whitespace-nowrap">{formatDate(p.requested_at)}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[p.status as DefenseStatus] ?? 'badge-muted'}`}>
                        {DEFENSE_STATUS_LABELS[p.status as DefenseStatus] ?? p.status}
                      </span>
                      {p.status === 'utilizada' && !p.consumes_quota && (
                        <span className="badge badge-muted ml-1.5">cobrada à parte</span>
                      )}
                    </td>
                    <td className="text-right">
                      <DefesaActions
                        id={p.id}
                        status={p.status as DefenseStatus}
                        notes={p.lawyer_notes}
                        temCotaDisponivel={!!info?.canUseIncluded}
                      />
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

/** Saldo em uma linha, para a tabela e para o seletor do lançamento manual. */
function resumoCurto(info?: DefenseInfo): string {
  if (!info) return '—'
  if (info.state === 'nao_incluida') return 'sem defesa inclusa'
  if (info.state === 'trial')        return `teste · ${info.used}/${info.total} pedidos`
  if (info.state === 'expirada')     return 'teste encerrado'
  if (info.state === 'carencia') {
    return `em carência até ${info.carenciaUntil ? formatDate(info.carenciaUntil) : '—'}`
  }
  return `${info.used}/${info.total} usadas no ano`
}
