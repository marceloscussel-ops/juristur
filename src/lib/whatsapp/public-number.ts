/**
 * public-number.ts — O número público do TurisGuard no WhatsApp.
 *
 * É por ele que a agência abre casos pela conversa: o webhook identifica quem
 * está falando pelo telefone do REMETENTE, então o link só precisa abrir o chat
 * com a gente. Este número tem que ser o mesmo conectado à instância do provider
 * (hoje Z-API) — se divergirem, o link abre uma conversa que ninguém lê.
 *
 * `process.env.NEXT_PUBLIC_WHATSAPP_NUMBER` aparece escrito por extenso porque o
 * Next só inlina no bundle do cliente os acessos com nome literal.
 */

/** Só dígitos (ex.: 5554999082111). Vazio quando a env var não está configurada. */
export const WHATSAPP_NUMBER = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '').replace(/\D/g, '')

/**
 * Link wa.me para o nosso número, opcionalmente com mensagem pré-preenchida.
 * Retorna string vazia se o número não estiver configurado — quem chama decide
 * se esconde o botão (melhor que oferecer um link quebrado).
 */
export function whatsappLink(text?: string): string {
  if (!WHATSAPP_NUMBER) return ''
  const base = `https://wa.me/${WHATSAPP_NUMBER}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

/** Formata para leitura humana: 5554999082111 → +55 (54) 99908-2111 */
export function formatWhatsappNumber(digits: string = WHATSAPP_NUMBER): string {
  const m = digits.match(/^(\d{2})(\d{2})(\d{4,5})(\d{4})$/)
  return m ? `+${m[1]} (${m[2]}) ${m[3]}-${m[4]}` : digits
}
