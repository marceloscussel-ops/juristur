/**
 * plans.ts — Fonte única de verdade para planos, período gratuito e defesas
 * inclusas.
 *
 * Novos cadastros ganham 7 dias grátis. Agências que já se cadastraram no
 * piloto (30 dias) mantêm o prazo original, pois `trial_ends_at` foi gravado
 * na criação e tem prioridade sobre este valor em getTrialInfo().
 * Este número precisa espelhar o INTERVAL do trigger handle_new_user em
 * supabase/schema.sql.
 */

import type { AgencyPlan } from '@/types'

/** Dias de acesso gratuito concedidos a novos cadastros. */
export const TRIAL_DAYS = 7

/** Solicitações de defesa (advogado) incluídas sem custo no período gratuito. */
export const TRIAL_ESCALATIONS = 2

/**
 * Carência contratual para usar a defesa inclusa no plano (Cláusula Terceira,
 * Parágrafo Segundo): nos primeiros 60 dias de assinatura a plataforma funciona
 * normalmente, mas o escalonamento sem custo ainda não está disponível.
 */
export const CARENCIA_DEFESA_DIAS = 60

/**
 * Usuários permitidos durante o período gratuito.
 *
 * A agência em avaliação não tem plano (`plan = 'free'`), e deixá-la com um
 * assento só esconderia a equipe justamente de quem está decidindo se assina.
 * Espelha o Professional, como TRIAL_ESCALATIONS já faz com as defesas.
 */
export const TRIAL_USUARIOS = 3

export interface PlanDef {
  id:       AgencyPlan
  nome:     string
  tagline:  string
  mensal:   number
  anual:    number      // preço/mês no plano anual
  ativo:    boolean     // disponível para assinatura
  /**
   * Defesas (escalonamentos para advogado) inclusas por ano de assinatura.
   * 0 = nenhuma inclusa; a agência pode escalonar, mas com custo acertado
   * direto com o advogado (Cláusula Terceira, Parágrafo Terceiro).
   */
  defesasAno: number
  usuarios: number      // assentos incluídos (o titular conta como um)
  features: string[]
}

/** Catálogo de planos. */
export const PLANS: PlanDef[] = [
  {
    id: 'essencial',
    nome: 'Essential',
    tagline: 'Para a agência que está começando a se proteger.',
    mensal: 99,
    anual: 79,
    ativo: true,
    defesasAno: 0,
    usuarios: 1,
    features: [
      'Consultas ilimitadas por IA',
      'Base legal sempre citada',
      'Base de casos reais + IA',
      'Geração de contratos e documentos',
      'Histórico de casos',
      '1 usuário',
      'Defesa com advogado sob orçamento',
    ],
  },
  {
    id: 'profissional',
    nome: 'Professional',
    tagline: 'Para o dia a dia de uma agência ativa.',
    mensal: 169,
    anual: 135,
    ativo: true,
    defesasAno: 1,
    usuarios: 3,
    features: [
      'Tudo do Essential',
      '1 defesa com advogado inclusa por ano',
      'Até 3 usuários',
      'Exportação de orientações',
    ],
  },
  {
    id: 'enterprise',
    nome: 'Enterprise',
    tagline: 'Para operações maiores e mais exigentes.',
    mensal: 297,
    anual: 237,
    ativo: true,
    defesasAno: 3,
    usuarios: 5,
    features: [
      'Tudo do Professional',
      '3 defesas com advogado inclusas por ano',
      'Até 5 usuários',
      'Resposta humana em até 2h úteis',
    ],
  },
]

export const PLAN_LABELS: Record<AgencyPlan, string> = {
  free:         'Gratuito',
  essencial:    'Essential',
  profissional: 'Professional',
  enterprise:   'Enterprise',
}

/** Planos que podem ser assinados agora. */
export function activePlans(): PlanDef[] {
  return PLANS.filter(p => p.ativo)
}

/** Definição de um plano pelo id. undefined para 'free' / id desconhecido. */
export function planById(id?: string | null): PlanDef | undefined {
  return PLANS.find(p => p.id === id)
}

/** Defesas inclusas por ano no plano (0 quando não há plano pago). */
export function defesasInclusas(plan?: string | null): number {
  return planById(plan)?.defesasAno ?? 0
}

/** Texto do Anexo I: direito a escalonamento conforme o plano contratado. */
export function escalonamentosLabel(plan?: string | null): string {
  const n = defesasInclusas(plan)
  if (n === 0) return 'Nenhum escalonamento incluso — sob orçamento com o advogado'
  const cardinal = n === 1 ? '1 (um) escalonamento' : `${n} (${NUMERAL[n] ?? n}) escalonamentos`
  return `${cardinal} por ano, após a carência de ${CARENCIA_DEFESA_DIAS} dias`
}

/** Numerais por extenso usados no Anexo I (só o que os planos usam). */
const NUMERAL: Record<number, string> = { 1: 'um', 2: 'dois', 3: 'três', 4: 'quatro', 5: 'cinco' }

