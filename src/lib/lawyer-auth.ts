/**
 * lawyer-auth.ts — Porteiro das rotas do advogado.
 *
 * Dois sinais valem como "é advogado", porque a plataforma usa os dois:
 *   · `app_metadata.role === 'lawyer'` no JWT — é o que o layout /lawyer e o
 *     middleware já verificam para liberar as telas;
 *   · linha em `lawyers` — é o que as rotas de revisão de caso verificam.
 *
 * Aceitar qualquer um dos dois evita o caso absurdo de um advogado que abre a
 * tela (passou pelo layout) e recebe 403 ao clicar no botão dela.
 */

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

export function serviceClient(): SupabaseClient {
  return createServiceClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
}

export interface LawyerAuth {
  userId: string
  email:  string | null
  db:     SupabaseClient
}

/** Devolve o advogado autenticado, ou null (quem chama responde 403). */
export async function verifyLawyer(): Promise<LawyerAuth | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const db = serviceClient()

  if (user.app_metadata?.role === 'lawyer') {
    return { userId: user.id, email: user.email ?? null, db }
  }

  const { data: lawyer } = await db.from('lawyers').select('id').eq('id', user.id).maybeSingle()
  if (!lawyer) return null

  return { userId: user.id, email: user.email ?? null, db }
}
