import Link from 'next/link'
import ComplexityBadge, { type Complexity } from './ComplexityBadge'

type CardStatus = 'aguardando' | 'em_analise' | 'resolvido'

const STATUS: Record<CardStatus, { label: string; dot: string; bg: string; border: string; text: string }> = {
  aguardando: { label: 'Aguardando',  dot: '#E8900C', bg: '#FFF8EB', border: '#FDD88A', text: '#9A530A' },
  em_analise: { label: 'Em análise', dot: '#E8900C', bg: '#FFF8EB', border: '#FDD88A', text: '#9A530A' },
  resolvido:  { label: 'Resolvido',  dot: '#0E9E7A', bg: '#EAFBF5', border: '#C8F4E5', text: '#086552' },
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
  const s = STATUS[status]
  const ym = createdAt.slice(0, 7).replace('-', '')
  const caseCode = `CASO #TG-${ym}-${id.slice(0, 4).toUpperCase()}`
  const allTags = [category, ...areas]

  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid #E6EAF0', borderRadius: 18, padding: 20,
      boxShadow: '0 1px 2px rgba(11,18,28,.04), 0 12px 28px -18px rgba(11,18,28,.18)',
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 12, color: '#4A5A75', letterSpacing: '0.02em' }}>
          {caseCode}
        </span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 999,
          background: s.bg, border: `1px solid ${s.border}`,
          fontSize: 11, fontWeight: 500, color: s.text, whiteSpace: 'nowrap',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
          {s.label}
        </span>
      </div>

      {/* Title */}
      <p style={{
        fontFamily: 'Sora,sans-serif', fontWeight: 600, fontSize: 17,
        lineHeight: 1.35, letterSpacing: '-0.3px', color: '#0B121C',
        margin: '0 0 12px',
      }}>
        {title}
      </p>

      {/* Tags + complexity */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        {allTags.map(tag => (
          <span key={tag} style={{
            padding: '3px 8px', borderRadius: 7,
            background: '#EEF0FF', border: '1px solid #DEE2FF',
            fontSize: 12, fontWeight: 500, color: '#3A35AC', fontFamily: 'Inter,sans-serif',
          }}>
            {tag}
          </span>
        ))}
        {complexity && <ComplexityBadge complexity={complexity} compact />}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #EEF1F5', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#6E7E98', fontFamily: 'Inter,sans-serif' }}>
          {agencyName ? `${agencyName} · ` : ''}{elapsed(createdAt)}
        </span>
        <Link href={href} style={{ fontSize: 13, fontWeight: 600, color: '#4842D4', textDecoration: 'none', fontFamily: 'Inter,sans-serif' }}>
          Ver orientação →
        </Link>
      </div>
    </div>
  )
}
