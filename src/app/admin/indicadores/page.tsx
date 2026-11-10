import { createClient as createServiceClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { appUrl } from '@/lib/urls'
import { hasActiveAccess, PLAN_LABELS } from '@/lib/plans'
import {
  listarIndicadores, listarComissoes, comissoesDevidas,
  type CommissionRow, type Partner,
} from '@/lib/partners'
import { StatTile } from '@/components/admin/Charts'
import AtribuirIndicacao from '@/components/admin/AtribuirIndicacao'
import type { AgencyPlan } from '@/types'

export const dynamic = 'force-dynamic'

function db() {
  return createServiceClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
}

const DIAS_30 = 30 * 86_400_000

interface AgencyRow {
  id:                    string
  name:                  string
  plan:                  string | null
  billing_cycle:         string | null
  subscription_status:   string | null
  trial_ends_at:         string | null
  access_until:          string | null
  created_at:            string
  partner_id:            string | null
  partner_attributed_at: string | null
}

const brl = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const data = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR') : '—'

const planLabel = (p?: string | null) =>
  PLAN_LABELS[(p ?? 'free') as AgencyPlan] ?? p ?? '—'

/** Situação da agência em uma palavra, para a coluna de status. */
function situacao(a: AgencyRow): string {
  if (hasActiveAccess(a)) {
    return a.subscription_status === 'canceled' ? 'Cancelada (no prazo)' : 'Assinante'
  }
  if (a.subscription_status === 'expired') return 'Sem acesso'
  return 'Em teste'
}

export default async function IndicadoresPage() {
  const supabase = db()

  const [indicadores, comissoes, { data: agencias }] = await Promise.all([
    listarIndicadores(),
    listarComissoes(),
    supabase
      .from('agencies')
      .select('id, name, plan, billing_cycle, subscription_status, trial_ends_at, access_until, created_at, partner_id, partner_attributed_at')
      .order('name'),
  ])

  const ags = (agencias ?? []) as AgencyRow[]
  const nomeDoIndicador = new Map(indicadores.map(p => [p.id, p.name]))

  // Opções do atribuidor manual: TODAS as agências, inclusive as já atribuídas
  // — é por ali que se corrige uma atribuição errada.
  const opcoes = ags.map(a => ({
    id:          a.id,
    name:        a.name,
    partnerName: a.partner_id ? nomeDoIndicador.get(a.partner_id) ?? null : null,
  }))

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h1 className="j-h1">Indicadores</h1>
        <p className="j-caption mt-1">
          Agências trazidas por indicação e comissão sobre o que elas pagaram ·
          base caixa (o que o Asaas confirmou), estorno já descontado
        </p>
      </div>

      {indicadores.length === 0 && (
        <div className="j-card">
          <p className="j-caption">
            Nenhum indicador cadastrado. A migração <code>2026-11-10-indicadores.sql</code>{' '}
            cria a UNAV; novos indicadores são linhas na tabela <code>partners</code>.
          </p>
        </div>
      )}

      {indicadores.map(p => (
        <BlocoIndicador key={p.id} partner={p} agencias={ags} comissoes={comissoes} />
      ))}

      <AtribuirIndicacao
        agencias={opcoes}
        indicadores={indicadores.filter(p => p.active).map(p => ({ slug: p.slug, name: p.name }))}
      />
    </div>
  )
}

function BlocoIndicador({ partner, agencias, comissoes }: {
  partner:   Partner
  agencias:  AgencyRow[]
  comissoes: CommissionRow[]
}) {
  const indicadas = agencias.filter(a => a.partner_id === partner.id)
  const assinantes = indicadas.filter(a => hasActiveAccess(a)).length

  // Extrato deste indicador, agrupado por agência. A regra do `recurring` é
  // aplicada por agência: só a primeira venda de cada uma, quando for o caso.
  const doIndicador = comissoes.filter(c => c.partner_id === partner.id)
  const porAgencia  = new Map<string, CommissionRow[]>()
  for (const linha of doIndicador) {
    const atual = porAgencia.get(linha.agency_id) ?? []
    atual.push(linha)
    porAgencia.set(linha.agency_id, atual)
  }

  const soma = (linhas: CommissionRow[], campo: 'value' | 'commission') =>
    linhas.reduce((s, l) => s + Number(l[campo] ?? 0), 0)

  const recebidoTotal = soma(doIndicador, 'value')
  const recebido30    = soma(
    doIndicador.filter(l => new Date(l.created_at).getTime() >= Date.now() - DIAS_30),
    'value',
  )

  const devidasPorAgencia = new Map<string, CommissionRow[]>()
  porAgencia.forEach((linhas, agencyId) => {
    devidasPorAgencia.set(agencyId, comissoesDevidas(linhas, partner.recurring))
  })
  const comissaoTotal = Array.from(devidasPorAgencia.values())
    .reduce((s, linhas) => s + soma(linhas, 'commission'), 0)

  const linkIndicacao = `${appUrl()}/i/${partner.slug}`

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="j-h2">
          {partner.name}
          {!partner.active && <span className="j-caption ml-2">(inativo)</span>}
        </h2>
        <p className="j-caption">
          {Number(partner.commission_pct)}% ·{' '}
          {partner.recurring ? 'toda renovação' : 'somente a primeira venda'} ·{' '}
          <span className="font-mono">{linkIndicacao}</span>
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Agências indicadas" value={indicadas.length.toLocaleString('pt-BR')}
                  sub={`${assinantes} com acesso ativo`} accent="var(--j-indigo)" />
        <StatTile label="Assinantes" value={assinantes.toLocaleString('pt-BR')}
                  sub={indicadas.length
                    ? `${Math.round((assinantes / indicadas.length) * 100)}% das indicadas`
                    : 'nenhuma indicação ainda'}
                  accent="var(--j-teal)" />
        <StatTile label="Pago pelas indicadas" value={brl(recebidoTotal)}
                  sub={`${brl(recebido30)} nos últimos 30 dias`} accent="var(--j-ink)" />
        <StatTile label="Comissão acumulada" value={brl(comissaoTotal)}
                  sub={partner.commission_pct
                    ? `${Number(partner.commission_pct)}% do que foi recebido`
                    : 'percentual ainda não definido'}
                  accent="var(--j-coral)" />
      </div>

      <div className="j-card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="j-table">
            <thead>
              <tr>
                <th>Agência</th>
                <th>Plano</th>
                <th>Ciclo</th>
                <th>Situação</th>
                <th style={{ textAlign: 'right' }}>Valor pago</th>
                <th style={{ textAlign: 'right' }}>Comissão</th>
                <th>Indicada em</th>
              </tr>
            </thead>
            <tbody>
              {indicadas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-ink-40">
                    Nenhuma agência indicada por {partner.name} ainda.
                  </td>
                </tr>
              ) : (
                indicadas.map(a => {
                  const linhas  = porAgencia.get(a.id) ?? []
                  const devidas = devidasPorAgencia.get(a.id) ?? []
                  return (
                    <tr key={a.id}>
                      <td className="font-medium">{a.name}</td>
                      <td>{planLabel(a.plan)}</td>
                      <td>{a.billing_cycle ?? '—'}</td>
                      <td>{situacao(a)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {linhas.length ? brl(soma(linhas, 'value')) : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {devidas.length ? brl(soma(devidas, 'commission')) : '—'}
                      </td>
                      <td>{data(a.partner_attributed_at ?? a.created_at)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
