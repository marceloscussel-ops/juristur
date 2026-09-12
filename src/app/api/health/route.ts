import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin, type SupabaseClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { normalizePhone } from '@/lib/phone'

export const dynamic = 'force-dynamic'

/**
 * /api/health — auto-verificação de configuração e schema.
 *
 * Foca na classe de bugs que mais nos travou: env var ausente ou com BOM,
 * migração SQL não rodada (colunas faltando), service role quebrado.
 * Protegido por ?key=<SEED_SECRET>. Retorna 200 se tudo ok, 503 se degradado.
 */

type Check = { name: string; ok: boolean; detail?: string }

/**
 * Retorna os caracteres perigosos (BOM / não-ASCII / controle) de uma env var
 * como "U+XXXX@índice", ou null se estiver limpa. Ignora espaço/quebra de linha
 * no fim (comum no Vercel e inofensivo). Não revela o valor do segredo.
 */
function dangerousCharsDetail(name: string): string | null {
  const raw = process.env[name] ?? ''
  if (!raw) return null
  const body = raw.replace(/\s+$/, '')          // ignora whitespace no final
  const bad: string[] = []
  for (let i = 0; i < body.length && bad.length < 5; i++) {
    const code = body.charCodeAt(i)
    if (code < 0x20 || code > 0x7E) {
      bad.push(`U+${code.toString(16).toUpperCase().padStart(4, '0')}@${i}`)
    }
  }
  return bad.length ? bad.join(',') : null
}

/**
 * Consistência dos dados que o produto assume verdadeira e que nenhuma
 * constraint garante. Ambos os checks nasceram de incidente real:
 *
 * - agência órfã: usuário no Auth sem linha em `agencies`. A pessoa navega
 *   normalmente e só descobre ao abrir o primeiro caso, quando o insert bate na
 *   foreign key e a tela mostra um erro genérico.
 * - telefone duplicado: `agencies.phone` é UNIQUE, mas só como string — o mesmo
 *   WhatsApp gravado em formatos diferentes (`5551998344269` e `555198344269`)
 *   passa pela constraint e deixa o webhook ambíguo: quem recebe a resposta
 *   depende do formato que a Z-API mandar.
 */
async function dataChecks(admin: SupabaseClient): Promise<Check[]> {
  const out: Check[] = []

  const { data: ags, error: agsErr } = await admin.from('agencies').select('id, phone')
  if (agsErr) {
    return [{ name: 'data:consistencia', ok: false, detail: agsErr.message }]
  }

  const { data: authData, error: authErr } = await admin.auth.admin.listUsers({ perPage: 1000 })
  if (authErr) {
    out.push({ name: 'data:agencias-orfas', ok: false, detail: authErr.message })
  } else {
    const withAgency = new Set(ags.map(a => a.id))
    const orphans = authData.users.filter(
      u => !withAgency.has(u.id) && u.app_metadata?.role !== 'lawyer'
    )
    out.push({
      name:   'data:agencias-orfas',
      ok:     orphans.length === 0,
      detail: orphans.length ? `${orphans.length}: ${orphans.map(u => u.id).join(', ')}` : undefined,
    })
  }

  const byNumber = new Map<string, string[]>()
  for (const a of ags) {
    if (!a.phone) continue
    const key = normalizePhone(a.phone)
    if (!key) continue
    byNumber.set(key, [...(byNumber.get(key) ?? []), a.id])
  }
  const dups = Array.from(byNumber.entries()).filter(([, ids]) => ids.length > 1)
  out.push({
    name:   'data:telefones-duplicados',
    ok:     dups.length === 0,
    detail: dups.length ? dups.map(([n, ids]) => `${n} -> ${ids.join(' e ')}`).join('; ') : undefined,
  })

  return out
}

export async function GET(req: NextRequest) {
  const secret = env('SEED_SECRET')
  const key = new URL(req.url).searchParams.get('key') ?? ''
  if (!secret || key !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const checks: Check[] = []

  // ── Env vars obrigatórias ──
  const requiredEnv = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'ZAPI_INSTANCE_ID',
    'ZAPI_TOKEN',
    'NEXT_PUBLIC_WHATSAPP_NUMBER',
  ]
  for (const name of requiredEnv) {
    const present = !!env(name)
    checks.push({ name: `env:${name}`, ok: present, detail: present ? undefined : 'ausente' })
    const bad = present ? dangerousCharsDetail(name) : null
    if (bad) {
      checks.push({ name: `env:${name}:sem-bom`, ok: false, detail: `caractere que quebra header HTTP: ${bad}` })
    }
  }

  // ── Formato da chave Anthropic ──
  const anthKey = env('ANTHROPIC_API_KEY')
  if (anthKey) {
    const okFmt = anthKey.startsWith('sk-ant-')
    checks.push({ name: 'format:ANTHROPIC_API_KEY', ok: okFmt, detail: okFmt ? undefined : 'formato inesperado' })
  }

  // ── Banco: alcançável + schema esperado (via service role) ──
  const url = env('NEXT_PUBLIC_SUPABASE_URL')
  const svc = env('SUPABASE_SERVICE_ROLE_KEY')
  if (url && svc) {
    const admin = createAdmin(url, svc)

    // Sem `count: 'exact'`: combinado com `head` ele devolve 206 e a lib
    // reportava erro de mensagem vazia mesmo com o banco respondendo — o health
    // acusava 503 justamente quando alguém vinha diagnosticar um incidente.
    const { error: reachErr } = await admin.from('agencies').select('id', { head: true }).limit(1)
    checks.push({ name: 'db:reachable', ok: !reachErr, detail: reachErr?.message })

    // Colunas/tabelas cuja ausência = migração não rodada
    const schema: Array<[string, string]> = [
      ['agencies',      'subscription_status'],
      ['agencies',      'trial_ends_at'],
      ['agencies',      'plan'],
      ['cases',         'escalated_at'],
      ['cases',         'origin'],
      ['case_messages', 'content'],
      ['case_analyses', 'review_status'],
      ['case_analyses', 'severity'],
      ['whatsapp_processed_messages', 'message_id'],
    ]
    for (const [table, col] of schema) {
      const { error } = await admin.from(table).select(col, { head: true }).limit(1)
      checks.push({ name: `schema:${table}.${col}`, ok: !error, detail: error?.message })
    }

    for (const check of await dataChecks(admin)) checks.push(check)
  } else {
    checks.push({ name: 'db:reachable', ok: false, detail: 'sem URL ou service key' })
  }

  const failures = checks.filter(c => !c.ok)
  return NextResponse.json(
    {
      status:    failures.length === 0 ? 'ok' : 'degraded',
      checkedAt: new Date().toISOString(),
      passed:    checks.length - failures.length,
      total:     checks.length,
      failures,
      checks,
    },
    { status: failures.length === 0 ? 200 : 503 }
  )
}
