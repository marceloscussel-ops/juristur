'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PRESETS = [
  { key: 'today', label: 'Hoje' },
  { key: '7d',    label: '7 dias' },
  { key: '30d',   label: '30 dias' },
  { key: '90d',   label: '90 dias' },
  { key: '180d',  label: '180 dias' },
]

export default function PeriodSelector({ period, from, to }: {
  period: string
  from?: string
  to?: string
}) {
  const router = useRouter()
  const [showCustom, setShowCustom] = useState(period === 'custom')
  const [f, setF] = useState(from ?? '')
  const [t, setT] = useState(to ?? '')

  function select(p: string) {
    if (p === 'custom') { setShowCustom(true); return }
    setShowCustom(false)
    router.push(`/admin?period=${p}`)
  }

  function applyCustom() {
    if (!f || !t) return
    router.push(`/admin?period=custom&from=${f}&to=${t}`)
  }

  const pill = (active: boolean) =>
    `rounded-pill px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
      active
        ? 'bg-indigo text-white'
        : 'bg-white border border-[rgba(13,13,26,0.1)] text-ink-80 hover:border-indigo'
    }`

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(p => (
          <button key={p.key} type="button" onClick={() => select(p.key)} className={pill(period === p.key)}>
            {p.label}
          </button>
        ))}
        <button type="button" onClick={() => select('custom')} className={pill(period === 'custom' || showCustom)}>
          Personalizado
        </button>
      </div>

      {showCustom && (
        <div className="flex flex-wrap items-end gap-2 j-card !py-3">
          <div>
            <label className="j-caption block mb-1">De</label>
            <input type="date" value={f} max={t || undefined}
                   onChange={e => setF(e.target.value)} className="j-input" />
          </div>
          <div>
            <label className="j-caption block mb-1">Até</label>
            <input type="date" value={t} min={f || undefined}
                   onChange={e => setT(e.target.value)} className="j-input" />
          </div>
          <button type="button" onClick={applyCustom} disabled={!f || !t}
                  className="btn btn-primary">
            Aplicar
          </button>
        </div>
      )}
    </div>
  )
}
