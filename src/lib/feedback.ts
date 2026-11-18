/**
 * feedback.ts — 👍/👎 da agência sobre análises e documentos (lado servidor).
 *
 * Tabela `feedback` (migration 2026-11-18-feedback.sql), sem policies: tudo
 * passa por aqui com service role. Quem chama já validou que o item é da
 * agência do usuário.
 */
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import type { FeedbackTarget, MeuFeedback } from '@/lib/feedback-motivos'

export * from '@/lib/feedback-motivos'

export function feedbackDb() {
  return createServiceClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
}

/**
 * Feedback que este usuário já deu sobre o item, ou null.
 * Falha de leitura (inclusive tabela ainda não criada) vira null: a tela
 * apenas mostra a pergunta de novo, sem quebrar a página do caso.
 */
export async function getMeuFeedback(
  userId: string, targetType: FeedbackTarget, targetId: string,
): Promise<MeuFeedback | null> {
  const { data, error } = await feedbackDb()
    .from('feedback')
    .select('rating, reasons, comment')
    .eq('user_id', userId)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .maybeSingle()

  if (error) {
    if (error.code !== '42P01') console.error('[getMeuFeedback]', JSON.stringify(error))
    return null
  }
  return data as MeuFeedback | null
}
