/**
 * session.ts — Gerencia o estado da conversa por número de telefone.
 * Usa Supabase com service role para bypassar RLS (webhook não é autenticado).
 */

import { createClient } from '@supabase/supabase-js'
import type { WhatsappSession, WhatsappState } from '@/types'
import { env } from '@/lib/env'

const TIMEOUT_MINUTES = 30

function getServiceClient() {
  return createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
}

/** Dados temporários acumulados durante a conversa. */
export interface SessionData {
  category?:    string
  description?: string
  fileUrls?:    Array<{ url: string; name: string; type: string }>
  caseId?:      string
}

/** Busca sessão ativa para um número de telefone. */
export async function getSession(phone: string): Promise<WhatsappSession | null> {
  const supabase = getServiceClient()
  const timeout  = new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('phone', phone)
    .neq('current_state', 'completed')
    .gt('updated_at', timeout)
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  return data ?? null
}

/** Cria nova sessão para o número. */
export async function createSession(phone: string, agencyId: string): Promise<WhatsappSession> {
  const supabase = getServiceClient()

  // Encerra sessões antigas do mesmo número
  await supabase
    .from('whatsapp_sessions')
    .update({ current_state: 'completed' })
    .eq('phone', phone)

  const { data, error } = await supabase
    .from('whatsapp_sessions')
    .insert({
      agency_id:     agencyId,
      phone,
      current_state: 'awaiting_category' as WhatsappState,
      session_data:  {},
    })
    .select()
    .single()

  if (error || !data) throw new Error(`Erro ao criar sessão: ${error?.message}`)
  return data as WhatsappSession
}

/** Atualiza estado e dados da sessão. */
export async function updateSession(
  sessionId: string,
  state: WhatsappState,
  data?: Partial<SessionData>,
  caseId?: string
) {
  const supabase = getServiceClient()

  const updates: Record<string, unknown> = {
    current_state: state,
    updated_at:    new Date().toISOString(),
  }

  if (data !== undefined) {
    // Busca session_data atual e faz merge
    const { data: current } = await supabase
      .from('whatsapp_sessions')
      .select('session_data')
      .eq('id', sessionId)
      .single()

    updates.session_data = { ...(current?.session_data ?? {}), ...data }
  }

  if (caseId) updates.case_id = caseId

  await supabase.from('whatsapp_sessions').update(updates).eq('id', sessionId)
}

/**
 * Renova o relógio da sessão sem mudar de estado.
 *
 * `getSession` descarta sessões paradas há mais de TIMEOUT_MINUTES. Sem isto o
 * relógio correria desde a última troca de estado, e uma conversa de perguntas
 * e respostas morreria no meio mesmo estando ativa.
 */
export async function touchSession(sessionId: string) {
  const supabase = getServiceClient()
  await supabase
    .from('whatsapp_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', sessionId)
}

/**
 * Abre uma sessão já em follow-up, ligada a um caso, para a entrega assíncrona
 * da análise (caso que esperou a revisão do advogado e chega fora de qualquer
 * conversa em andamento).
 *
 * Se já houver sessão ativa para o número, não mexe em nada: a pessoa pode
 * estar no meio de OUTRO caso, e derrubar aquela conversa seria pior do que
 * ficar sem o follow-up deste. Retorna se a sessão foi aberta.
 */
export async function openFollowUpSession(
  phone:    string,
  agencyId: string,
  caseId:   string,
): Promise<boolean> {
  if (await getSession(phone)) return false

  const supabase = getServiceClient()

  await supabase
    .from('whatsapp_sessions')
    .update({ current_state: 'completed' })
    .eq('phone', phone)

  const { error } = await supabase.from('whatsapp_sessions').insert({
    agency_id:     agencyId,
    phone,
    current_state: 'follow_up' as WhatsappState,
    case_id:       caseId,
    session_data:  {},
  })

  return !error
}

/** Encerra a sessão (marca como completed). */
export async function closeSession(sessionId: string) {
  const supabase = getServiceClient()
  await supabase
    .from('whatsapp_sessions')
    .update({ current_state: 'completed', updated_at: new Date().toISOString() })
    .eq('id', sessionId)
}
