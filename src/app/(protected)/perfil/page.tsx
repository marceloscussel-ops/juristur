'use client'

import { useState, useEffect } from 'react'
import { Building2, Mail, Phone, Shield, Save, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 13)
  if (digits.length <= 2)  return `+${digits}`
  if (digits.length <= 4)  return `+${digits.slice(0,2)} (${digits.slice(2)}`
  if (digits.length <= 9)  return `+${digits.slice(0,2)} (${digits.slice(2,4)}) ${digits.slice(4)}`
  return `+${digits.slice(0,2)} (${digits.slice(2,4)}) ${digits.slice(4,9)}-${digits.slice(9)}`
}

interface AgencyData {
  name:       string
  cnpj:       string
  email:      string
  phone:      string | null
  plan:       string
  created_at: string
}

export default function PerfilPage() {
  const [agency, setAgency]   = useState<AgencyData | null>(null)
  const [name,   setName]     = useState('')
  const [phone,  setPhone]    = useState('')
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(d => {
        setAgency(d.agency)
        setName(d.agency.name)
        setPhone(d.agency.phone ? formatPhone(d.agency.phone) : '')
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setSaving(true)

    const res  = await fetch('/api/profile', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, phone }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Erro ao salvar.')
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
    setSaving(false)
  }

  const planLabels: Record<string, string> = {
    free:  'Gratuito',
    basic: 'Básico',
    pro:   'Profissional',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-teal" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <p className="j-overline">Configurações</p>
        <h1 className="j-h1 mt-0.5">Perfil da agência</h1>
        <p className="j-caption mt-1">Gerencie os dados da sua conta</p>
      </div>

      {/* Informações fixas */}
      <div className="j-card mb-4">
        <p className="j-label mb-4">Informações da conta</p>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-slate-light flex-shrink-0" />
            <div>
              <p className="j-caption">E-mail</p>
              <p className="j-body font-medium">{agency?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Building2 className="w-4 h-4 text-slate-light flex-shrink-0" />
            <div>
              <p className="j-caption">CNPJ</p>
              <p className="j-body font-medium j-mono">
                {agency?.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="w-4 h-4 text-slate-light flex-shrink-0" />
            <div>
              <p className="j-caption">Plano atual</p>
              <p className="j-body font-medium capitalize">
                {planLabels[agency?.plan ?? 'free'] ?? agency?.plan}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Building2 className="w-4 h-4 text-slate-light flex-shrink-0" />
            <div>
              <p className="j-caption">Membro desde</p>
              <p className="j-body font-medium">
                {agency?.created_at
                  ? new Date(agency.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário editável */}
      <div className="j-card">
        <p className="j-label mb-4">Editar informações</p>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="j-label" htmlFor="name">Nome da agência</label>
            <input
              id="name" type="text" required
              value={name} onChange={e => setName(e.target.value)}
              className="j-input"
              placeholder="Nome da agência"
            />
          </div>

          <div>
            <label className="j-label" htmlFor="phone">
              <Phone className="w-3.5 h-3.5 inline mr-1" />
              WhatsApp
            </label>
            <input
              id="phone" type="tel"
              value={phone}
              onChange={e => setPhone(formatPhone(e.target.value))}
              className="j-input"
              placeholder="+55 (51) 99999-9999"
            />
            <p className="j-hint">Mesmo número cadastrado no WhatsApp, com DDI e DDD</p>
          </div>

          {error   && (
            <div className="j-alert j-alert-danger">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="j-alert j-alert-success">
              <CheckCircle className="w-4 h-4 shrink-0" /> Dados salvos com sucesso!
            </div>
          )}

          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
              : <><Save className="w-4 h-4" /> Salvar alterações</>}
          </button>
        </form>
      </div>
    </div>
  )
}
