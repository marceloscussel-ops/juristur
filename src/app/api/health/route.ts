import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { env } from '@/lib/env'

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

    const { error: reachErr } = await admin
      .from('agencies').select('id', { head: true, count: 'exact' }).limit(1)
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
    ]
    for (const [table, col] of schema) {
      const { error } = await admin.from(table).select(col, { head: true }).limit(1)
      checks.push({ name: `schema:${table}.${col}`, ok: !error, detail: error?.message })
    }
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
