/**
 * check-logo-agencia.mjs — a logomarca da agência está pronta no Supabase?
 *
 * Roda depois de aplicar supabase/migrations/2026-11-18-logo-agencia.sql:
 *   node scripts/check-logo-agencia.mjs
 *
 * Confere:
 *   1. a coluna agencies.logo_path;
 *   2. o bucket agency-logos: privado, limite de 2 MB, só PNG e JPEG;
 *   3. a RLS do bucket: com a chave anônima e sem sessão, nem listar nem
 *      enviar arquivo pode passar.
 *
 * Sem `{ head: true }` — ver o aviso em check-membros-table.mjs.
 */
import { existsSync, readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const envLocal = existsSync('.env.local') ? readFileSync('.env.local', 'utf8') : ''
for (const line of envLocal.split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const clean = v => (v ?? '').replace(/[^\x20-\x7E]/g, '').trim()
const url  = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)
const db   = createClient(url, clean(process.env.SUPABASE_SERVICE_ROLE_KEY))
const anon = createClient(url, clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY))

const ARQUIVO = 'supabase/migrations/2026-11-18-logo-agencia.sql'
const BUCKET  = 'agency-logos'
let falhou = false

// 1. Coluna
const { error: colErr } = await db.from('agencies').select('id, logo_path').limit(1)
if (colErr) {
  console.log(`agencies.logo_path: AUSENTE (${colErr.code ?? ''} ${colErr.message})`)
  falhou = true
} else {
  const { count } = await db.from('agencies').select('id', { count: 'exact' }).not('logo_path', 'is', null)
  console.log(`agencies.logo_path: presente (${count ?? 0} agência(s) com logo)`)
}

// 2. Bucket
const { data: bucket, error: bErr } = await db.storage.getBucket(BUCKET)
if (bErr || !bucket) {
  console.log(`bucket ${BUCKET}: AUSENTE (${bErr?.message ?? 'sem retorno'})`)
  falhou = true
} else {
  const tipos = [...(bucket.allowed_mime_types ?? [])].sort().join(', ')
  const okBucket = bucket.public === false
    && bucket.file_size_limit === 2097152
    && tipos === 'image/jpeg, image/png'
  console.log(
    `bucket ${BUCKET}: ${okBucket ? 'OK' : 'CONFIGURAÇÃO DIFERENTE'} ` +
    `(public=${bucket.public}, limite=${bucket.file_size_limit}, tipos=${tipos || 'qualquer'})`,
  )
  if (!okBucket) falhou = true

  // 3. RLS sem sessão: listagem vazia e upload recusado.
  const { data: lista } = await anon.storage.from(BUCKET).list('', { limit: 5 })
  const listaVazia = !lista || lista.length === 0
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const caminho = `00000000-0000-0000-0000-000000000000/check-${Date.now()}.png`
  const { error: upErr } = await anon.storage.from(BUCKET).upload(caminho, png, { contentType: 'image/png' })
  if (!upErr) await db.storage.from(BUCKET).remove([caminho])
  console.log(`RLS anônima: listagem ${listaVazia ? 'vazia (ok)' : 'VAZOU'}; upload ${upErr ? 'recusado (ok)' : 'ACEITO — policy aberta'}`)
  if (!listaVazia || !upErr) falhou = true
}

if (falhou) {
  console.log(`FALTA APLICAR (ou revisar) a migration -> ${ARQUIVO}`)
  // `exitCode` em vez de `process.exit()`: ver check-membros-table.mjs.
  process.exitCode = 1
} else {
  console.log('Tudo certo.')
}
