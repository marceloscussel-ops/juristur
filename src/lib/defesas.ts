/**
 * defesas.ts — Cota de defesa do plano, do lado do servidor.
 *
 * Divisão de papéis, que é o coração desta feature:
 *   · a AGÊNCIA cria a solicitação (`defense_requests`, status 'solicitada');
 *   · o ADVOGADO é quem marca que a defesa foi realmente utilizada
 *     ('utilizada'), e só isso desconta da cota do plano.
 *
 * Pedir defesa não consome a defesa inclusa — muita solicitação morre numa
 * orientação por WhatsApp. Por isso a contagem não pode sair de
 * `cases.escalated_at` (que marca o pedido), e sim das linhas confirmadas.
 *
 * As regras de quanto cada plano inclui vivem em `plans.ts`; aqui só se lê o
 * banco e se contam as linhas da janela vigente.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getDefenseInfo, planYearWindow, type DefenseAgency, type DefenseInfo } from '@/lib/plans'
import type { DefenseKind, DefenseOrigin, DefenseStatus } from '@/types'

/** Qualquer client do Supabase: o do SSR (agencia) ou o service role. */
type Db = SupabaseClient

/**
 * Colunas da agência necessárias para calcular a cota.
 *
 * `plan_started_at` é nova (migration 2026-11-08-defesas-inclusas). Pedir uma
 * coluna inexistente faz o PostgREST rejeitar a consulta INTEIRA — e a agência
 * voltaria como null, isto é, assinante ativo apareceria como "período
 * gratuito" e teria a defesa barrada. Por isso existe o fallback abaixo.
 */
export const DEFENSE_AGENCY_COLUMNS_BASE =
  'plan, subscription_status, trial_ends_at, created_at, access_until'

export const DEFENSE_AGENCY_COLUMNS = `${DEFENSE_AGENCY_COLUMNS_BASE}, plan_started_at`

/** Lê a agência para a cota de defesa, tolerando banco sem a migration. */
export async function loadDefenseAgency(db: Db, agencyId: string): Promise<DefenseAgency> {
  const completo = await db
    .from('agencies')
    .select(DEFENSE_AGENCY_COLUMNS)
    .eq('id', agencyId)
    .maybeSingle()

  if (!completo.error) return (completo.data as DefenseAgency | null) ?? {}

  const basico = await db
    .from('agencies')
    .select(DEFENSE_AGENCY_COLUMNS_BASE)
    .eq('id', agencyId)
    .maybeSingle()

  return (basico.data as DefenseAgency | null) ?? {}
}

/**
 * Conta as defesas confirmadas pelo advogado na janela informada e as
 * solicitações ainda em aberto.
 *
 * Tolerante a falha: se a tabela ainda não existe no banco (migration não
 * aplicada), devolve zeros em vez de derrubar a página — o pior caso é a
 * agência ver a cota cheia, nunca uma tela de erro.
 */
async function contarDefesas(
  db: Db,
  agencyId: string,
  periodStart: Date | null,
): Promise<{ usedThisYear: number; pending: number }> {
  try {
    let usadas = db
      .from('defense_requests')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .eq('status', 'utilizada')
      .eq('consumes_quota', true)

    if (periodStart) usadas = usadas.gte('used_at', periodStart.toISOString())

    const [{ count: used, error: e1 }, { count: pending, error: e2 }] = await Promise.all([
      usadas,
      db
        .from('defense_requests')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agencyId)
        .eq('status', 'solicitada'),
    ])

    if (e1 || e2) {
      console.error('[defesas] contagem falhou:', e1?.message ?? e2?.message)
      return { usedThisYear: 0, pending: 0 }
    }
    return { usedThisYear: used ?? 0, pending: pending ?? 0 }
  } catch (err) {
    console.error('[defesas] contagem falhou:', err instanceof Error ? err.message : err)
    return { usedThisYear: 0, pending: 0 }
  }
}

