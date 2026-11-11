/**
 * check-conta.mjs — inventário de uma agência: o que existe pendurado nela.
 *
 *   node scripts/check-conta.mjs <agencyId> [<agencyId>...]
 *
 * SOMENTE LEITURA. Serve para a pergunta que sempre aparece antes de apagar ou
 * de fundir contas: esta aqui está vazia de verdade, ou tem caso, documento,
 * arquivo e assinatura dentro? Duas contas lado a lado mostram, por exemplo,
 * qual das duas o cliente realmente usou — a diferença costuma ser óbvia no
 * `last_sign_in_at` e na contagem de casos.
 *
 * Quem apaga é o próprio produto: /api/profile/delete (LGPD, Art. 18, VI), que
 * cancela a assinatura, limpa o Storage, tira as sessões de WhatsApp, apaga os
 * usuários da equipe no Auth e por fim o titular, cujo cascade leva a agência.
 * Este script não apaga nada: ele é o passo anterior, o de olhar.
 *
 * `billing_events` aparece no inventário porque é o que SOBREVIVE à exclusão
 * (LGPD, Art. 16, I): a FK é ON DELETE SET NULL, então as linhas ficam sem
 * vínculo com a agência — histórico fiscal da transação, sem dado pessoal.
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
)

const IDS = process.argv.slice(2).filter(a => !a.startsWith('--'))

if (IDS.length === 0) {
  console.log('Uso: node scripts/check-conta.mjs <agencyId> [<agencyId>...]')
  console.log('Dica: os ids saem do /admin, do /api/health ou do check-telefones.')
  process.exitCode = 1
}

const CADASTRO = [
  'email', 'phone', 'plan', 'billing_cycle', 'subscription_status',
  'asaas_subscription_id', 'asaas_customer_id', 'access_until', 'trial_ends_at',
  'plan_started_at', 'created_at', 'origem', 'partner_id',
]

/** Conta linhas; tolera tabela ou coluna que não existe neste banco. */
async function contar(tabela, coluna, valor) {
  const { count, error } = await db.from(tabela).select('*', { count: 'exact', head: false }).eq(coluna, valor)
  return error ? `(indisponível: ${error.message})` : (count ?? 0)
}

for (const id of IDS) {
  console.log('─'.repeat(70))

  const { data: ag, error } = await db
    .from('agencies')
    .select(['id', 'name', ...CADASTRO].join(', '))
    .eq('id', id)
    .maybeSingle()

  if (error) { console.log(`${id}: ERRO ${error.message}`); process.exitCode = 1; continue }
  if (!ag)   { console.log(`${id}: não existe em agencies`); process.exitCode = 1; continue }

  console.log(`${ag.name}  [${ag.id}]`)
  for (const campo of CADASTRO) {
    console.log(`  ${campo.padEnd(22)} ${ag[campo] ?? '—'}`)
  }

  // Casos, com data e status: é a linha do tempo de uso da conta.
  const { data: casos } = await db
    .from('cases')
    .select('id, created_at, status, origin')
    .eq('agency_id', id)
    .order('created_at')
  console.log(`  casos                  ${casos?.length ?? 0}`)
  for (const c of casos ?? []) {
    console.log(`     ${c.created_at?.slice(0, 16)}  ${c.status}  (${c.origin ?? 'web'})`)
  }

  const caseIds = (casos ?? []).map(c => c.id)
  if (caseIds.length) {
    for (const tabela of ['case_analyses', 'case_messages']) {
      const { count } = await db.from(tabela).select('*', { count: 'exact' }).in('case_id', caseIds)
      console.log(`  ${tabela.padEnd(22)} ${count ?? 0}`)
    }
  }

  for (const tabela of [
    'documents', 'whatsapp_sessions', 'defense_requests',
    'agency_members', 'contract_acceptances', 'billing_events',
  ]) {
    console.log(`  ${tabela.padEnd(22)} ${await contar(tabela, 'agency_id', id)}`)
  }

  // Quem perde o acesso se a conta for apagada.
  const { data: membros } = await db
    .from('agency_members')
    .select('user_id, nome, email, telefone, papel, status')
    .eq('agency_id', id)
  for (const m of membros ?? []) {
    console.log(`     ${m.papel}/${m.status}  ${m.nome ?? '—'} <${m.email ?? '—'}>  ${m.telefone ?? '—'}` +
                `${m.user_id === id ? '  (= titular)' : ''}`)
  }

  // Arquivos: não cascateiam com o banco, e o bucket é público.
  const { data: raiz, error: eStorage } = await db.storage
    .from('case-files')
    .list(id, { limit: 1000 })
  console.log(`  storage case-files/    ${eStorage ? `(erro: ${eStorage.message})` : `${raiz?.length ?? 0} entrada(s)`}`)

  // `last_sign_in_at` nulo é o sinal mais forte de conta que nunca foi usada.
  const { data: u } = await db.auth.admin.getUserById(id)
  if (u?.user) {
    console.log(`  auth.email             ${u.user.email}`)
    console.log(`  auth.created_at        ${u.user.created_at?.slice(0, 16)}`)
    console.log(`  auth.last_sign_in_at   ${u.user.last_sign_in_at?.slice(0, 16) ?? '— (nunca entrou)'}`)
    console.log(`  auth.provider          ${(u.user.app_metadata?.providers ?? []).join(',') || '—'}`)
  } else {
    console.log('  auth                   usuário não encontrado (agência órfã do Auth)')
  }
}
