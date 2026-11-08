/**
 * check-aceite-table.mjs — a tabela contract_acceptances já existe no Supabase?
 *
 * Roda depois de aplicar supabase/migrations/2026-11-08-aceite-contrato.sql:
 *   node scripts/check-aceite-table.mjs
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

const COLS = 'id, agency_id, version, event, anexo, contract_text, ip, user_agent, accepted_at'

const { data, error } = await db.from('contract_acceptances').select(COLS).limit(1)

if (error) {
  console.log(`FALTA APLICAR a migration -> ${error.code ?? ''} ${error.message}`.trim())
  console.log('Arquivo: supabase/migrations/2026-11-08-aceite-contrato.sql')
  // `exitCode` em vez de `process.exit()`: sair no meio do keep-alive do fetch
  // faz o libuv abortar com "Assertion failed" no Windows.
  process.exitCode = 1
} else {

const { count } = await db.from('contract_acceptances').select('id', { count: 'exact' })
console.log(`OK - tabela e colunas presentes (${count ?? data.length} aceite(s) registrado(s))`)

// RLS: sem sessão não se lê nem se escreve.
const { data: lidos, error: eRead } = await anon.from('contract_acceptances').select('id').limit(1)
console.log(`leitura anônima: ${eRead ? `bloqueada (${eRead.code ?? eRead.message})` : `${(lidos ?? []).length} linha(s) visível(is)`}`)

const { error: eWrite } = await anon.from('contract_acceptances')
  .insert({ agency_id: '00000000-0000-0000-0000-000000000000', version: 'teste', event: 'cadastro' })
console.log(`escrita anônima: ${eWrite ? `bloqueada (${eWrite.code ?? ''} ${eWrite.message})`.trim() : 'PERMITIDA - revisar a policy!'}`)

}
