'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Building2, Mail, Phone, Shield, Save, CheckCircle, AlertCircle, Loader2, Sparkles, XCircle } from 'lucide-react'
import { getTrialInfo, PLAN_LABELS } from '@/lib/plans'
import type { AgencyPlan } from '@/types'

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 13)
  if (digits.length <= 2)  return `+${digits}`
  if (digits.length <= 4)  return `+${digits.slice(0,2)} (${digits.slice(2)}`
  if (digits.length <= 9)  return `+${digits.slice(0,2)} (${digits.slice(2,4)}) ${digits.slice(4)}`
  return `+${digits.slice(0,2)} (${digits.slice(2,4)}) ${digits.slice(4,9)}-${digits.slice(9)}`
}

interface AgencyData {
  name:                string
  cnpj:                string
  email:               string
  phone:               string | null
  plan:                string
  subscription_status: string
  trial_ends_at:       string | null
  created_at:          string
  billing_cycle?:      string | null
  access_until?:       string | null
}

function SubscriptionCard({ agency, onChange }: { agency: AgencyData; onChange: () => void }) {
  const trial = getTrialInfo(agency)
  const [confirming, setConfirming] = useState(false)
  const [canceling, setCanceling]   = useState(false)
  const [cancelErr, setCancelErr]   = useState('')

  async function handleCancel() {
    setCancelErr('')
    setCanceling(true)
    const res  = await fetch('/api/billing/cancel', { method: 'POST' })
    const data = await res.json().catch(() => ({}))
    setCanceling(false)
    if (!res.ok) {
      setCancelErr(data.error || 'Não foi possível cancelar.')
      return
    }
    setConfirming(false)
    onChange()
  }

  if (trial.isActive) {
    const cicloTxt  = agency.billing_cycle === 'anual' ? 'anual' : agency.billing_cycle === 'mensal' ? 'mensal' : null
    const canceled  = agency.subscription_status === 'canceled'
    const isMonthly = agency.billing_cycle === 'mensal'
    const ateTxt = agency.access_until
      ? new Date(agency.access_until).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      : null

    return (
      <div className="j-card mb-4">
        <p className="j-label mb-4">Assinatura</p>
        <div className="flex items-center gap-3">
          <Shield className={`w-4 h-4 flex-shrink-0 ${canceled ? 'text-amber' : 'text-teal'}`} />
          <div>
            <p className="j-caption">Plano atual</p>
            <p className="j-body font-medium">
              {PLAN_LABELS[agency.plan as AgencyPlan] ?? agency.plan}
              {canceled ? ' · cancelada' : ' · ativo'}
              {cicloTxt ? ` · ${cicloTxt}` : ''}
            </p>
            {canceled && ateTxt && (
              <p className="j-caption mt-0.5">Cancelada — acesso disponível até {ateTxt}.</p>
            )}
            {!canceled && ateTxt && (
              <p className="j-caption mt-0.5">
                {isMonthly ? `Renova automaticamente em ${ateTxt}` : `Acesso garantido até ${ateTxt}`}
              </p>
            )}
            {!canceled && !isMonthly && agency.billing_cycle === 'anual' && (
              <p className="j-caption mt-0.5">O plano anual não renova automaticamente.</p>
            )}
          </div>
        </div>

        {/* Cancelamento — só faz sentido para assinatura mensal ativa */}
        {!canceled && isMonthly && (
          <div className="mt-4 pt-4 border-t border-[rgba(13,13,26,0.07)]">
            {confirming ? (
              <div>
                <p className="j-caption mb-3">
                  Ao cancelar, a renovação para de acontecer, mas você continua com acesso
                  até {ateTxt ?? 'o fim do período pago'}. Deseja cancelar?
                </p>
                {cancelErr && (
                  <div className="j-alert j-alert-danger mb-3">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {cancelErr}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button" onClick={handleCancel} disabled={canceling}
                    className="btn btn-danger"
                  >
                    {canceling
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Cancelando…</>
                      : <><XCircle className="w-4 h-4" /> Confirmar cancelamento</>}
                  </button>
                  <button
                    type="button" onClick={() => setConfirming(false)} disabled={canceling}
                    className="btn btn-outline"
                  >
                    Manter assinatura
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="text-[13px] text-ink-40 hover:text-coral underline"
              >
                Cancelar assinatura
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  const endsAtTxt = trial.endsAt
    ? trial.endsAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—'
  const diasTxt = trial.daysLeft === 1 ? '1 dia' : `${trial.daysLeft} dias`

  return (
    <div className={`j-card mb-4 ${trial.isExpired ? 'ring-1 ring-coral-200' : ''}`}>
      <p className="j-label mb-4">Assinatura</p>
      <div className="flex items-start gap-3 mb-4">
        <Sparkles className={`w-4 h-4 flex-shrink-0 mt-0.5 ${trial.isExpired ? 'text-coral' : 'text-indigo'}`} />
        <div>
          <p className="j-caption">Plano atual</p>
          {trial.isExpired ? (
            <p className="j-body font-medium text-coral">Período gratuito encerrado</p>
          ) : (
            <>
              <p className="j-body font-medium">Período gratuito · restam {diasTxt}</p>
              <p className="j-caption mt-0.5">Acesso gratuito até {endsAtTxt}</p>
            </>
          )}
        </div>
      </div>
      <Link href="/assinar" className="btn btn-primary no-underline">
        <Sparkles className="w-4 h-4" />
        {trial.isExpired ? 'Assinar agora' : 'Ver planos'}
      </Link>
    </div>
  )
}

export default function PerfilPage() {
  const [agency, setAgency]   = useState<AgencyData | null>(null)
  const [name,   setName]     = useState('')
  const [phone,  setPhone]    = useState('')
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState('')

  const loadAgency = useCallback(async () => {
    const d = await fetch('/api/profile', { cache: 'no-store' }).then(r => r.json())
    setAgency(d.agency)
    setName(d.agency.name)
    setPhone(d.agency.phone ? formatPhone(d.agency.phone) : '')
  }, [])

  useEffect(() => {
    loadAgency().finally(() => setLoading(false))
  }, [loadAgency])

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
        <h1 className="j-h1 mt-0.5">Perfil da agência</h1>
        <p className="j-caption mt-1">Gerencie os dados da sua conta</p>
      </div>

      {/* Informações fixas */}
      <div className="j-card mb-4">
        <p className="j-label mb-4">Informações da conta</p>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-ink-40 flex-shrink-0" />
            <div>
              <p className="j-caption">E-mail</p>
              <p className="j-body font-medium">{agency?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Building2 className="w-4 h-4 text-ink-40 flex-shrink-0" />
            <div>
              <p className="j-caption">CNPJ</p>
              <p className="j-body font-medium j-mono">
                {agency?.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Building2 className="w-4 h-4 text-ink-40 flex-shrink-0" />
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

      {/* Assinatura / período gratuito */}
      {agency && <SubscriptionCard agency={agency} onChange={loadAgency} />}

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
