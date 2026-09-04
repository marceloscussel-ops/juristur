'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { isValidBrazilianMobile } from '@/lib/phone'

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 13)
  if (digits.length <= 2)  return `+${digits}`
  if (digits.length <= 4)  return `+${digits.slice(0,2)} (${digits.slice(2)}`
  if (digits.length <= 9)  return `+${digits.slice(0,2)} (${digits.slice(2,4)}) ${digits.slice(4)}`
  return `+${digits.slice(0,2)} (${digits.slice(2,4)}) ${digits.slice(4,9)}-${digits.slice(9)}`
}

const NEXT = '/casos/novo?bemvindo=1'

export default function WhatsappStep({ agencyName }: { agencyName: string }) {
  const [phone, setPhone]     = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!isValidBrazilianMobile(phone)) {
      setError('WhatsApp inválido. Informe com DDI e DDD. Ex: +55 (51) 99999-9999')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/profile', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ name: agencyName, phone: phone.replace(/\D/g, '') }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Não foi possível salvar. Tente novamente.')
        setLoading(false)
        return
      }
      router.push(NEXT)
      router.refresh()
    } catch {
      setError('Erro de conexão. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="j-label" htmlFor="phone">WhatsApp</label>
        <input
          id="phone" name="phone" type="tel" required autoFocus
          value={phone}
          onChange={e => setPhone(formatPhone(e.target.value))}
          className="j-input"
          placeholder="+55 (51) 99999-9999"
        />
        <p className="j-hint">Com DDI e DDD. Usamos só para avisos sobre os seus casos.</p>
      </div>

      {error && <div className="j-alert j-alert-danger text-[13px]">{error}</div>}

      <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center">
        {loading
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
          : 'Continuar'}
      </button>

      <button
        type="button"
        onClick={() => router.push(NEXT)}
        className="btn btn-ghost w-full justify-center"
        disabled={loading}
      >
        Agora não
      </button>
    </form>
  )
}
