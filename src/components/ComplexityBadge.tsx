import { toneColors, type Tone } from '@/lib/tones'

export type Complexity = 'simples' | 'moderada' | 'complexa'

const CONFIG: Record<Complexity, { label: string; tone: Tone; bars: number }> = {
  simples:  { label: 'Simples',  tone: 'teal',  bars: 1 },
  moderada: { label: 'Moderada', tone: 'amber', bars: 2 },
  complexa: { label: 'Complexa', tone: 'coral', bars: 3 },
}

const BAR_HEIGHTS = [6, 9, 13]

interface Props {
  complexity: Complexity
  compact?: boolean
}

export default function ComplexityBadge({ complexity, compact = false }: Props) {
  const { label, tone, bars } = CONFIG[complexity]
  const c = toneColors(tone)

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
            background: i < bars ? c.dot : c.border,
          }} />
        ))}
      </span>
      {label}
    </span>
  )
}