export interface TrialInfo {
  /** Dias inteiros restantes (>= 0). 0 = expira hoje ou já expirou. */
  daysLeft:   number
  /** Está no período gratuito (não assinou e ainda dentro do prazo). */
  isTrial:    boolean
  /** Período gratuito terminou e não há assinatura ativa. */
  isExpired:  boolean
  /** Assinatura paga ativa. */
  isActive:   boolean
  /** Data de término do período gratuito. */
  endsAt:     Date | null
}

/** Tipo mínimo de agência para as regras de acesso/cobrança. */
export interface AgencyAccess {
  subscription_status?: string | null
  trial_ends_at?:       string | null
  created_at?:          string | null
  access_until?:        string | null
}

/**
 * Acesso pago válido. Governado pelo `access_until`: enquanto ele estiver no
 * futuro, a agência tem acesso — mesmo que a assinatura já tenha sido CANCELADA
 * (cancelamento vale até o fim do ciclo já pago). Estorno/chargeback zeram o
 * `access_until`, cortando na hora. Sem `access_until` (dados antigos), cai no
 * status `active`. Fonte única da regra — usada pelo middleware e pela UI.
 */
export function hasActiveAccess(agency: AgencyAccess): boolean {
  if (agency.access_until) return new Date(agency.access_until).getTime() > Date.now()
  return agency.subscription_status === 'active'
}

/**
 * Calcula o estado do período gratuito de uma agência.
 * Robusto a trial_ends_at ausente (fallback: created_at + TRIAL_DAYS).
 */
export function getTrialInfo(agency: AgencyAccess): TrialInfo {
  const isActive = hasActiveAccess(agency)

  const endsAt = agency.trial_ends_at
    ? new Date(agency.trial_ends_at)
    : agency.created_at
      ? new Date(new Date(agency.created_at).getTime() + TRIAL_DAYS * 86_400_000)
      : null

  if (isActive) {
    return { daysLeft: 0, isTrial: false, isExpired: false, isActive: true, endsAt }
  }

  if (!endsAt) {
    return { daysLeft: TRIAL_DAYS, isTrial: true, isExpired: false, isActive: false, endsAt: null }
  }

  const msLeft   = endsAt.getTime() - Date.now()
  const daysLeft = Math.max(0, Math.ceil(msLeft / 86_400_000))
  const isExpired = msLeft <= 0

  return {
    daysLeft,
    isTrial:   !isExpired,
    isExpired,
    isActive:  false,
    endsAt,
  }
}

// ─── Defesas inclusas no plano ────────────────────────────────────────────────

/**
 * Janela do "ano de assinatura" vigente: do último aniversário da ativação até
 * o próximo. É nela que a cota de defesas do plano é contada — a cota reseta no
 * aniversário da assinatura, não em 1º de janeiro.
 */
export function planYearWindow(startedAt: Date, now: Date = new Date()): { start: Date; end: Date } {
  const aniversario = (anos: number) => {
    const d = new Date(startedAt.getTime())
    d.setFullYear(startedAt.getFullYear() + anos)
    return d
  }
  let anos = now.getFullYear() - startedAt.getFullYear()
  if (aniversario(anos).getTime() > now.getTime()) anos -= 1
  if (anos < 0) anos = 0
  return { start: aniversario(anos), end: aniversario(anos + 1) }
}

/**
 * Situação da agência quanto à defesa:
 *  - `trial`        período gratuito, com solicitações incluídas
 *  - `expirada`     período gratuito terminou sem assinatura (bloqueado)
 *  - `incluida`     assinante com defesa inclusa disponível agora
 *  - `carencia`     assinante dentro dos 60 dias de carência
 *  - `esgotada`     assinante que já usou as defesas do ano
 *  - `nao_incluida` plano sem defesa inclusa (Essential)
 */
export type DefenseState =
  | 'trial'
  | 'expirada'
  | 'incluida'
  | 'carencia'
  | 'esgotada'
  | 'nao_incluida'

export interface DefenseCounts {
  /** Defesas confirmadas pelo advogado no ano vigente, descontando cota. */
  usedThisYear?:  number
  /** Solicitações ainda aguardando o advogado marcar. */
  pending?:       number
  /** Solicitações feitas no período gratuito (qualquer status). */
  trialRequests?: number
}

export interface DefenseInfo {
  plan:      AgencyPlan
  planLabel: string
  state:     DefenseState
  /** Inclusas no período vigente (ano de assinatura, ou período gratuito). */
  total:     number
  /** Já utilizadas no período vigente. */
  used:      number
  /** Ainda inclusas (total − used), nunca negativo. */
  remaining: number
  /** Solicitações na fila do advogado. */
  pending:   number
  /** Pode registrar uma nova solicitação de defesa. */
  canRequest:     boolean
  /** A próxima solicitação é coberta pelo plano (sem custo adicional). */
  canUseIncluded: boolean
  /** Fim da carência de 60 dias; null se já venceu ou não se aplica. */
  carenciaUntil:  Date | null
  /** Janela do ano de assinatura usada na contagem (null fora de assinatura). */
  periodStart: Date | null
  periodEnd:   Date | null
}

