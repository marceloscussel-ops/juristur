/**
 * check-convite.mjs — em que pé está o convite de um usuário?
 *
 *   node scripts/check-convite.mjs pessoa@agencia.com.br
 *
 * Responde as três perguntas que importam quando um convite não funciona:
 *   1. o vínculo foi gravado em `agency_members`, e em qual agência?
 *   2. o Auth criou uma AGÊNCIA para o convidado? (tem de ser "nenhuma" — é
 *      o bug que o fluxo de convite existe para evitar: pelo caminho normal
 *      de cadastro, o trigger cria uma agência para todo usuário novo)
 *   3. a pessoa já abriu o link? (`email_confirmed_at` no Auth é o que o
 *      trigger on_auth_user_confirmed usa para passar o status a 'ativo')
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const clean = v => (v ?? '').replace(/[^\x20-\x7E]/g, '').trim()
const db = createClient(
  clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  { auth: { autoRefreshToken: false, persistSession: false } },
)

const email = (process.argv[2] ?? '').trim().toLowerCase()
if (!email) {
  console.log('uso: node scripts/check-convite.mjs <e-mail>')
  process.exitCode = 1
} else {

const { data: membro, error } = await db
  .from('agency_members')
  .select('user_id, agency_id, papel, nome, telefone, email, status, convidado_em, aceito_em')
  .eq('email', email)
  .maybeSingle()

if (error) {
  console.log(`erro ao ler agency_members -> ${error.code ?? ''} ${error.message}`.trim())
  process.exitCode = 1
} else if (!membro) {
  console.log(`nenhum vínculo para ${email} — o convite não chegou a gravar a linha`)
  process.exitCode = 1
} else {

const { data: ag } = await db.from('agencies').select('name, plan').eq('id', membro.agency_id).maybeSingle()

console.log('vínculo:')
console.log(`  user_id      ${membro.user_id}`)
console.log(`  agência      ${ag?.name ?? '—'} (${membro.agency_id}) — plano ${ag?.plan ?? '—'}`)
console.log(`  papel        ${membro.papel}`)
console.log(`  status       ${membro.status}`)
console.log(`  nome         ${membro.nome ?? '—'}`)
console.log(`  telefone     ${membro.telefone ?? '—'}`)
console.log(`  convidado em ${membro.convidado_em ?? '—'}`)
console.log(`  aceito em    ${membro.aceito_em ?? '— (ainda não aceitou)'}`)

const { data: agenciaPropria } = await db
  .from('agencies').select('id, name').eq('id', membro.user_id).maybeSingle()
console.log(`\nagência própria do convidado: ${agenciaPropria ? `CRIOU — ${agenciaPropria.name} (BUG)` : 'nenhuma — correto'}`)
if (agenciaPropria) process.exitCode = 1

const { data: authUser } = await db.auth.admin.getUserById(membro.user_id)
const u = authUser?.user
console.log('\nauth.users:')
console.log(`  e-mail            ${u?.email ?? '—'}`)
console.log(`  convidado em      ${u?.invited_at ?? '—'}`)
console.log(`  e-mail confirmado ${u?.email_confirmed_at ?? '— (aguardando o link)'}`)
console.log(`  último login      ${u?.last_sign_in_at ?? '— (nunca entrou)'}`)
console.log(`  metadata          ${JSON.stringify(u?.user_metadata)}`)

}
}
