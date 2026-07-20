'use client'

import { useState, useEffect } from 'react'
import { Shield, Phone, Save, CheckCircle, AlertCircle, Loader2, Zap } from 'lucide-react'

interface Settings {
  auto_approve: boolean
  lawyer_phone: string | null
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 13)
  if (digits.length <= 2)  return `+${digits}`
  if (digits.length <= 4)  return `+${digits.slice(0,2)} (${digits.slice(2)}`
  if (digits.length <= 9)  return `+${digits.slice(0,2)} (${digits.slice(2,4)}) ${digits.slice(4)}`
  return `+${digits.slice(0,2)} (${digits.slice(2,4)}) ${digits.slice(4,9)}-${digits.slice(9)}`
}

export default function LawyerConfigPage() {
  const [, setSettings]   = useState<Settings | null>(null)
  const [phone, setPhone]         = useState('')
  const [autoApprove, setAutoApprove] = useState(false)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [success, setSuccess]     = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    fetch('/api/lawyer/settings')
      .then(r => r.json())
      .then(d => {
        setSettings(d.settings)
        setAutoApprove(d.settings.auto_approve)
        setPhone(d.settings.lawyer_phone ? formatPhone(d.settings.lawyer_phone) : '')
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setSaving(true)

    const phoneDigits = phone.replace(/\D/g, '')
    const res = await fetch('/api/lawyer/settings', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ auto_approve: autoApprove, lawyer_phone: phoneDigits || null }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Erro ao salvar.') }
    else         { setSuccess(true); setTimeout(() => setSuccess(false), 3000) }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-indigo" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <p className="j-overline">Configurações</p>
        <h1 className="j-h1 mt-0.5">Painel do advogado</h1>
        <p className="j-caption mt-1">Controle o fluxo de revisão das análises</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Auto-approve toggle */}
        <div className="j-card">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-indigo/10 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-indigo" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="j-label">Aprovação automática</p>
                  <p className="j-caption mt-0.5">
                    Quando ativo, as análises são entregues diretamente às agências sem passar por revisão.
                    Quando inativo, você recebe uma notificação no WhatsApp para aprovar cada análise.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoApprove(v => !v)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo ${autoApprove ? 'bg-indigo' : 'bg-ink-40'}`}
                  role="switch"
                  aria-checked={autoApprove}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${autoApprove ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              {autoApprove ? (
                <div className="mt-3 j-alert j-alert-warning">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  As análises serão entregues sem revisão prévia.
                </div>
              ) : (
                <div className="mt-3 j-alert j-alert-info">
                  <Shield className="w-4 h-4 shrink-0" />
                  Você receberá um WhatsApp para cada nova análise gerada.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lawyer phone */}
        <div className="j-card">
          <p className="j-label mb-4">Notificações</p>
          <div>
            <label className="j-label" htmlFor="phone">
              <Phone className="w-3.5 h-3.5 inline mr-1" />
              Seu WhatsApp (para receber análises pendentes)
            </label>
            <input
              id="phone" type="tel"
              value={phone}
              onChange={e => setPhone(formatPhone(e.target.value))}
              className="j-input"
              placeholder="+55 (51) 99999-9999"
            />
            <p className="j-hint">Com DDI e DDD. Usado quando aprovação automática está desativada.</p>
          </div>
        </div>

        {error   && <div className="j-alert j-alert-danger"><AlertCircle className="w-4 h-4 shrink-0" /> {error}</div>}
        {success && <div className="j-alert j-alert-success"><CheckCircle className="w-4 h-4 shrink-0" /> Configurações salvas!</div>}

        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4" /> Salvar configurações</>}
        </button>
      </form>
    </div>
  )
}
