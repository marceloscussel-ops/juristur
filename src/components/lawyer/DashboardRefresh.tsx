'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

const AUTO_REFRESH_MS = 5 * 60 * 1000 // 5 minutos

export default function DashboardRefresh({ autoApprove }: { autoApprove: boolean }) {
  const router = useRouter()
  const [spinning, setSpinning] = useState(false)

  useEffect(() => {
    if (autoApprove) return
    const id = setInterval(() => router.refresh(), AUTO_REFRESH_MS)
    return () => clearInterval(id)
  }, [autoApprove, router])

  function handleClick() {
    setSpinning(true)
    router.refresh()
    setTimeout(() => setSpinning(false), 1200)
  }

  return (
    <button
      onClick={handleClick}
      disabled={spinning}
      className="btn btn-outline btn-sm flex items-center gap-1.5 flex-shrink-0"
      title={autoApprove ? 'Atualizar lista' : 'Atualizar lista (auto a cada 5 min)'}
    >
      <RefreshCw className={`w-3.5 h-3.5 ${spinning ? 'animate-spin' : ''}`} />
      Atualizar
      {!autoApprove && (
        <span className="text-[10px] text-ink-40 font-normal">• 5 min</span>
      )}
    </button>
  )
}
