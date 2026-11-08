'use client'

import { useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import EscalateButton from '@/components/EscalateButton'
import { defesaResumo } from '@/components/DefesaQuota'
import type { DefenseInfo } from '@/lib/plans'

/**
 * Botão "Solicitar defesa" solto (sem caso vinculado) da tela de defesa.
 *
 * O link abre o WhatsApp direto — evita bloqueio de popup — e o registro vai em
 * segundo plano para /api/defesas. Antes desta feature esse clique não deixava
 * rastro algum: a conversa ia para o WhatsApp e o advogado não tinha onde
 * marcar que a defesa foi utilizada.
 */
export default function DefesaSolicitar({ href, info }: { href: string; info: DefenseInfo }) {
  const [solicitada, setSolicitada] = useState(false)

  function registrar() {
    if (solicitada) return
    setSolicitada(true)
    fetch('/api/defesas', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ kind: 'defesa' }),
    }).catch(() => {})
  }

  return (
    <>
      <EscalateButton
        href={href}
        onClick={registrar}
        variant="primary"
        hint={info.plan === 'enterprise' ? 'Resposta humana em até 2h úteis' : undefined}
      />
      {solicitada ? (
        <p className="j-caption mt-2 flex items-center justify-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal" />
          Solicitação registrada — continue a conversa no WhatsApp
        </p>
      ) : (
        <p className="j-caption mt-2 text-center">{defesaResumo(info)}</p>
      )}
    </>
  )
}
