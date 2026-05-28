/**
 * phone.ts — Normalização de telefones para o formato Z-API brasileiro.
 *
 * Z-API envia números no formato: 55 + DDD (2) + 8 dígitos = 12 dígitos
 * (sem o nono dígito adicionado aos celulares brasileiros em 2012)
 *
 * Este formato é usado tanto para receber (webhook) quanto para armazenar
 * na tabela agencies, garantindo que o lookup sempre funcione.
 */

/**
 * Normaliza qualquer número brasileiro para o formato Z-API:
 * 55 + DDD (2 dígitos) + número (8 dígitos) = 12 dígitos total
 *
 * Exemplos:
 *   (54) 99908-2111    → 555499082111
 *   5554999082111      → 555499082111  (remove o 9 extra)
 *   555499082111       → 555499082111  (já correto)
 *   54999082111        → 555499082111  (adiciona DDI 55)
 */
export function normalizePhone(raw: string): string {
  // Remove tudo que não é dígito
  let digits = raw.replace(/\D/g, '')

  if (!digits) return ''

  // Garante DDI 55
  if (!digits.startsWith('55')) digits = '55' + digits

  // Se tiver 13 dígitos: 55 + DDD(2) + 9 + número(8) → remove o 9
  if (digits.length === 13) {
    digits = digits.slice(0, 4) + digits.slice(5)
  }

  return digits
}
