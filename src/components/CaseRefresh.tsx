'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'

const AUTO_REFRESH_MS = 60 * 1000 // 1 minuto

export default function CaseRefresh({ awaiting }: { awaiting: boolean }) {
  const router = useRouter()
  const [spinning, setSpinning] = useState(false)

  useEffect(() => {
    if (!awaiting) return
    const id = setInterval(() => router.refresh(), AUTO_REFRESH_MS)
    return () => clearInterval(id)
  }, [awaiting, router])

  function handleClick() {
    setSpinning(true)
    router.refresh()
    setTimeout(() => setSpinning(false), 1500)
  }

  return (
    <button
      onClick={handleClick}
      disabled={spinning}
      className="btn btn-outline btn-sm flex items-center gap-1.5 mt-4"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${spinning ? 'animate-spin' : ''}`} />
      {spinning ? 'Atualizando...' : 'Atualizar agora'}
      {awaiting && !spinning && (
        <span className="text-[10px] text-ink-40 font-normal">• auto 1 min</span>
      )}
    </button>
  )
}
