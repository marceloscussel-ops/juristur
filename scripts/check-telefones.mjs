/**
 * check-telefones.mjs — quais telefones o webhook do WhatsApp nunca vai achar,
 * linha por linha e com nome da agência.
 *
 *   node scripts/check-telefones.mjs            # diagnóstico
 *   node scripts/check-telefones.mjs --apply    # normaliza o que é mecânico
 *
 * Por que existe, se `/api/health` já tem `data:telefones-formato`: o health
 * responde "12 inalcançáveis" e corta a lista em 5, porque é um alerta. Aqui dá
 * para ver cada linha, de quem é, o que o webhook procuraria, e — o que o health
 * não faz — SIMULAR o resultado da correção antes de gravar. Normalizar um
 * número com nono dígito pode colidir com um número que já existe em outra
 * conta, e aí o conserto troca um problema silencioso por uma duplicata.
 *
 * O que `--apply` faz: só o caso mecânico, em que o literal gravado normaliza
 * para um celular brasileiro válido e o único defeito é não estar na forma que
 * a consulta usa. Atualiza as DUAS colunas que resolvem quem está escrevendo
 * (`agencies.phone` e `agency_members.telefone`), uma linha de cada vez e com o
 * valor antigo como guarda no UPDATE: se a linha mudou desde o diagnóstico, não
 * acha nada e avisa, em vez de sobrescrever às cegas.
 *
 * O que `--apply` NUNCA faz, porque depende de decisão humana:
 *  - número que não é celular brasileiro válido (sem o número certo, não há
 *    normalização que invente o dígito que falta);
 *  - correção que criaria um conflito de roteamento com outra agência.
 *
 * ATENÇÃO: passar no check não quer dizer que o WhatsApp chega. O critério é o
 * formato — um `555187654321` de mentira passa igual. O check prova que a
 * consulta acha a linha, não que existe alguém do outro lado.
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

const APPLY = process.argv.includes('--apply')

// ─── Espelho de src/lib/phone.ts ─────────────────────────────────────────────
// Duplicado porque este script é .mjs e aquele é TypeScript do bundle. Se a
// regra mudar lá, mude aqui — o autoteste abaixo usa os exemplos do docblock
// de phone.ts e quebra o script se os dois saírem de sincronia.

function normalizePhone(raw) {
  let d = String(raw).replace(/\D/g, '')
  if (!d) return ''
  if (!d.startsWith('55')) d = '55' + d
  if (d.length === 13) d = d.slice(0, 4) + d.slice(5)
  return d
}

const VALID_DDD = new Set([
  11, 12, 13, 14, 15, 16, 17, 18, 19,
  21, 22, 24, 27, 28,
  31, 32, 33, 34, 35, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48, 49,
  51, 53, 54, 55,
  61, 62, 63, 64, 65, 66, 67, 68, 69,
  71, 73, 74, 75, 77, 79,
  81, 82, 83, 84, 85, 86, 87, 88, 89,
  91, 92, 93, 94, 95, 96, 97, 98, 99,
])

function isValidBrazilianMobile(raw) {
  const d = normalizePhone(raw)
  if (d.length !== 12) return false
  if (!d.startsWith('55')) return false
  return VALID_DDD.has(Number(d.slice(2, 4)))
}

for (const [entrada, esperado] of [
  ['(54) 99908-2111', '555499082111'],
  ['5554999082111',   '555499082111'],
  ['555499082111',    '555499082111'],
  ['54999082111',     '555499082111'],
]) {
  const saiu = normalizePhone(entrada)
  if (saiu !== esperado) {
    console.error(`AUTOTESTE FALHOU: "${entrada}" -> "${saiu}", esperado "${esperado}".`)
    console.error('A regra deste script saiu de sincronia com src/lib/phone.ts.')
    process.exitCode = 1
    break
  }
}

/** Por que este telefone é inalcançável, ou null se estiver em ordem. */
function diagnostico(gravado) {
  const canonico = normalizePhone(gravado)
  if (canonico !== gravado) {
    return isValidBrazilianMobile(gravado)
      ? { tipo: 'formato',  canonico }
      : { tipo: 'invalido', canonico }
  }
  if (!isValidBrazilianMobile(gravado)) return { tipo: 'invalido', canonico }
  return null
}

// ─── Leitura ─────────────────────────────────────────────────────────────────
// Só vínculos 'ativo': é a única condição em que o webhook aceita o vínculo,
// e portanto a única em que um telefone mal gravado esconde alguém.

const { data: ags, error: eAgs } = await db
  .from('agencies')
  .select('id, name, phone')
  .order('created_at')
if (eAgs) {
  console.error('agencies:', eAgs.message)
  process.exitCode = 1
}

const { data: vinculos, error: eMem } = await db
  .from('agency_members')
  .select('user_id, agency_id, nome, email, telefone, papel')
  .eq('status', 'ativo')
// Tabela ausente (banco sem a migration do multiusuário) não é erro de dados.
const membros = eMem ? [] : (vinculos ?? [])
if (eMem) console.log(`(agency_members indisponível: ${eMem.message})\n`)

const nomeAg = id => (ags ?? []).find(a => a.id === id)?.name ?? '(agência desconhecida)'

