// Formatação de datas sempre no fuso do Brasil (America/Sao_Paulo).
// Necessário porque os componentes de servidor rodam em UTC no Vercel —
// sem timeZone explícito as datas saíam ~3h adiantadas.

const TZ = 'America/Sao_Paulo'

type DateInput = Date | string | number

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value)
}

/** Ex.: 29/08/2026 */
export function formatDate(value: DateInput): string {
  return toDate(value).toLocaleDateString('pt-BR', { timeZone: TZ })
}

/** Ex.: 29 de agosto de 2026 */
export function formatDateLong(value: DateInput): string {
  return toDate(value).toLocaleDateString('pt-BR', {
    timeZone: TZ,
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

/** Ex.: 29/08/2026, 22:15 */
export function formatDateTime(value: DateInput): string {
  return toDate(value).toLocaleString('pt-BR', {
    timeZone: TZ,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/** Ex.: 29 de agosto de 2026, 22:15 */
export function formatDateTimeLong(value: DateInput): string {
  return toDate(value).toLocaleDateString('pt-BR', {
    timeZone: TZ,
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/** Ex.: 29 de ago., 22:15 (compacto, para timestamps de mensagens) */
export function formatDayMonthTime(value: DateInput): string {
  return toDate(value).toLocaleDateString('pt-BR', {
    timeZone: TZ,
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

/** Ex.: 22:15 */
export function formatTime(value: DateInput): string {
  return toDate(value).toLocaleTimeString('pt-BR', {
    timeZone: TZ,
    hour: '2-digit', minute: '2-digit',
  })
}
