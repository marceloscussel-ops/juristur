import { createClient as createServiceClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { getTrialInfo } from '@/lib/plans'
import { StatTile, VBars, HBars, Donut, ChartCard } from '@/components/admin/Charts'
import PeriodSelector from '@/components/admin/PeriodSelector'

export const dynamic = 'force-dynamic'

function db() {
  return createServiceClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
}

const DAY = 86_400_000
const HOUR = 3_600_000
const BR = 3 * HOUR // Brasil = UTC-3, fixo (sem horário de verão desde 2019)

/** Início do dia (00:00 BR) do instante `ms`, retornado como instante UTC. */
function brDayStart(ms: number): number {
  const s = new Date(ms - BR)
  return Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()) + BR
}
function brLabelDay(ms: number): string {
  const s = new Date(ms - BR)
  return `${String(s.getUTCDate()).padStart(2, '0')}/${String(s.getUTCMonth() + 1).padStart(2, '0')}`
}
function brLabelHour(ms: number): string {
  const s = new Date(ms - BR)
  return `${String(s.getUTCHours()).padStart(2, '0')}h`
}
/** "YYYY-MM-DD" (data BR) → instante UTC do 00:00 BR desse dia. */
function parseBrDate(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number)
  return Date.UTC(y, (m ?? 1) - 1, d ?? 1) + BR
}

function countBy<T>(rows: T[], key: (r: T) => string) {
  const map = new Map<string, number>()
  for (const r of rows) map.set(key(r), (map.get(key(r)) ?? 0) + 1)
  return map
}

const PERIOD_LABEL: Record<string, string> = {
  today: 'hoje',
  '7d':  'últimos 7 dias',
  '30d': 'últimos 30 dias',
  '90d': 'últimos 90 dias',
  '180d': 'últimos 180 dias',
  custom: 'período selecionado',
}

interface Props {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>
}

