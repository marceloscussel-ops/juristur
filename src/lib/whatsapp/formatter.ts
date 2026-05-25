/**
 * formatter.ts — Formata o texto da análise jurídica para WhatsApp.
 *
 * WhatsApp usa formatação própria:
 *   *texto*   = negrito
 *   _texto_   = itálico
 *   ~texto~   = tachado
 *   ```texto```= monoespaçado
 */

import { CASE_CATEGORIES } from '@/types'

const MAX_MSG_LENGTH = 4000 // limite seguro do WhatsApp
const MAX_PARTS      = 3    // máximo de mensagens consecutivas

/** Converte Markdown básico para formatação do WhatsApp. */
export function markdownToWhatsApp(text: string): string {
  return text
    // ## Título → *TÍTULO*
    .replace(/^#{1,3}\s+(.+)$/gm, '*$1*')
    // **negrito** → *negrito*
    .replace(/\*\*(.+?)\*\*/g, '*$1*')
    // _itálico_ já está ok
    // ~~tachado~~ → ~tachado~
    .replace(/~~(.+?)~~/g, '~$1~')
    // `código` → ```código```
    .replace(/`([^`]+)`/g, '```$1```')
    // Remove linhas com só ---
    .replace(/^[-─]+$/gm, '━━━━━━━━━━━━━━━━━━━━━━')
    .trim()
}

/** Quebra texto longo em até MAX_PARTS partes respeitando parágrafos. */
export function splitIntoMessages(text: string): string[] {
  if (text.length <= MAX_MSG_LENGTH) return [text]

  const parts: string[]  = []
  const paragraphs       = text.split(/\n\n+/)
  let   current          = ''

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para

    if (candidate.length > MAX_MSG_LENGTH && current) {
      parts.push(current.trim())
      current = para
      if (parts.length >= MAX_PARTS - 1) break
    } else {
      current = candidate
    }
  }

  if (current.trim()) parts.push(current.trim())

  return parts.slice(0, MAX_PARTS)
}

/** Formata a análise completa para WhatsApp e retorna array de mensagens. */
export function formatAnalysis(aiResponse: string, caseTitle?: string): string[] {
  const header = `📋 *ANÁLISE JURÍDICA DO SEU CASO*${caseTitle ? `\n_${caseTitle}_` : ''}
━━━━━━━━━━━━━━━━━━━━━━`

  const body   = markdownToWhatsApp(aiResponse)
  const footer = `\n━━━━━━━━━━━━━━━━━━━━━━
Deseja falar com um advogado sobre este caso?
1️⃣ Sim, quero contratar atendimento
2️⃣ Não, por enquanto`

  const full = `${header}\n\n${body}${footer}`
  return splitIntoMessages(full)
}

/** Monta o menu de categorias. */
export function categoryMenu(agencyName: string): string {
  const items = CASE_CATEGORIES.map((cat, i) => {
    const emoji = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣'][i] ?? `${i + 1}.`
    return `${emoji} ${cat}`
  }).join('\n')

  return `Olá, *${agencyName}*! 👋
Vou te ajudar a registrar um novo caso jurídico.

Qual categoria descreve seu problema?

${items}

_Digite o número da opção desejada._`
}

/** Parse da escolha de categoria pelo número digitado (1-9). */
export function parseCategory(text: string): string | null {
  const n = parseInt(text.trim(), 10)
  if (n >= 1 && n <= CASE_CATEGORIES.length) return CASE_CATEGORIES[n - 1]
  // Tentativa por texto livre
  const lower = text.toLowerCase()
  return CASE_CATEGORIES.find(c => c.toLowerCase().includes(lower)) ?? null
}
