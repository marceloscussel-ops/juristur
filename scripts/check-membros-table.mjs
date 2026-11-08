/**
 * check-membros-table.mjs — a tabela agency_members já existe no Supabase?
 *
 * Roda depois de aplicar supabase/migrations/2026-11-08-multiusuario.sql:
 *   node scripts/check-membros-table.mjs
 *
 * Confere, nesta ordem:
 *   1. a tabela e as colunas, uma a uma (um SELECT nominal falha se faltar
 *      qualquer coluna);
 *   2. o backfill — toda agência precisa ter o seu titular ativo, senão
 *      `agency_do_usuario()` devolve NULL e a RLS tranca a conta inteira;
 *   3. `created_by` em cases e documents;
 *   4. as funções de RLS (chamadas sem sessão: devem devolver NULL/false);
 *   5. a RLS: com a chave anônima e sem sessão, nem leitura nem escrita podem
 *      passar em agency_members, cases, documents e agencies.
 *
 * ATENÇÃO: nada de `{ head: true }` aqui. Numa requisição HEAD não vem corpo,
 * então o supabase-js não enxerga o erro do PostgREST e uma tabela INEXISTENTE
 * volta como `error: null, count: null` — isto é, como se estivesse tudo certo.
 */
import { existsSync, readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

// O .env.local é a fonte normal das chaves, mas não é obrigatório: rodando de
// um worktree (ou de um runner) elas podem vir só do ambiente, e exigir o
// arquivo derrubava o script antes de ele conferir qualquer coisa.
const envLocal = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : ''

for (const line of envLocal.split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const clean = v => (v ?? '').replace(/[^\x20-\x7E]/g, '').trim()
const url  = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
const db   = createClient(url, clean(process.env.SUPABASE_SERVICE_ROLE_KEY))
const anon = createClient(url, clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY))

const ARQUIVO = 'supabase/migrations/2026-11-08-multiusuario.sql'
const COLS = 'user_id, agency_id, papel, nome, telefone, email, status, convidado_em, aceito_em, created_at'

const { data, error } = await db.from('agency_members').select(COLS).limit(1)

if (error) {
  console.log(`FALTA APLICAR a migration -> ${error.code ?? ''} ${error.message}`.trim())
  console.log(`Arquivo: ${ARQUIVO}`)
  // `exitCode` em vez de `process.exit()`: sair no meio do keep-alive do fetch
  // faz o libuv abortar com "Assertion failed" no Windows.
  process.exitCode = 1
} else {

const { count: membros }  = await db.from('agency_members').select('user_id', { count: 'exact' })
const { count: titulares } = await db
  .from('agency_members').select('user_id', { count: 'exact' }).eq('papel', 'titular')
console.log(`OK - tabela e colunas presentes (${membros ?? data.length} vínculo(s), ${titulares ?? 0} titular(es))`)

// Backfill: uma linha 'titular' ativa por agência.
const { data: ags }  = await db.from('agencies').select('id')
const { data: tits } = await db
  .from('agency_members').select('agency_id').eq('papel', 'titular').eq('status', 'ativo')
const comTitular = new Set((tits ?? []).map(t => t.agency_id))
const semTitular = (ags ?? []).filter(a => !comTitular.has(a.id))
console.log(
  semTitular.length === 0
    ? `backfill: todas as ${(ags ?? []).length} agência(s) têm titular ativo`
    : `backfill INCOMPLETO - ${semTitular.length} agência(s) sem titular ativo: ${semTitular.slice(0, 5).map(a => a.id).join(', ')}`
)
if (semTitular.length > 0) process.exitCode = 1

// Autoria nos casos e documentos (colunas novas, nulas em linhas antigas).
for (const tabela of ['cases', 'documents']) {
  const { error: e } = await db.from(tabela).select('id, created_by').limit(1)
  console.log(`${tabela}.created_by: ${e ? `AUSENTE (${e.code ?? ''} ${e.message})`.trim() : 'presente'}`)
  if (e) process.exitCode = 1
}

// Funções de RLS. Sem sessão, auth.uid() é NULL: a agência resolvida tem de
// ser NULL e o titular, false. Se `agency_do_usuario()` devolvesse qualquer
// id aqui, toda policy do sistema estaria aberta.
for (const [fn, esperado] of [['agency_do_usuario', null], ['e_titular_da_agencia', false]]) {
  const { data: r, error: e } = await anon.rpc(fn)
  if (e) console.log(`função ${fn}(): FALTA CRIAR (${e.code ?? ''} ${e.message})`.trim())
  else   console.log(`função ${fn}() sem sessão: ${JSON.stringify(r)}${r === esperado ? '' : ' - ESPERADO ' + JSON.stringify(esperado) + ', revisar!'}`)
  if (e || (!e && r !== esperado)) process.exitCode = 1
}

// RLS: sem sessão não se lê nada em nenhuma das tabelas da agência.
for (const tabela of ['agency_members', 'agencies', 'cases', 'documents']) {
  const { data: lidos, error: e } = await anon.from(tabela).select('*').limit(1)
  const linhas = (lidos ?? []).length
  console.log(`leitura anônima em ${tabela}: ${e ? `bloqueada (${e.code ?? e.message})` : `${linhas} linha(s) visível(is)${linhas ? ' - revisar a policy!' : ''}`}`)
  if (!e && linhas > 0) process.exitCode = 1
}

// Escrita anônima em agency_members: não existe policy de INSERT, então tem
// de ser recusada. É o que impede alguém de se auto-convidar para uma agência.
const { error: eWrite } = await anon.from('agency_members')
  .insert({ user_id: '00000000-0000-0000-0000-000000000000', agency_id: '00000000-0000-0000-0000-000000000000' })
console.log(`escrita anônima em agency_members: ${eWrite ? `bloqueada (${eWrite.code ?? ''} ${eWrite.message})`.trim() : 'PERMITIDA - revisar a policy!'}`)
if (!eWrite) process.exitCode = 1

}
