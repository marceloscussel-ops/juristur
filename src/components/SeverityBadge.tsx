import type { Severity } from '@/types'

const CONFIG: Record<Severity, { label: string; bg: string; border: string; text: string; dot: string }> = {
  leve:         { label: 'Risco Leve',          bg: '#EAFBF5', border: '#C8F4E5', text: '#086552', dot: '#0E9E7A' },
  medio:        { label: 'Risco Médio',         bg: '#FFF8EB', border: '#FDD88A', text: '#9A530A', dot: '#E8900C' },
  elevado:      { label: 'Risco Elevado',       bg: '#FFF1EF', border: '#FFC0B7', text: '#AF2719', dot: '#EE4A34' },
  elevadissimo: { label: 'Risco Elevadíssimo',  bg: '#FFE9E5', border: '#FFA093', text: '#8F1E12', dot: '#AF2719' },
}

interface Props {
  severity: Severity
  compact?: boolean
}

export default function SeverityBadge({ severity, compact = false }: Props) {
  const c = CONFIG[severity]
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
        background: c.dot, boxShadow: `0 0 0 3px ${c.dot}22`,
      }} />
      {c.label}
    </span>
  )
}
