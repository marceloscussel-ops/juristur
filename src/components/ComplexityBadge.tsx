export type Complexity = 'simples' | 'moderada' | 'complexa'

const CONFIG = {
  simples:  { bg: '#EAFBF5', border: '#C8F4E5', text: '#086552', active: '#0E9E7A', inactive: '#C8F4E5', label: 'Simples',  bars: 1 },
  moderada: { bg: '#FFF8EB', border: '#FDD88A', text: '#9A530A', active: '#E8900C', inactive: '#FDD88A', label: 'Moderada', bars: 2 },
  complexa: { bg: '#FFF1EF', border: '#FFC0B7', text: '#AF2719', active: '#D33420', inactive: '#FFC0B7', label: 'Complexa', bars: 3 },
}

const BAR_HEIGHTS = [6, 9, 13]

interface Props {
  complexity: Complexity
  compact?: boolean
}

export default function ComplexityBadge({ complexity, compact = false }: Props) {
  const c = CONFIG[complexity]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: compact ? '4px 10px' : '7px 14px', borderRadius: 999,
      border: `1px solid ${c.border}`, background: c.bg,
      fontSize: compact ? 12 : 13.5, fontWeight: 600, color: c.text,
      lineHeight: 1, fontFamily: 'Inter,sans-serif', whiteSpace: 'nowrap',
    }}>
      <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2 }}>
        {BAR_HEIGHTS.map((h, i) => (
          <span key={i} style={{
            display: 'block', width: 3, height: h, borderRadius: 1,
            background: i < c.bars ? c.active : c.inactive,
          }} />
        ))}
      </span>
      {c.label}
    </span>
  )
}