/**
 * Solicitações feitas no período gratuito — a régua do trial é por PEDIDO.
 *
 * Conta os dois registros e fica com o maior: `defense_requests` (a partir
 * desta feature) e `cases.escalated_at` (como era antes dela). O máximo, e não
 * a soma, porque toda escalada nova grava nos dois lugares — somar contaria em
 * dobro. O preço é subcontar quem, na transição, tinha escalada antiga E fez um
 * pedido solto novo; em 7 dias de teste é um caso de borda aceitável.
 */
async function contarSolicitacoesTrial(db: Db, agencyId: string): Promise<number> {
  const [{ count: escaladas }, solicitacoes] = await Promise.all([
    db
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .not('escalated_at', 'is', null),
    db
      .from('defense_requests')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .then(r => (r.error ? 0 : r.count ?? 0), () => 0) as Promise<number>,
  ])
  return Math.max(escaladas ?? 0, solicitacoes)
}

/**
 * Cota de defesa da agência, pronta para a UI. Uma leitura da agência + as
 * contagens da janela vigente.
 */
export async function loadDefenseInfo(
  db: Db,
  agencyId: string,
  agencyRow?: DefenseAgency | null,
): Promise<DefenseInfo> {
  const agency = agencyRow ?? (await loadDefenseAgency(db, agencyId))

  const startedAt = agency.plan_started_at ? new Date(agency.plan_started_at) : null
  const periodStart = startedAt ? planYearWindow(startedAt).start : null

  const [{ usedThisYear, pending }, trialRequests] = await Promise.all([
    contarDefesas(db, agencyId, periodStart),
    contarSolicitacoesTrial(db, agencyId),
  ])

  return getDefenseInfo(agency, { usedThisYear, pending, trialRequests })
}

// ─── Registro da solicitação ──────────────────────────────────────────────────

export interface NovaSolicitacao {
  agencyId: string
  caseId?:  string | null
  origin?:  DefenseOrigin
  kind?:    DefenseKind
  subject?: string | null
  /** Já nasce marcada como utilizada (lançamento feito pelo advogado). */
  status?:  DefenseStatus
  consumesQuota?: boolean
  lawyerNotes?:   string | null
  decidedBy?:     string | null
  planAtUse?:     string | null
}

/**
 * Registra uma solicitação de defesa. Idempotente por caso: o índice único
 * `defense_requests_case_unique_idx` garante uma linha por caso, então a
 * segunda chamada (clique repetido, reenvio de webhook) não duplica.
 *
 * Nunca lança: perder o registro é ruim, mas barrar o atendimento da agência
 * por causa dele é pior. Devolve o id, ou null quando nada foi gravado.
 */
export async function registrarSolicitacaoDefesa(
  db: Db,
  input: NovaSolicitacao,
): Promise<string | null> {
  const agora = new Date().toISOString()
  const status = input.status ?? 'solicitada'
  const row = {
    agency_id:      input.agencyId,
    case_id:        input.caseId ?? null,
    origin:         input.origin ?? 'web',
    kind:           input.kind ?? 'defesa',
    status,
    consumes_quota: input.consumesQuota ?? true,
    subject:        input.subject ?? null,
    lawyer_notes:   input.lawyerNotes ?? null,
    requested_at:   agora,
    used_at:        status === 'utilizada' ? agora : null,
    decided_at:     status === 'solicitada' ? null : agora,
    decided_by:     input.decidedBy ?? null,
    plan_at_use:    input.planAtUse ?? null,
  }

  const { data, error } = await db
    .from('defense_requests')
    .insert(row)
    .select('id')
    .maybeSingle()

  if (error) {
    // 23505 = unique_violation → já existe solicitação para este caso.
    if (error.code !== '23505') {
      console.error('[defesas] falha ao registrar solicitação:', error.message)
    }
    return null
  }
  return data?.id ?? null
}
