'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react'
import EscalateButton, { type EscalateVariant } from '@/components/EscalateButton'
import type { EscalationInfo } from '@/lib/plans'
import type { Severity } from '@/types'

interface Props {
  caseId:           string
  whatsappUrl:      string
  alreadyEscalated: boolean
  info:             EscalationInfo
  severity?:        Severity | null
  variant?:         EscalateVariant
}

export default function CaseEscalate({ caseId, whatsappUrl, alreadyEscalated, info, severity, variant = 'primary' }: Props) {
  const [escalated, setEscalated] = useState(alreadyEscalated)
  const [remaining, setRemaining] = useState(info.remaining)

  // Bloqueado: sem cota e este caso ainda não foi escalado
  const blocked = !escalated && !info.canEscalate
  const limited = info.total !== null  // período gratuito (assinante = ilimitado)

  // Recomenda advogado para risco médio pra cima (enquanto não escalado)
  const recommend = !escalated && (severity === 'medio' || severity === 'elevado' || severity === 'elevadissimo')
  const high = severity === 'elevado' || severity === 'elevadissimo'

  // Registra a escalada em segundo plano (o link abre o WhatsApp diretamente,
  // evitando bloqueio de popup). O servidor valida a cota de forma idempotente.
  function recordEscalation() {
    if (escalated) return
    setEscalated(true)
    if (Number.isFinite(remaining)) setRemaining(r => Math.max(0, r - 1))
    fetch(`/api/cases/${caseId}/escalate`, { method: 'POST' }).catch(() => {})
  }

  if (blocked) {
    const msg = info.reason === 'trial_expired'
      ? 'Seu período gratuito terminou.'
      : `Você usou suas ${info.total} escaladas gratuitas.`
    return (
      <div className="mt-5 rounded-xl border border-coral-200 bg-coral-50 p-4">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-coral shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-semibold text-coral-700">{msg}</p>
            <p className="j-caption mt-0.5">Assine um plano para falar com um advogado sobre este caso.</p>
            <Link href="/assinar" className="btn btn-primary btn-sm no-underline mt-3 inline-flex">
              Ver planos
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-5">
      {recommend && (
        <div className={`mb-3 rounded-xl border p-3.5 flex items-start gap-2.5 ${
          high ? 'border-coral-200 bg-coral-50' : 'border-amber-200 bg-amber-50'
        }`}>
          <ShieldAlert className={`w-4 h-4 shrink-0 mt-0.5 ${high ? 'text-coral' : 'text-amber-700'}`} />
          <p className={`text-[13px] ${high ? 'text-coral-700' : 'text-amber-800'}`}>
            <strong className="font-semibold">
              {high ? 'Caso de risco elevado.' : 'Caso de risco médio.'}
            </strong>{' '}
            Recomendamos confirmar este caso com um advogado antes de agir.
          </p>
        </div>
      )}

      <EscalateButton href={whatsappUrl} onClick={recordEscalation} variant={variant} />

      {escalated ? (
        <p className="j-caption mt-2 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal" />
          Caso escalado para atendimento humano
        </p>
      ) : limited ? (
        <p className="j-caption mt-2 text-center">
          {remaining} de {info.total} escaladas gratuitas restantes
        </p>
      ) : null}
    </div>
  )
}
