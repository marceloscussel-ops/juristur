/**
 * session.ts — Gerencia o estado da conversa por número de telefone.
 * Usa Supabase com service role para bypassar RLS (webhook não é autenticado).
 */

import { createClient } from '@supabase/supabase-js'
import type { WhatsappSession, WhatsappState } from '@/types'

const TIMEOUT_MINUTES = 30

function getServiceClient() {
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, service)
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

/** Encerra a sessão (marca como completed). */
export async function closeSession(sessionId: string) {
  const supabase = getServiceClient()
  await supabase
    .from('whatsapp_sessions')
    .update({ current_state: 'completed', updated_at: new Date().toISOString() })
    .eq('id', sessionId)
}