const alvos = [
  ...(ags ?? []).filter(a => a.phone).map(a => ({
    tabela: 'agencies', chave: a.id, agencyId: a.id,
    quem: a.name, numero: a.phone,
  })),
  ...membros.filter(m => m.telefone).map(m => ({
    tabela: 'agency_members', chave: m.user_id, agencyId: m.agency_id,
    quem: `${m.nome ?? m.email ?? m.user_id} (${m.papel}) @ ${nomeAg(m.agency_id)}`,
    numero: m.telefone,
  })),
]

console.log(`${alvos.length} telefone(s) em uso: ${(ags ?? []).length} agência(s), ${membros.length} membro(s) ativo(s)\n`)

// ─── Inalcançáveis ───────────────────────────────────────────────────────────
const ruins = alvos.map(t => ({ ...t, ...(diagnostico(t.numero) ?? {}) })).filter(t => t.tipo)

if (ruins.length === 0) {
  console.log('OK - todo telefone gravado é o que o webhook procura.')
} else {
  console.log(`INALCANÇÁVEIS (${ruins.length}):`)
  for (const r of ruins) {
    console.log(r.tipo === 'formato'
      ? `  ${r.tabela}  ${r.numero} -> ${r.canonico}   ${r.quem}`
      : `  ${r.tabela}  ${r.numero} NÃO É CELULAR BRASILEIRO VÁLIDO   ${r.quem}`)
  }
  process.exitCode = 1
}

// ─── Conflito de roteamento (mesmo número levando a agências diferentes) ─────
// O critério é a agência de DESTINO, não a linha gravada: o backfill da
// migration copiou o telefone do titular para `agency_members`, então toda
// agência tem um membro com o mesmo número e contar linhas acusaria a base
// inteira. Igual ao `data:telefones-duplicados` do health.

function conflitos(valorDe) {
  const porNumero = new Map()
  for (const t of alvos) {
    const key = normalizePhone(valorDe(t))
    if (!key) continue
    if (!porNumero.has(key)) porNumero.set(key, new Map())
    const agencias = porNumero.get(key)
    if (!agencias.has(t.agencyId)) agencias.set(t.agencyId, `${t.tabela} ${t.quem}`)
  }
  return [...porNumero.entries()]
    .filter(([, agencias]) => agencias.size > 1)
    .map(([numero, agencias]) => ({ numero, linhas: [...agencias.values()] }))
}

const agora = conflitos(t => t.numero)
if (agora.length) {
  console.log(`\nCONFLITO DE ROTEAMENTO (${agora.length}): o mesmo número leva a agências diferentes`)
  for (const c of agora) {
    console.log(`  ${c.numero}`)
    for (const l of c.linhas) console.log(`     ${l}`)
  }
  process.exitCode = 1
}

// Simulação: normalizar o que é mecânico cria conflito novo?
const mecanicos  = ruins.filter(r => r.tipo === 'formato')
const simulacao  = new Map(mecanicos.map(r => [`${r.tabela}:${r.chave}`, r.canonico]))
const depois     = conflitos(t => simulacao.get(`${t.tabela}:${t.chave}`) ?? t.numero)
const novos      = depois.filter(d => !agora.some(a => a.numero === d.numero))

if (novos.length) {
  console.log(`\nATENÇÃO: normalizar criaria ${novos.length} conflito(s) NOVO(S):`)
  for (const c of novos) {
    console.log(`  ${c.numero}`)
    for (const l of c.linhas) console.log(`     ${l}`)
  }
}

/** Correções que podem ser gravadas sem decisão humana. */
const seguras = mecanicos.filter(
  r => !depois.some(d => d.numero === r.canonico)
)
const travadas = mecanicos.filter(r => !seguras.includes(r))

// ─── Gravação ────────────────────────────────────────────────────────────────
if (!APPLY) {
  console.log(`\n${seguras.length} correção(ões) mecânica(s) pronta(s) para gravar.`)
  if (travadas.length) {
    console.log(`${travadas.length} travada(s) por conflito de roteamento — resolva a duplicata primeiro.`)
  }
  const invalidos = ruins.filter(r => r.tipo === 'invalido').length
  if (invalidos) console.log(`${invalidos} número(s) inválido(s): só o número certo resolve.`)
  if (seguras.length) console.log('Para gravar: node scripts/check-telefones.mjs --apply')
} else if (seguras.length === 0) {
  console.log('\nNada mecânico para gravar.')
} else {
  console.log(`\n>> APLICANDO ${seguras.length} correção(ões)`)
  for (const r of seguras) {
    const coluna = r.tabela === 'agencies' ? 'phone' : 'telefone'
    const chave  = r.tabela === 'agencies' ? 'id'    : 'user_id'
    const { data, error } = await db
      .from(r.tabela)
      .update({ [coluna]: r.canonico })
      .eq(chave, r.chave)
      .eq(coluna, r.numero)
      .select(chave)
    console.log(error
      ? `  ERRO ${r.tabela} ${r.chave}: ${error.message}`
      : `  ${r.tabela} ${r.quem}: ${data.length} linha(s) -> ${r.canonico}`)
    if (error) process.exitCode = 1
  }
  console.log('\nRode de novo sem --apply para conferir o que sobrou.')
}
