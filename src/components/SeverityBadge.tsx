import type { Severity } from '@/types'
import { toneColors, type Tone } from '@/lib/tones'

const CONFIG: Record<Severity, { label: string; tone: Tone }> = {
  leve:         { label: 'Risco Leve',          tone: 'teal'  },
  medio:        { label: 'Risco Médio',         tone: 'amber' },
  elevado:      { label: 'Risco Elevado',       tone: 'coral' },
  elevadissimo: { label: 'Risco Elevadíssimo',  tone: 'crit'  },
}

interface Props {
  severity: Severity
  compact?: boolean
}

export default function SeverityBadge({ severity, compact = false }: Props) {
  const { label, tone } = CONFIG[severity]
  const c = toneColors(tone)

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 7,
      padding: compact ? '4px 11px' : '7px 14px', borderRadius: 999,
      border: `1px solid ${c.border}`, background: c.bg,
      fontSize: compact ? 12 : 13.5, fontWeight: 600, color: c.text,
      lineHeight: 1, fontFamily: 'Inter,sans-serif', whiteSpace: 'nowrap',
    }}>
      <span style={{
        display: 'block', width: 9, height: 9, borderRadius: '50%',
        background: c.dot, boxShadow: `0 0 0 3px ${c.border}`,
      }} />
      {label}
    </span>
  )
}
