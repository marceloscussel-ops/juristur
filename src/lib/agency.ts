/**
 * agency.ts — Garantia de que todo usuário autenticado tem linha em `agencies`.
 *
 * `cases.agency_id` referencia `agencies.id`: sem a linha da agência, qualquer
 * tentativa de abrir caso morre na foreign key (23503) e o usuário só vê "Erro
 * ao criar caso". Isso acontecia porque todos os caminhos que criavam a agência
 * engoliam falha de UNIQUE em `phone` (o trigger com ON CONFLICT DO NOTHING, o
 * auto-reparo do layout sem checar erro) — o usuário entrava normalmente, sem
 * agência, e só descobria no primeiro caso.
 */
import { createClient as createServiceClient, type User } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { normalizePhone } from '@/lib/phone'
import { TRIAL_DAYS, type AgencyAccess } from '@/lib/plans'

export const AGENCY_COLS = 'subscription_status, trial_ends_at, created_at, access_until'

function admin() {
  return createServiceClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
}

/** `true` quando o erro do Postgres é violação de UNIQUE. */
function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  return error?.code === '23505' || !!error?.message?.includes('duplicate key')
}

/**
 * Cria a agência do usuário caso ela não exista e devolve as colunas pedidas.
 *
 * `agencies.phone` é UNIQUE — o webhook do WhatsApp acha a agência pelo número.
 * Quando o número já pertence a outra conta gravamos a agência **sem telefone**:
 * ficar sem o canal de aviso é recuperável pelo /perfil, ficar sem agência não.
 */
export async function ensureAgency(user: User): Promise<AgencyAccess | null> {
  const db   = admin()
  const meta = user.user_metadata ?? {}

  const normalized = typeof meta.phone === 'string' ? normalizePhone(meta.phone) : ''
  let phone: string | null = normalized || null

  if (phone && await isPhoneTaken(phone, user.id)) phone = null

  const row = {
    id:                  user.id,
    name:                meta.name ?? meta.full_name ?? 'Minha agência',
    cnpj:                meta.cnpj ?? '00.000.000/0000-00',
    email:               user.email,
    phone,
    subscription_status: 'trial',
    trial_ends_at:       new Date(Date.now() + TRIAL_DAYS * 86_400_000).toISOString(),
  }

  let { error } = await db.from('agencies').upsert(row, { onConflict: 'id' })

  // A checagem acima usa o telefone normalizado, mas a base tem números em
  // formatos antigos (com e sem DDI). Se ainda colidiu, insiste sem telefone.
  if (error && isUniqueViolation(error) && phone) {
    ({ error } = await db.from('agencies').upsert({ ...row, phone: null }, { onConflict: 'id' }))
  }

  if (error) {
    console.error('[ensureAgency] upsert error:', JSON.stringify(error))
    return null
  }

  const { data } = await db
    .from('agencies')
    .select('subscription_status, trial_ends_at, created_at, access_until')
    .eq('id', user.id)
    .maybeSingle()

  return data as AgencyAccess | null
}

/**
 * `true` quando o número já está em uso por outra agência.
 *
 * A base tem números em formatos antigos — `51998344269`, `5551998344269` e
 * `555198344269` são o mesmo WhatsApp —, então comparar as strings deixaria o
 * mesmo número entrar duas vezes e o webhook passaria a entregar a resposta na
 * conta errada. O `like` pelos 8 dígitos do assinante só reduz o conjunto; a
 * decisão sai da comparação com os dois lados normalizados, porque DDDs
 * diferentes podem compartilhar esses 8 dígitos (ex.: 51 98765-4321 e
 * 11 98765-4321 são números distintos).
 */
export async function isPhoneTaken(rawPhone: string, exceptId?: string): Promise<boolean> {
  const phone = normalizePhone(rawPhone)
  if (!phone) return false

  const { data } = await admin()
    .from('agencies')
    .select('id, phone')
    .like('phone', `%${phone.slice(-8)}`)

  return (data ?? []).some(a => a.id !== exceptId && normalizePhone(a.phone ?? '') === phone)
}
