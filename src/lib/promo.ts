/**
 * promo.ts — Promoção de evento: 14 meses de acesso pelo preço de 12 no plano
 * anual, para quem se cadastrou pelo QR code distribuído na feira.
 *
 * O slug da campanha (`unav-2026`) nasceu no UNAV 2026 e NÃO muda de uma
 * edição para a outra: ele está impresso no QR code dos folders, e material
 * impresso não se corrige. O que muda a cada evento é o nome exibido e o
 * prazo de cadastro — por isso os dois moram aqui, num lugar só, em vez de
 * escritos à mão pelas telas.
 *
 * Como os dois eventos dividem a mesma etiqueta, no admin eles aparecem
 * somados: a separação se faz pela data de cadastro da agência.
 *
 * O prazo vale para o CADASTRO. A assinatura anual pode ser feita depois —
 * a elegibilidade fica gravada na agência (origem_campanha + created_at).
 *
 * Fonte única da regra: usada pelo webhook de cobrança (que concede o acesso),
 * pela tela de assinatura e pela landing page do evento.
 */

/** Meses de acesso de um plano anual comum. */
export const MESES_PLANO_ANUAL = 12

export const PROMO_EVENTO = {
  /** Etiqueta gravada em agencies.origem_campanha — é a que está no QR. */
  campanha: 'unav-2026',
  /** Evento desta edição, como aparece para quem chega pela landing page. */
  evento: 'Festuris 2026',
  /** Fim do prazo de cadastro: 30/11/2026, 23:59:59 no horário de Brasília. */
  cadastroAte: new Date('2026-11-30T23:59:59-03:00'),
  mesesBonus: 2,
} as const

/** Total de meses concedidos a quem tem direito à promoção. */
export const PROMO_EVENTO_MESES = MESES_PLANO_ANUAL + PROMO_EVENTO.mesesBonus

/** Campos da agência necessários para avaliar a promoção. */
export interface PromoAgency {
  origem_campanha?: string | null
  created_at?:      string | null
}

/** A agência se cadastrou pelo link do evento dentro do prazo? */
export function isPromoEventoEligible(agency?: PromoAgency | null): boolean {
  if (!agency?.created_at) return false
  if (agency.origem_campanha !== PROMO_EVENTO.campanha) return false
  return new Date(agency.created_at).getTime() <= PROMO_EVENTO.cadastroAte.getTime()
}

/**
 * Meses de acesso a conceder numa assinatura anual — 14 para quem tem direito
 * à promoção do evento, 12 para os demais.
 */
export function mesesPlanoAnual(agency?: PromoAgency | null): number {
  return isPromoEventoEligible(agency)
    ? PROMO_EVENTO_MESES
    : MESES_PLANO_ANUAL
}

/**
 * A promoção ainda está valendo para novos cadastros? Usado para decidir se a
 * landing page do evento deve anunciá-la.
 */
export function isPromoEventoAberta(now: Date = new Date()): boolean {
  return now.getTime() <= PROMO_EVENTO.cadastroAte.getTime()
}
