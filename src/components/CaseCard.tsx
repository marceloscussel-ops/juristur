import Link from 'next/link'
import ComplexityBadge, { type Complexity } from './ComplexityBadge'
import { toneColors, type Tone } from '@/lib/tones'

type CardStatus = 'aguardando' | 'em_analise' | 'resolvido'

const STATUS: Record<CardStatus, { label: string; tone: Tone }> = {
  aguardando: { label: 'Aguardando', tone: 'amber' },
  em_analise: { label: 'Em análise', tone: 'amber' },
  resolvido:  { label: 'Resolvido',  tone: 'teal'  },
}

interface Props {
  id: string
  title: string
  category: string
  areas?: string[]
  complexity?: Complexity
  agencyName?: string
  createdAt: string
  status: CardStatus
  href: string
}

function elapsed(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `há ${m}min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  return `há ${Math.floor(h / 24)}d`
}

export default function CaseCard({ id, title, category, areas = [], complexity, agencyName, createdAt, status, href }: Props) {
  const s   = STATUS[status]
  const c   = toneColors(s.tone)
  const tagTone = toneColors('indigo')
  const ym = createdAt.slice(0, 7).replace('-', '')
  const caseCode = `CASO #TG-${ym}-${id.slice(0, 4).toUpperCase()}`
  const allTags = [category, ...areas]

  return (
    <div style={{
      background: 'var(--j-card)', border: '1px solid var(--j-border-strong)', borderRadius: 18, padding: 20,
      boxShadow: 'var(--j-shadow-card)',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 12, color: 'var(--j-ink-80)', letterSpacing: '0.02em' }}>
          {caseCode}
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 999,
          background: c.bg, border: `1px solid ${c.border}`,
          fontSize: 11, fontWeight: 500, color: c.text, whiteSpace: 'nowrap',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
          {s.label}
        </span>
      </div>

      {/* Title */}
      <p style={{
        fontFamily: 'Sora,sans-serif', fontWeight: 600, fontSize: 17,
        lineHeight: 1.35, letterSpacing: '-0.3px', color: 'var(--j-ink)',
        margin: '0 0 12px',
      }}>
        {title}
      </p>

      {/* Tags + complexity */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        {allTags.map(tag => (
          <span key={tag} style={{
            padding: '3px 8px', borderRadius: 7,
            background: tagTone.bg, border: `1px solid ${tagTone.border}`,
            fontSize: 12, fontWeight: 500, color: tagTone.text, fontFamily: 'Inter,sans-serif',
          }}>
            {tag}
          </span>
        ))}
        {complexity && <ComplexityBadge complexity={complexity} compact />}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid var(--j-border)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--j-ink-40)', fontFamily: 'Inter,sans-serif' }}>
          {agencyName ? `${agencyName} · ` : ''}{elapsed(createdAt)}
        </span>
        <Link href={href} style={{ fontSize: 13, fontWeight: 600, color: 'var(--j-indigo)', textDecoration: 'none', fontFamily: 'Inter,sans-serif' }}>
          Ver orientação →
        </Link>
      </div>
    </div>
  )
}