export default async function AdminDashboard({ searchParams }: Props) {
  const sp = await searchParams
  let period = sp.period ?? '30d'
  const now = Date.now()

  // ── Resolve o intervalo [start, end) ──
  let start: number
  let end = now
  switch (period) {
    case 'today': start = brDayStart(now); break
    case '7d':    start = brDayStart(now - 6 * DAY); break
    case '90d':   start = brDayStart(now - 89 * DAY); break
    case '180d':  start = brDayStart(now - 179 * DAY); break
    case 'custom':
      if (sp.from && sp.to) {
        start = parseBrDate(sp.from)
        end   = parseBrDate(sp.to) + DAY // inclui o dia final inteiro
      } else { period = '30d'; start = brDayStart(now - 29 * DAY) }
      break
    default: period = '30d'; start = brDayStart(now - 29 * DAY)
  }
  if (start >= end) { period = '30d'; start = brDayStart(now - 29 * DAY); end = now }

  // ── Granularidade e baldes ──
  const spanDays = Math.max(1, Math.round((end - start) / DAY))
  const gran: 'hour' | 'day' | 'week' = period === 'today' ? 'hour' : spanDays <= 45 ? 'day' : 'week'
  const step = gran === 'hour' ? HOUR : gran === 'day' ? DAY : 7 * DAY

  const buckets: { start: number; label: string }[] = []
  for (let t = start; t < end; t += step) {
    buckets.push({ start: t, label: gran === 'hour' ? brLabelHour(t) : brLabelDay(t) })
  }
  if (buckets.length === 0) buckets.push({ start, label: brLabelDay(start) })

  function bucketize(dates: string[]) {
    const counts = new Array(buckets.length).fill(0)
    for (const ds of dates) {
      const t = new Date(ds).getTime()
      if (t < start || t >= end) continue
      const idx = Math.floor((t - start) / step)
      if (idx >= 0 && idx < counts.length) counts[idx]++
    }
    return buckets.map((b, i) => ({ label: b.label, value: counts[i] }))
  }

  // ── Dados ──
  const supabase = db()
  const [{ data: agencies }, { data: cases }, { data: analyses }] = await Promise.all([
    supabase.from('agencies').select('created_at, subscription_status, trial_ends_at'),
    supabase.from('cases').select('created_at, origin, category'),
    supabase.from('case_analyses').select('review_status, tokens_used, created_at'),
  ])
  const ags = agencies ?? []
  const cs  = cases ?? []
  const ans = analyses ?? []

  const inPeriod = (iso: string) => { const t = new Date(iso).getTime(); return t >= start && t < end }
  const agsP = ags.filter(a => inPeriod(a.created_at))
  const csP  = cs.filter(c => inPeriod(c.created_at))
  const ansP = ans.filter(a => inPeriod(a.created_at))

  const fmt = (n: number) => n.toLocaleString('pt-BR')
  const plabel = PERIOD_LABEL[period] ?? 'período'

  // ── KPIs (do período, com total como contexto) ──
  const whatsappCases = csP.filter(c => c.origin === 'whatsapp').length
  const webCases      = csP.filter(c => c.origin === 'web').length
  const pctWhatsapp   = csP.length ? Math.round((whatsappCases / csP.length) * 100) : 0
  const tokensPeriod  = ansP.reduce((s, a) => s + (a.tokens_used ?? 0), 0)

  // ── Categorias / origem / funil (do período) ──
  const categoryData = Array.from(countBy(csP, c => c.category ?? 'Outro').entries())
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)

  const revMap = countBy(ansP, a => a.review_status ?? 'pending')
  const funnelData = [
    { label: 'Pendente',   value: revMap.get('pending') ?? 0,            color: '#E8900C' },
    { label: 'Aprovado',   value: revMap.get('approved') ?? 0,           color: '#0E9E7A' },
    { label: 'Em revisão', value: revMap.get('revision_requested') ?? 0, color: '#EE4A34' },
  ]

  // ── Status das agências: snapshot atual de TODA a base (não filtrado por período) ──
  let emTeste = 0, expirado = 0, ativo = 0
  for (const a of ags) {
    const t = getTrialInfo(a)
    if (t.isActive) ativo++
    else if (t.isExpired) expirado++
    else emTeste++
  }
  const statusData = [
    { label: 'Em teste',       value: emTeste,  color: '#5B57E8' },
    { label: 'Assinante',      value: ativo,    color: '#0E9E7A' },
    { label: 'Teste expirado', value: expirado, color: '#EE4A34' },
  ]

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h1 className="j-h1">Visão geral</h1>
        <p className="j-caption mt-1">Acompanhamento do sistema · horário de Brasília</p>
      </div>

      <PeriodSelector period={period} from={sp.from} to={sp.to} />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label={`Novas agências · ${plabel}`} value={fmt(agsP.length)}
                  sub={`${fmt(ags.length)} no total`} accent="#5B57E8" />
        <StatTile label={`Novos casos · ${plabel}`} value={fmt(csP.length)}
                  sub={`${fmt(cs.length)} no total`} accent="#0E9E7A" />
        <StatTile label={`Casos via WhatsApp · ${plabel}`} value={fmt(whatsappCases)}
                  sub={`${pctWhatsapp}% dos casos do período`} accent="#25D366" />
        <StatTile label={`Tokens de IA · ${plabel}`} value={fmt(tokensPeriod)}
                  sub="consumo estimado na API" accent="#16202F" />
      </div>

      {/* Séries temporais */}
      <div className="grid lg:grid-cols-2 gap-5">
        <ChartCard title={`Novas agências · ${plabel}`}>
          <VBars data={bucketize(agsP.map(a => a.created_at))} color="#5B57E8" />
        </ChartCard>
        <ChartCard title={`Novos casos · ${plabel}`}>
          <VBars data={bucketize(csP.map(c => c.created_at))} color="#0E9E7A" />
        </ChartCard>
      </div>

      {/* Origem + Categorias */}
      <div className="grid lg:grid-cols-2 gap-5">
        <ChartCard title={`Origem dos casos · ${plabel}`}>
          <Donut segments={[
            { label: 'WhatsApp', value: whatsappCases, color: '#25D366' },
            { label: 'Plataforma web', value: webCases, color: '#5B57E8' },
          ]} />
        </ChartCard>
        <ChartCard title={`Casos por categoria · ${plabel}`}>
          <HBars data={categoryData} color="#5B57E8" />
        </ChartCard>
      </div>

      {/* Status (base atual) + Funil */}
      <div className="grid lg:grid-cols-2 gap-5">
        <ChartCard title="Agências por status · base atual">
          <HBars data={statusData} />
        </ChartCard>
        <ChartCard title={`Funil de revisão · ${plabel}`}>
          <HBars data={funnelData} />
        </ChartCard>
      </div>
    </div>
  )
}
