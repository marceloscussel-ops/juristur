/**
 * promo.ts — Promoção do evento UNAV 2026.
 *
 * Quem se cadastrou pelo link do evento (utm_campaign=unav-2026) até
 * 30/09/2026 ganha 2 meses a mais ao assinar o plano anual: 14 meses em vez
 * de 12.
 *
 * O prazo vale para o CADASTRO. A assinatura anual pode ser feita depois —
 * a elegibilidade fica gravada na agência (origem_campanha + created_at).
 *
 * Fonte única da regra: usada pelo webhook de cobrança (que concede o acesso),
 * pela tela de assinatura e pela landing page do evento.
 */

/** Meses de acesso de um plano anual comum. */
export const MESES_PLANO_ANUAL = 12

export const UNAV_PROMO = {
  campanha:   'unav-2026',
  /** Fim do prazo de cadastro: 30/09/2026, 23:59:59 no horário de Brasília. */
  cadastroAte: new Date('2026-09-30T23:59:59-03:00'),
  mesesBonus:  2,
} as const

/** Total de meses concedidos a quem tem direito à promoção. */
export const UNAV_PROMO_MESES = MESES_PLANO_ANUAL + UNAV_PROMO.mesesBonus

/** Campos da agência necessários para avaliar a promoção. */
export interface PromoAgency {
  origem_campanha?: string | null
  created_at?:      string | null
}

/** A agência se cadastrou pelo link do evento dentro do prazo? */
export function isUnavPromoEligible(agency?: PromoAgency | null): boolean {
  if (!agency?.created_at) return false
  if (agency.origem_campanha !== UNAV_PROMO.campanha) return false
  return new Date(agency.created_at).getTime() <= UNAV_PROMO.cadastroAte.getTime()
}

/**
 * Meses de acesso a conceder numa assinatura anual — 14 para quem tem direito
 * à promoção do evento, 12 para os demais.
 */
export function mesesPlanoAnual(agency?: PromoAgency | null): number {
  return isUnavPromoEligible(agency)
    ? UNAV_PROMO_MESES
    : MESES_PLANO_ANUAL
}

/**
 * A promoção ainda está valendo para novos cadastros? Usado para decidir se a
 * landing page do evento deve anunciá-la.
 */
export function isUnavPromoAberta(now: Date = new Date()): boolean {
  return now.getTime() <= UNAV_PROMO.cadastroAte.getTime()
}
