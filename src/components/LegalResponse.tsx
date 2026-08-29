import TGLogo from './TGLogo'
import ComplexityBadge, { type Complexity } from './ComplexityBadge'
import SeverityBadge from './SeverityBadge'
import EscalateButton from './EscalateButton'
import MarkdownRenderer from './MarkdownRenderer'
import { formatDateTimeLong } from '@/lib/datetime'
import type { Severity } from '@/types'

interface Props {
  content: string
  complexity?: Complexity
  severity?: Severity | null
  generatedAt?: string
  escalateHref?: string
}

export default function LegalResponse({ content, complexity, severity, generatedAt, escalateHref }: Props) {
  return (
    <div style={{
      borderRadius: 18, overflow: 'hidden',
      boxShadow: '0 1px 2px rgba(11,18,28,.04), 0 12px 28px -18px rgba(11,18,28,.18)',
    }}>
      {/* Dark header */}
      <div style={{
        background: '#0B121C',
        backgroundImage: 'radial-gradient(120% 120% at 100% 0%, rgba(91,87,232,.35), transparent 55%)',
        padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <TGLogo size={30} variant="mono-light" />
          <div>
            <p style={{ fontFamily: 'Sora,sans-serif', fontWeight: 600, fontSize: 15, color: '#FFFFFF', margin: 0, lineHeight: 1.3 }}>
              Orientação TurisGuard
            </p>
            <p style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: '#9DA1FB', margin: 0, marginTop: 2 }}>
              Gerada por IA · revisada por advogado
            </p>
          </div>
        </div>
        {(severity || complexity) && (
          <span style={{ opacity: 0.95 }}>
            {severity
              ? <SeverityBadge severity={severity} compact />
              : <ComplexityBadge complexity={complexity!} compact />}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ background: '#FFFFFF', padding: 22 }}>
        <MarkdownRenderer content={content} />

        {/* OAB Disclaimer */}
        <div style={{
          marginTop: 20, background: '#FFF8EB', border: '1px solid #FDD88A',
          borderRadius: 12, padding: '14px 16px',
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <span style={{
            flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: '#E8900C',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: '#FFFFFF', lineHeight: 1,
          }}>!</span>
          <div>
            <p style={{ fontFamily: 'Inter,sans-serif', fontWeight: 600, fontSize: 12.5, color: '#7C420E', margin: '0 0 4px' }}>
              Aviso · Provimento OAB
            </p>
            <p style={{ fontFamily: 'Inter,sans-serif', fontSize: 12.5, color: '#7C420E', margin: 0, lineHeight: 1.6 }}>
              Orientação informativa gerada por IA com base na legislação vigente. Não constitui parecer jurídico nem
              substitui a avaliação de advogado(a) inscrito(a) na OAB. Para decisões com risco contratual ou financeiro
              relevante, escale para atendimento humano.
            </p>
          </div>
        </div>

        {generatedAt && (
          <p style={{ fontFamily: 'Inter,sans-serif', fontSize: 12, color: '#6E7E98', marginTop: 12, marginBottom: 0 }}>
            Gerada em {formatDateTimeLong(generatedAt)}
          </p>
        )}

        {escalateHref && (
          <div style={{ marginTop: 20 }}>
            <EscalateButton href={escalateHref} variant="primary" />
          </div>
        )}
      </div>
    </div>
  )
}
