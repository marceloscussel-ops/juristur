/**
 * feedback-motivos.ts — tipos e motivos prontos do feedback rápido (👍/👎).
 *
 * Separado de feedback.ts para o componente do navegador importar sem levar
 * junto o cliente service role do Supabase.
 */

export type FeedbackTarget = 'case' | 'document'
export type FeedbackRating = 1 | -1

export interface FeedbackRow {
  id:          string
  agency_id:   string
  user_id:     string
  target_type: FeedbackTarget
  target_id:   string
  analysis_id: string | null
  rating:      FeedbackRating
  reasons:     string[]
  comment:     string | null
  created_at:  string
  updated_at:  string
}

/** O que a tela precisa para mostrar o voto já dado. */
export interface MeuFeedback {
  rating:  FeedbackRating
  reasons: string[]
  comment: string | null
}

/** Motivos prontos do 👎, por tipo de item. A ordem é a da tela. */
export const MOTIVOS_NEGATIVOS: Record<FeedbackTarget, string[]> = {
  case: [
    'Resposta genérica',
    'Faltou base legal',
    'Não entendeu meu caso',
    'Difícil de entender',
    'Outro',
  ],
  document: [
    'Documento com erro',
    'Faltou alguma cláusula',
    'Texto genérico',
    'Formatação ruim',
    'Outro',
  ],
}

/** Motivos prontos do 👍 — opcionais, ajudam a saber o que manter. */
export const MOTIVOS_POSITIVOS: Record<FeedbackTarget, string[]> = {
  case: ['Clara e objetiva', 'Bem fundamentada', 'Me deu segurança', 'Rápida'],
  document: ['Pronto para usar', 'Completo', 'Poupou tempo', 'Bem redigido'],
}

export const COMENTARIO_MAX = 1000
