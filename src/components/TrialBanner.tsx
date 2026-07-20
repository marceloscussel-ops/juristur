import Link from 'next/link'
import { Sparkles, Clock, AlertTriangle } from 'lucide-react'
import type { TrialInfo } from '@/lib/plans'

/**
 * Barra de status do período gratuito, exibida no topo da área logada.
 * - Assinante ativo  → não renderiza nada
 * - Trial saudável   → faixa discreta (indigo)
 * - Trial acabando   → faixa de atenção (âmbar, ≤ 7 dias)
 * - Trial expirado   → faixa de alerta (coral) com CTA forte
 */
export default function TrialBanner({ trial }: { trial: TrialInfo }) {
  if (trial.isActive) return null

  const diasTxt = trial.daysLeft === 1 ? 'falta 1 dia' : `faltam ${trial.daysLeft} dias`

  if (trial.isExpired) {
    return (
      <Bar tone="coral">
        <span className="flex items-center gap-2 min-w-0">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="truncate">
            <strong className="font-semibold">Seu período gratuito terminou.</strong>{' '}
            <span className="hidden sm:inline">Assine para continuar usando o TurisGuard.</span>
          </span>
        </span>
        <Cta tone="coral">Assinar agora</Cta>
      </Bar>
    )
  }

  if (trial.daysLeft <= 7) {
    return (
      <Bar tone="amber">
        <span className="flex items-center gap-2 min-w-0">
          <Clock className="w-4 h-4 shrink-0" />
          <span className="truncate">
            <strong className="font-semibold">Seu período gratuito acaba em breve</strong> — {diasTxt}.
          </span>
        </span>
        <Cta tone="amber">Ver planos</Cta>
      </Bar>
    )
  }

  return (
    <Bar tone="indigo">
      <span className="flex items-center gap-2 min-w-0">
        <Sparkles className="w-4 h-4 shrink-0" />
        <span className="truncate">
          Você está no <strong className="font-semibold">período gratuito</strong> — {diasTxt}.
        </span>
      </span>
      <Cta tone="indigo">Ver planos</Cta>
    </Bar>
  )
}

type Tone = 'indigo' | 'amber' | 'coral'

const barStyles: Record<Tone, string> = {
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  amber:  'bg-amber-50 text-amber-800 border-amber-200',
  coral:  'bg-coral-50 text-coral-700 border-coral-200',
}

const ctaStyles: Record<Tone, string> = {
  indigo: 'bg-indigo text-white hover:bg-indigo-light',
  amber:  'bg-amber text-white hover:bg-amber-700',
  coral:  'bg-coral text-white hover:bg-coral-600',
}

function Bar({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <div className={`border-b ${barStyles[tone]}`}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3 text-[13px]">
        {children}
      </div>
    </div>
  )
}

function Cta({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <Link
      href="/assinar"
      className={`shrink-0 no-underline rounded-pill px-3 py-1 text-[12px] font-semibold transition-colors ${ctaStyles[tone]}`}
    >
      {children}
    </Link>
  )
}
