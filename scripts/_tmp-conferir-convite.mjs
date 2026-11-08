/** One-off (não commitar): o convite criou vínculo e NÃO criou agência? */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}
const clean = v => (v ?? '').replace(/[^\x20-\x7E]/g, '').trim()
const db = createClient(clean(process.env.NEXT_PUBLIC_SUPABASE_URL), clean(process.env.SUPABASE_SERVICE_ROLE_KEY), {
  auth: { autoRefreshToken: false, persistSession: false },
})

const EMAIL = 'marcelo.promob@gmail.com'

const { data: membro } = await db
  .from('agency_members')
  .select('user_id, agency_id, papel, nome, telefone, email, status, convidado_em, aceito_em')
  .eq('email', EMAIL)
  .maybeSingle()

if (!membro) {
  console.log('NENHUM vínculo em agency_members — o convite não gravou a linha')
  process.exit(1)
}

const { data: ag } = await db.from('agencies').select('name, plan').eq('id', membro.agency_id).maybeSingle()

console.log('vínculo:')
console.log(`  user_id      ${membro.user_id}`)
console.log(`  agência      ${ag?.name} (${membro.agency_id}) — plano ${ag?.plan}`)
console.log(`  papel        ${membro.papel}`)
console.log(`  status       ${membro.status}`)
console.log(`  nome         ${membro.nome}`)
console.log(`  telefone     ${membro.telefone ?? '—'}`)
console.log(`  convidado em ${membro.convidado_em}`)
console.log(`  aceito em    ${membro.aceito_em ?? '— (ainda não aceitou)'}`)

// O teste que importa: o trigger NÃO pode ter criado uma agência para ele.
const { data: agenciaPropria } = await db
  .from('agencies').select('id, name').eq('id', membro.user_id).maybeSingle()
console.log(`\nagência própria do convidado: ${agenciaPropria ? `CRIOU — ${agenciaPropria.name} (BUG)` : 'nenhuma — correto'}`)

// Estado no Auth: convidado, ainda sem confirmar o e-mail.
const { data: authUser } = await db.auth.admin.getUserById(membro.user_id)
const u = authUser?.user
console.log(`\nauth.users:`)
console.log(`  e-mail            ${u?.email}`)
console.log(`  convidado em      ${u?.invited_at ?? '—'}`)
console.log(`  e-mail confirmado ${u?.email_confirmed_at ?? '— (aguardando o link)'}`)
console.log(`  metadata          ${JSON.stringify(u?.user_metadata)}`)
