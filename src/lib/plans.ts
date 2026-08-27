/**
 * plans.ts — Fonte única de verdade para planos e período gratuito.
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

/** Escaladas para advogado incluídas sem custo durante o período gratuito. */
export const TRIAL_ESCALATIONS = 2

export interface PlanDef {
  id:       AgencyPlan
  nome:     string
  tagline:  string
  mensal:   number
  anual:    number      // preço/mês no plano anual
  ativo:    boolean     // disponível para assinatura
  features: string[]
}

/** Catálogo de planos. Apenas "Essencial" está ativo no lançamento. */
export const PLANS: PlanDef[] = [
  {
    id: 'essencial',
    nome: 'Essential',
    tagline: 'Para a agência que está começando a se proteger.',
    mensal: 99,
    anual: 79,
    ativo: true,
    features: [
      'Consultas ilimitadas por IA',
      'Base legal sempre citada',
      'Base de casos reais + IA',
      'Histórico de casos',
      '1 usuário',
    ],
  },
  {
    id: 'profissional',
    nome: 'Professional',
    tagline: 'Para o dia a dia de uma agência ativa.',
    mensal: 222,
    anual: 177,
    ativo: false,
    features: [
      'Tudo do Essential',
      'Até 3 usuários',
      'Exportação de orientações',
      '2 escaladas para advogado / mês',
    ],
  },
  {
    id: 'enterprise',
    nome: 'Enterprise',
    tagline: 'Para operações maiores e mais exigentes.',
    mensal: 297,
    anual: 237,
    ativo: false,
    features: [
      'Tudo do Professional',
      'Até 5 usuários',
      '4 escaladas para advogado / mês',
      'Resposta humana em até 2h úteis',
      'Gestor de conta dedicado',
    ],
  },
]

export const PLAN_LABELS: Record<AgencyPlan, string> = {
  free:         'Gratuito',
  essencial:    'Essential',
  profissional: 'Professional',
  enterprise:   'Enterprise',
}

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

export type EscalationReason = 'ok' | 'quota_reached' | 'trial_expired'

export interface EscalationInfo {
  /** Escaladas já usadas pela agência (casos com escalated_at preenchido). */
  used:        number
  /** Escaladas restantes. Number.POSITIVE_INFINITY para assinantes. */
  remaining:   number
  /** Total incluído. null = ilimitado (assinante). */
  total:       number | null
  /** Se ainda pode escalar um novo caso. */
  canEscalate: boolean
  reason:      EscalationReason
}

/**
 * Calcula a cota de escaladas de uma agência.
 * - Assinante ativo: sem bloqueio (cobrança será implementada depois).
 * - Período gratuito: TRIAL_ESCALATIONS escaladas incluídas.
 * - Período expirado: bloqueado (precisa assinar).
 */
export function getEscalationInfo(trial: TrialInfo, used: number): EscalationInfo {
  if (trial.isActive) {
    return { used, remaining: Number.POSITIVE_INFINITY, total: null, canEscalate: true, reason: 'ok' }
  }
  if (trial.isExpired) {
    return { used, remaining: 0, total: TRIAL_ESCALATIONS, canEscalate: false, reason: 'trial_expired' }
  }
  const remaining = Math.max(0, TRIAL_ESCALATIONS - used)
  return {
    used,
    remaining,
    total:       TRIAL_ESCALATIONS,
    canEscalate: remaining > 0,
    reason:      remaining > 0 ? 'ok' : 'quota_reached',
  }
}