/** Agência, do ponto de vista da cota de defesas. */
export interface DefenseAgency extends AgencyAccess {
  plan?:            string | null
  plan_started_at?: string | null
}

/**
 * Calcula a cota de defesa de uma agência.
 *
 * Período gratuito: TRIAL_ESCALATIONS solicitações, contadas por SOLICITAÇÃO
 * (é a régua do funil, não do serviço prestado) — e esgotá-la bloqueia.
 *
 * Assinante: a cota é a do plano, por ano de assinatura, e conta apenas o que o
 * ADVOGADO marcou como utilizado — pedir não é consumir. Sem cota disponível a
 * solicitação não é bloqueada: fica registrada e o custo é acertado direto com
 * o advogado, como prevê o contrato.
 */
export function getDefenseInfo(agency: DefenseAgency, counts: DefenseCounts = {}): DefenseInfo {
  const trial   = getTrialInfo(agency)
  const plan    = (agency.plan ?? 'free') as AgencyPlan
  const pending = counts.pending ?? 0

  const base = {
    plan,
    planLabel: PLAN_LABELS[plan] ?? PLAN_LABELS.free,
    pending,
  }

  // Sem assinatura ativa: vale a régua do período gratuito.
  if (!trial.isActive) {
    const used      = counts.trialRequests ?? 0
    const remaining = Math.max(0, TRIAL_ESCALATIONS - used)
    const expirada  = trial.isExpired
    return {
      ...base,
      state:          expirada ? 'expirada' : 'trial',
      total:          TRIAL_ESCALATIONS,
      used,
      remaining:      expirada ? 0 : remaining,
      canRequest:     !expirada && remaining > 0,
      canUseIncluded: !expirada && remaining > 0,
      carenciaUntil:  null,
      periodStart:    null,
      periodEnd:      null,
    }
  }

  // Assinante: cota do plano, por ano de assinatura.
  const startedAt = agency.plan_started_at
    ? new Date(agency.plan_started_at)
    : agency.created_at
      ? new Date(agency.created_at)
      : new Date()

  const { start, end } = planYearWindow(startedAt)
  const total     = defesasInclusas(plan)
  const used      = Math.max(0, counts.usedThisYear ?? 0)
  const remaining = Math.max(0, total - used)

  const fimCarencia = new Date(startedAt.getTime() + CARENCIA_DEFESA_DIAS * 86_400_000)
  const emCarencia  = total > 0 && fimCarencia.getTime() > Date.now()

  const state: DefenseState =
    total === 0       ? 'nao_incluida'
    : emCarencia      ? 'carencia'
    : remaining === 0 ? 'esgotada'
    :                   'incluida'

  return {
    ...base,
    state,
    total,
    used,
    remaining,
    canRequest:     true,
    canUseIncluded: state === 'incluida',
    carenciaUntil:  emCarencia ? fimCarencia : null,
    periodStart:    start,
    periodEnd:      end,
  }
}

/** Assentos incluídos no plano. `free` (avaliação) cai em TRIAL_USUARIOS. */
export function usuariosDoPlano(plan: AgencyPlan | null | undefined): number {
  return PLANS.find(p => p.id === plan)?.usuarios ?? TRIAL_USUARIOS
}

export type SeatReason = 'ok' | 'seats_reached' | 'trial_expired'

export interface SeatInfo {
  /**
   * Assentos ocupados: usuários ativos + convites pendentes, o titular
   * incluído. Convite conta porque já vai virar acesso quando for aceito.
   */
  used:      number
  /** Assentos do plano (ou do período gratuito). */
  total:     number
  /** Assentos livres. */
  remaining: number
  /** Se ainda cabe convidar alguém. */
  canInvite: boolean
  reason:    SeatReason
}

/**
 * Calcula a cota de usuários de uma agência — irmã de getEscalationInfo().
 *
 * O plano assinado manda; sem assinatura ativa vale o teto do período
 * gratuito. Período expirado bloqueia o convite: a conta já está no gate de
 * cobrança, e convidar alguém para uma conta sem acesso não ajudaria ninguém.
 *
 * Passar do teto não bloqueia o downgrade: os excedentes viram 'suspenso' e o
 * titular escolhe quem reativa (suspenderExcedentes, em src/lib/equipe.ts).
 */
export function getSeatInfo(
  plan:  AgencyPlan | null | undefined,
  trial: TrialInfo,
  used:  number,
): SeatInfo {
  const total = trial.isActive ? usuariosDoPlano(plan) : TRIAL_USUARIOS

  if (trial.isExpired) {
    return { used, total, remaining: 0, canInvite: false, reason: 'trial_expired' }
  }

  const remaining = Math.max(0, total - used)
  return {
    used,
    total,
    remaining,
    canInvite: remaining > 0,
    reason:    remaining > 0 ? 'ok' : 'seats_reached',
  }
}
