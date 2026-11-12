'use client'

import { useEffect, useState } from 'react'

/**
 * Botão de "tentar de novo" da tela /offline.
 *
 * O botão fica sempre ativo de propósito: `navigator.onLine` só sabe se o
 * aparelho tem alguma rede, não se o TurisGuard está alcançável — num wi-fi de
 * hotel que exige login, ou com o servidor fora do ar, ele diz "online" e
 * mentiria para a pessoa. Por isso o aviso embaixo só aparece no caso em que
 * ele tem certeza: quando não há rede nenhuma.
 */
export default function OfflineRetry() {
  const [semRede, setSemRede] = useState(false)

  useEffect(() => {
    const sync = () => setSemRede(!navigator.onLine)
    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="btn btn-primary w-full"
      >
        Tentar de novo
      </button>
      {semRede && (
        <p className="j-caption">O aparelho está sem rede.</p>
      )}
    </div>
  )
}
