// Cria (ou atualiza) a conta demo com o plano Essential liberado.
// Uso: node demo-user.mjs <email> <senha> [plano] [meses] [nome da agência]
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const envPath = new URL('../.env.local', import.meta.url)
const env = {}
for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
  // O valor do ASAAS_API_KEY vem escapado como \$aact_... no .env — desfaz aqui.
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').split('\\$').join('$')
}

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = (env.SUPABASE_SERVICE_ROLE_KEY ?? '').replace(/^\uFEFF/, '').trim()
if (!url || !key) throw new Error('URL ou service role key ausentes no .env.local')

const [email, password, plan = 'essencial', meses = '12', nomeArg] = process.argv.slice(2)
if (!email || !password) throw new Error('uso: node demo-user.mjs <email> <senha> [plano] [meses] [nome]')

// Nome da agência: o informado ou "Agência Demo <local-part capitalizado>".
const local = email.split('@')[0]
const nome  = nomeArg || `Agência Demo ${local.charAt(0).toUpperCase()}${local.slice(1)}`

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

// 1) Usuário no Auth (já confirmado, sem e-mail de verificação)
let userId
const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { name: nome },
})

if (createErr) {
  if (!/already been registered|already registered|already exists/i.test(createErr.message)) throw createErr
  // Já existe: localiza e redefine a senha para a informada.
  let page = 1
  while (!userId) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (hit) userId = hit.id
    else if (data.users.length < 200) break
    page++
  }
  if (!userId) throw new Error('usuário já registrado mas não encontrado na listagem')
  const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
    password, email_confirm: true,
  })
  if (updErr) throw updErr
  console.log('auth: usuário já existia — senha redefinida', userId)
} else {
  userId = created.user.id
  console.log('auth: usuário criado', userId)
}

// 2) Agência com o plano liberado (mesmo shape que o webhook do Asaas grava)
const accessUntil = new Date()
accessUntil.setMonth(accessUntil.getMonth() + Number(meses))

const row = {
  id: userId,
  name: nome,
  cnpj: '00.000.000/0000-00',
  email,
  phone: null,
  plan,
  subscription_status: 'active',
  access_until: accessUntil.toISOString(),
  billing_cycle: 'anual',
  origem: 'demo',
  origem_campanha: 'conta-demo',
}

const { error: upErr } = await admin.from('agencies').upsert(row, { onConflict: 'id' })
if (upErr) throw upErr

const { data: check, error: checkErr } = await admin
  .from('agencies')
  .select('id, name, email, plan, subscription_status, access_until, billing_cycle, origem, phone')
  .eq('id', userId)
  .single()
if (checkErr) throw checkErr
console.log('agencies:', JSON.stringify(check, null, 2))
