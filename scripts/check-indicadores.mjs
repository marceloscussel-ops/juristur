/**
 * check-indicadores.mjs — a tabela partners, as colunas de atribuição em
 * agencies e a view partner_commissions já existem no Supabase?
 *
 * Roda depois de aplicar supabase/migrations/2026-11-10-indicadores.sql:
 *   node scripts/check-indicadores.mjs
 *
 * Confere as colunas uma a uma (um SELECT nominal falha se faltar qualquer
 * coluna) e a RLS: com a chave anônima e sem sessão, nem `partners` nem o
 * extrato de comissões podem ser lidos — são dados comerciais, não da agência.
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
  'id', 'slug', 'name', 'commission_pct', 'recurring', 'active',
  'contact_name', 'contact_email', 'notes', 'created_at',
].join(', ')

const ARQUIVO = 'supabase/migrations/2026-11-10-indicadores.sql'

const { data: parceiros, error } = await db.from('partners').select(COLS)

if (error) {
  console.log(`FALTA APLICAR a migration -> ${error.code ?? ''} ${error.message}`.trim())
  console.log(`Arquivo: ${ARQUIVO}`)
  // `exitCode` em vez de `process.exit()`: sair no meio do keep-alive do fetch
  // faz o libuv abortar com "Assertion failed" no Windows.
  process.exitCode = 1
} else {

console.log(`OK - partners presente (${parceiros.length} indicador(es))`)
for (const p of parceiros) {
  console.log(
    `  ${p.name} [${p.slug}] - ${Number(p.commission_pct)}%, ` +
    `${p.recurring ? 'toda renovação' : 'só a primeira venda'}` +
    `${p.active ? '' : ', INATIVO'}`
  )
  if (Number(p.commission_pct) === 0) {
    console.log('    percentual em 0: o painel mostra comissão zerada até definir')
  }
}

// Colunas de atribuição, em agencies.
const { error: eCols } = await db.from('agencies').select('partner_id, partner_attributed_at').limit(1)
console.log(eCols
  ? `agencies.partner_id/partner_attributed_at: FALTA (${eCols.code ?? ''} ${eCols.message})`.trim()
  : 'agencies.partner_id/partner_attributed_at: presentes')
if (eCols) process.exitCode = 1

// Quantas agências já estão atribuídas a algum indicador.
if (!eCols) {
  const { count: atribuidas } = await db
    .from('agencies')
    .select('id', { count: 'exact' })
    .not('partner_id', 'is', null)
  console.log(`agências atribuídas a um indicador: ${atribuidas ?? 0}`)
}

// A view do extrato. Erro aqui = view não criada.
const { data: extrato, error: eView } = await db
  .from('partner_commissions')
  .select('event_id, partner_name, agency_name, value, commission')
  .limit(5)

if (eView) {
  console.log(`partner_commissions: FALTA (${eView.code ?? ''} ${eView.message})`.trim())
  process.exitCode = 1
} else {
  console.log(`partner_commissions: presente (${extrato.length} linha(s) na amostra)`)
  for (const l of extrato) {
    console.log(`  ${l.agency_name} -> ${l.partner_name}: pago ${l.value}, comissão ${l.commission}`)
  }
}

// RLS: partners e o extrato são dados comerciais — a chave anônima não entra.
const { data: pAnon, error: ePartners } = await anon.from('partners').select('id').limit(1)
console.log(`leitura anônima de partners: ${ePartners
  ? `bloqueada (${ePartners.code ?? ePartners.message})`
  : `${(pAnon ?? []).length} linha(s) visível(is) - revisar a RLS!`}`)
if (!ePartners && (pAnon ?? []).length) process.exitCode = 1

const { data: cAnon, error: eComissoes } = await anon.from('partner_commissions').select('event_id').limit(1)
console.log(`leitura anônima do extrato: ${eComissoes
  ? `bloqueada (${eComissoes.code ?? eComissoes.message})`
  : `${(cAnon ?? []).length} linha(s) visível(is) - revisar o REVOKE da view!`}`)
if (!eComissoes && (cAnon ?? []).length) process.exitCode = 1

}
