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

/** DDDs válidos no Brasil (mapa oficial da Anatel). */
const VALID_DDD = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
])

/**
 * Valida se `raw` é um número brasileiro plausível para receber WhatsApp.
 *
 * Aplica a mesma normalização usada no armazenamento e exige:
 *   - 12 dígitos após normalizar (55 + DDD + 8 dígitos)
 *   - DDI 55
 *   - DDD pertencente ao mapa oficial da Anatel
 *
 * Mantém-se propositalmente permissivo quanto ao dígito do assinante para não
 * rejeitar números válidos durante o piloto (o custo de um falso negativo no
 * cadastro é maior que o de aceitar um número raro).
 */
export function isValidBrazilianMobile(raw: string): boolean {
  const digits = normalizePhone(raw)
  if (digits.length !== 12) return false
  if (!digits.startsWith('55')) return false
  return VALID_DDD.has(Number(digits.slice(2, 4)))
}
