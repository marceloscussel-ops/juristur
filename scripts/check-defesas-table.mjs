/**
 * check-defesas-table.mjs — a tabela defense_requests e a coluna
 * agencies.plan_started_at já existem no Supabase?
 *
 * Roda depois de aplicar supabase/migrations/2026-11-08-defesas-inclusas.sql:
 *   node scripts/check-defesas-table.mjs
 *
 * Confere as colunas uma a uma (um SELECT nominal falha se faltar qualquer
 * coluna) e a RLS: com a chave anônima e sem sessão, nem leitura nem escrita
 * podem passar.
 *
 * ATENÇÃO: nada de `{ head: true }` aqui. Numa requisição HEAD não vem corpo,
 * então o supabase-js não enxerga o erro do PostgREST e uma tabela INEXISTENTE
 * volta como `error: null, count: null` — isto é, como se estivesse tudo certo.
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const clean = v => (v ?? '').replace(/[^\x20-\x7E]/g, '').trim()
const url  = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
const db   = createClient(url, clean(process.env.SUPABASE_SERVICE_ROLE_KEY))
const anon = createClient(url, clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY))

const COLS = [
  'id', 'agency_id', 'case_id', 'origin', 'kind', 'status', 'consumes_quota',
  'subject', 'lawyer_notes', 'requested_at', 'used_at', 'decided_at',
  'decided_by', 'plan_at_use', 'created_at',
].join(', ')

const ARQUIVO = 'supabase/migrations/2026-11-08-defesas-inclusas.sql'

const { data, error } = await db.from('defense_requests').select(COLS).limit(1)

if (error) {
  console.log(`FALTA APLICAR a migration -> ${error.code ?? ''} ${error.message}`.trim())
  console.log(`Arquivo: ${ARQUIVO}`)
  // `exitCode` em vez de `process.exit()`: sair no meio do keep-alive do fetch
  // faz o libuv abortar com "Assertion failed" no Windows.
  process.exitCode = 1
} else {

const { count } = await db.from('defense_requests').select('id', { count: 'exact' })
console.log(`OK - defense_requests presente (${count ?? data.length} solicitação(ões))`)

// A coluna âncora do ano de assinatura vive em agencies.
const { error: ePlan } = await db.from('agencies').select('plan_started_at').limit(1)
console.log(ePlan
  ? `agencies.plan_started_at: FALTA (${ePlan.code ?? ''} ${ePlan.message})`.trim()
  : 'agencies.plan_started_at: presente')
if (ePlan) process.exitCode = 1

// Quantas defesas já contam como utilizadas (o que desconta da cota).
const { count: usadas } = await db
  .from('defense_requests')
  .select('id', { count: 'exact' })
  .eq('status', 'utilizada')
  .eq('consumes_quota', true)
console.log(`defesas marcadas como utilizadas (descontando cota): ${usadas ?? 0}`)

// RLS: sem sessão não se lê nem se escreve.
const { data: lidos, error: eRead } = await anon.from('defense_requests').select('id').limit(1)
console.log(`leitura anônima: ${eRead ? `bloqueada (${eRead.code ?? eRead.message})` : `${(lidos ?? []).length} linha(s) visível(is)`}`)

const { error: eWrite } = await anon.from('defense_requests')
  .insert({ agency_id: '00000000-0000-0000-0000-000000000000', status: 'solicitada' })
console.log(`escrita anônima: ${eWrite ? `bloqueada (${eWrite.code ?? ''} ${eWrite.message})`.trim() : 'PERMITIDA - revisar a policy!'}`)

}
