'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Loader2, Clock } from 'lucide-react'
import { hasActiveAccess } from '@/lib/plans'

/**
 * Retorno pós-pagamento (callback.successUrl do Asaas). A ativação real é feita
 * pelo webhook — aqui só damos feedback e fazemos poll leve até o acesso liberar.
 */
export default function SucessoPage() {
  const [active, setActive] = useState(false)
  const [done, setDone]     = useState(false) // parou de checar (ativou ou esgotou)

  useEffect(() => {
    let tries = 0
    let timer: ReturnType<typeof setTimeout>

    async function check() {
      tries++
      try {
        const r = await fetch('/api/profile', { cache: 'no-store' })
        const d = await r.json()
        if (d.agency && hasActiveAccess(d.agency)) {
          setActive(true)
          setDone(true)
          return
        }
      } catch { /* ignora e tenta de novo */ }

      if (tries >= 10) { setDone(true); return }  // ~30s de tentativas
      timer = setTimeout(check, 3000)
    }

    check()
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="animate-fade-in max-w-md mx-auto">
      <div className="j-card text-center py-10">
        {active ? (
          <>
            <CheckCircle2 className="w-12 h-12 text-teal mx-auto mb-3" />
            <h1 className="j-h2">Assinatura ativa!</h1>
            <p className="j-body text-ink-80 mt-2">
              Pagamento confirmado. Sua agência já tem acesso completo ao TurisGuard.
            </p>
            <Link href="/dashboard" className="btn btn-primary no-underline mt-6">
              Ir para o painel
            </Link>
          </>
        ) : done ? (
          <>
            <Clock className="w-12 h-12 text-indigo mx-auto mb-3" />
            <h1 className="j-h2">Pagamento em processamento</h1>
            <p className="j-body text-ink-80 mt-2">
              Recebemos seu pagamento e ele está sendo confirmado. Assim que cair, seu
              acesso é liberado automaticamente — pode levar alguns minutos (boleto pode
              levar mais). Você não precisa fazer nada.
            </p>
            <Link href="/dashboard" className="btn btn-outline no-underline mt-6">
              Voltar ao painel
            </Link>
          </>
        ) : (
          <>
            <Loader2 className="w-12 h-12 text-indigo mx-auto mb-3 animate-spin" />
            <h1 className="j-h2">Confirmando seu pagamento…</h1>
            <p className="j-body text-ink-80 mt-2">Só um instante.</p>
          </>
        )}
      </div>
    </div>
  )
}
