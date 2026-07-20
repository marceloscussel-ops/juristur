import type { ReactNode } from 'react'

const TRACK = 'rgba(22,32,47,0.08)'

/** Cartão KPI com número grande. */
export function StatTile({ label, value, sub, accent }: {
  label: string
  value: ReactNode
  sub?: ReactNode
  accent?: string
}) {
  return (
    <div className="j-card">
      <p className="j-caption">{label}</p>
      <p className="font-display font-extrabold text-[28px] leading-none tracking-tight mt-1.5"
         style={{ color: accent ?? '#16202F' }}>
        {value}
      </p>
      {sub && <p className="j-caption mt-1">{sub}</p>}
    </div>
  )
}

/** Gráfico de barras verticais (série temporal). Tooltip nativo via title. */
export function VBars({ data, color = '#5B57E8' }: {
  data: { label: string; value: number }[]
  color?: string
}) {
  const max = Math.max(1, ...data.map(d => d.value))
  return (
    <div>
      <div className="flex items-end gap-[2px] h-40">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-[2px] transition-colors"
            style={{
              height: `${(d.value / max) * 100}%`,
              minHeight: d.value > 0 ? 3 : 0,
              background: d.value > 0 ? color : TRACK,
            }}
            title={`${d.label}: ${d.value}`}
          />
        ))}
      </div>
      <div className="flex justify-between j-caption mt-2">
        <span>{data[0]?.label}</span>
        <span>pico: {max}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  )
}

/** Barras horizontais (categorias, status, funil). */
export function HBars({ data, color = '#5B57E8' }: {
  data: { label: string; value: number; color?: string }[]
  color?: string
}) {
  const max = Math.max(1, ...data.map(d => d.value))
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <p className="j-caption">Sem dados ainda.</p>
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex justify-between text-[13px] mb-1">
            <span className="text-ink-80 truncate pr-2">{d.label}</span>
            <span className="text-ink-40 tabular-nums whitespace-nowrap">
              {d.value} · {Math.round((d.value / total) * 100)}%
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: TRACK }}>
            <div className="h-full rounded-full"
                 style={{ width: `${(d.value / max) * 100}%`, background: d.color ?? color }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Rosca (donut) com legenda — para divisões simples (ex.: origem dos casos). */
export function Donut({ segments }: {
  segments: { label: string; value: number; color: string }[]
}) {
  const total = Math.max(1, segments.reduce((s, x) => s + x.value, 0))
  const R = 15.9155, C = 2 * Math.PI * R
  let offset = 0
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 40 40" className="w-28 h-28 shrink-0" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="20" cy="20" r={R} fill="none" stroke={TRACK} strokeWidth="5" />
        {segments.map((s, i) => {
          const len = (s.value / total) * C
          const el = (
            <circle key={i} cx="20" cy="20" r={R} fill="none" stroke={s.color} strokeWidth="5"
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} strokeLinecap="butt" />
          )
          offset += len
          return el
        })}
      </svg>
      <div className="space-y-2">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-[13px]">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-ink-80">{s.label}</span>
            <span className="text-ink-40 tabular-nums">
              {s.value} · {Math.round((s.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Título de seção reutilizável. */
export function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="j-card">
      <p className="j-overline mb-4">{title}</p>
      {children}
    </div>
  )
}
