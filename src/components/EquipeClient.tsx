'use client'

/**
 * EquipeClient — gestão dos usuários da agência (tela do titular).
 *
 * Mesmo desenho de /perfil: a página é um cliente que conversa com a API, e
 * não um server component com formulários em action. Aqui isso importa mais do
 * que lá, porque convidar, suspender e remover acontecem em sequência na mesma
 * tela — recarregar a página inteira a cada clique perderia o contexto de quem
 * está no meio de organizar a equipe.
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Users, UserPlus, Mail, Phone, Loader2, AlertCircle, CheckCircle,
  Send, Pause, Play, Trash2, Crown, Sparkles,
} from 'lucide-react'
import { formatDate } from '@/lib/datetime'
import type { SeatInfo } from '@/lib/plans'
import { PLAN_LABELS } from '@/lib/plans'
import type { AgencyMember, StatusMembro } from '@/lib/agencia-do-usuario'
import type { AgencyPlan } from '@/types'

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 13)
  if (digits.length <= 2) return `+${digits}`
  if (digits.length <= 4) return `+${digits.slice(0, 2)} (${digits.slice(2)}`

  // O número é GRAVADO no formato Z-API: 55 + DDD + 8 dígitos, sem o nono.
  // Com 12 dígitos a quebra do assinante é 4+4 (9908-2111); a de 5+4 só vale
  // para quem está digitando o número com o nono dígito.
  const corte = digits.length <= 12 ? 8 : 9
  if (digits.length <= corte) return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4)}`
  return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, corte)}-${digits.slice(corte)}`
}

const STATUS_BADGE: Record<StatusMembro, { variant: string; label: string }> = {
  ativo:     { variant: 'success', label: 'Ativo'               },
  convidado: { variant: 'amber',   label: 'Convite enviado'     },
  suspenso:  { variant: 'muted',   label: 'Suspenso'            },
}

interface EquipeData {
  membros:   AgencyMember[]
  assentos:  SeatInfo
  plan:      AgencyPlan | null
  titularId: string
}

export default function EquipeClient() {
  const [data, setData]       = useState<EquipeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro]       = useState('')
  const [aviso, setAviso]     = useState('')

  // Qual linha está com operação em andamento (desabilita só os botões dela).
  const [ocupado, setOcupado] = useState<string | null>(null)
  // Remoção pede confirmação na própria linha — é irreversível.
  const [removendo, setRemovendo] = useState<string | null>(null)

  const [nome, setNome]         = useState('')
  const [email, setEmail]       = useState('')
  const [telefone, setTelefone] = useState('')
  const [convidando, setConvidando] = useState(false)

  const carregar = useCallback(async () => {
    const res = await fetch('/api/equipe', { cache: 'no-store' })
    const d   = await res.json().catch(() => ({}))
    if (!res.ok) { setErro(d.error || 'Não foi possível carregar a equipe.'); return }
    setData(d)
  }, [])

  useEffect(() => { carregar().finally(() => setLoading(false)) }, [carregar])

  /** Chamada de API + recarga da lista, com a mensagem de erro na tela. */
  async function acao(url: string, method: string, body: unknown, userId: string) {
    setErro('')
    setAviso('')
    setOcupado(userId)
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const d = await res.json().catch(() => ({}))
    setOcupado(null)
    setRemovendo(null)
    if (!res.ok) { setErro(d.error || 'Não foi possível concluir a ação.'); return false }
    await carregar()
    return true
  }

  async function convidar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setAviso('')
    setConvidando(true)
    const res = await fetch('/api/equipe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ nome, email, telefone }),
    })
    const d = await res.json().catch(() => ({}))
    setConvidando(false)
    if (!res.ok) { setErro(d.error || 'Não foi possível enviar o convite.'); return }
    setNome(''); setEmail(''); setTelefone('')
    setAviso('Convite enviado! A pessoa recebe um e-mail para criar a senha.')
    await carregar()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-indigo" />
      </div>
    )
  }

  const assentos = data?.assentos
  const membros  = data?.membros ?? []
  const planoTxt = data?.plan ? PLAN_LABELS[data.plan] : null

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <p className="j-overline">Configurações</p>
        <h1 className="j-h1 mt-0.5">Usuários da agência</h1>
        <p className="j-caption mt-1">
          Cada pessoa entra com o próprio e-mail e senha, e vê todo o histórico da agência
        </p>
      </div>

      {erro && (
        <div className="j-alert j-alert-danger mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" /> {erro}
        </div>
      )}
      {aviso && (
        <div className="j-alert j-alert-success mb-4">
          <CheckCircle className="w-4 h-4 shrink-0" /> {aviso}
        </div>
      )}

      {/* Assentos do plano */}
      {assentos && (
        <div className="j-card mb-4">
          <p className="j-label mb-4">Assentos do plano</p>
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4 text-indigo flex-shrink-0" />
            <div>
              <p className="j-body font-medium">
                {assentos.used} de {assentos.total} {assentos.total === 1 ? 'usuário' : 'usuários'}
              </p>
              <p className="j-caption mt-0.5">
                {planoTxt && assentos.reason !== 'trial_expired'
                  ? `Plano ${planoTxt}`
                  : 'Período gratuito'}
                {assentos.remaining > 0
                  ? ` · ${assentos.remaining} ${assentos.remaining === 1 ? 'assento livre' : 'assentos livres'}`
                  : ' · sem assento livre'}
              </p>
            </div>
          </div>

          {/* Sem assento: o caminho é trocar de plano, não suspender às cegas */}
          {!assentos.canInvite && (
            <div className="mt-4 pt-4 border-t border-[rgba(13,13,26,0.07)]">
              <p className="j-caption mb-3">
                {assentos.reason === 'trial_expired'
                  ? 'Seu período gratuito terminou. Assine um plano para incluir usuários.'
                  : 'Todos os assentos do seu plano estão ocupados. Troque de plano para incluir mais pessoas, ou suspenda alguém da lista para abrir um assento.'}
              </p>
              <Link href="/assinar" className="btn btn-primary no-underline">
                <Sparkles className="w-4 h-4" /> Ver planos
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Lista da equipe */}
      <div className="j-card mb-4">
        <p className="j-label mb-4">Equipe</p>
        <div className="space-y-3">
          {membros.map(m => {
            const badge     = STATUS_BADGE[m.status] ?? STATUS_BADGE.ativo
            const isTitular = m.papel === 'titular'
            const travado   = ocupado === m.user_id

            return (
              <div
                key={m.user_id}
                className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[rgba(13,13,26,0.07)] last:border-b-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="j-body font-medium flex items-center gap-1.5">
                    {isTitular && <Crown className="w-3.5 h-3.5 text-amber shrink-0" aria-hidden="true" />}
                    {m.nome || m.email || 'Usuário'}
                  </p>
                  <p className="j-caption mt-0.5 break-all">{m.email}</p>
                  {m.telefone && <p className="j-caption">{formatPhone(m.telefone)}</p>}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`badge badge-${badge.variant}`}>
                      <span className="badge-dot" aria-hidden="true" />
                      {badge.label}
                    </span>
                    <span className="j-caption">
                      {isTitular ? 'Titular da conta' : 'Membro'}
                      {m.status === 'convidado' && m.convidado_em
                        ? ` · convidado em ${formatDate(m.convidado_em)}`
                        : ''}
                    </span>
                  </div>
                </div>

                {/* O titular não aparece com ações: é quem assina a conta */}
                {!isTitular && (
                  <div className="flex items-center gap-1.5">
                    {travado && <Loader2 className="w-4 h-4 animate-spin text-indigo" />}

                    {m.status === 'convidado' && (
                      <button
                        type="button" disabled={travado}
                        onClick={() => acao('/api/equipe/reenviar', 'POST', { userId: m.user_id }, m.user_id)}
                        className="btn btn-outline btn-sm"
                      >
                        <Send className="w-3.5 h-3.5" /> Reenviar
                      </button>
                    )}

                    {m.status === 'ativo' && (
                      <button
                        type="button" disabled={travado}
                        onClick={() => acao('/api/equipe/membro', 'PATCH', { userId: m.user_id, status: 'suspenso' }, m.user_id)}
                        className="btn btn-outline btn-sm"
                        title="Tira o acesso e libera o assento"
                      >
                        <Pause className="w-3.5 h-3.5" /> Suspender
                      </button>
                    )}

                    {m.status === 'suspenso' && (
                      <button
                        type="button" disabled={travado}
                        onClick={() => acao('/api/equipe/membro', 'PATCH', { userId: m.user_id, status: 'ativo' }, m.user_id)}
                        className="btn btn-outline btn-sm"
                      >
                        <Play className="w-3.5 h-3.5" /> Reativar
                      </button>
                    )}

                    {removendo === m.user_id ? (
                      <>
                        <button
                          type="button" disabled={travado}
                          onClick={() => acao('/api/equipe/membro', 'DELETE', { userId: m.user_id }, m.user_id)}
                          className="btn btn-danger btn-sm"
                        >
                          Confirmar
                        </button>
                        <button
                          type="button" disabled={travado}
                          onClick={() => setRemovendo(null)}
                          className="btn btn-ghost btn-sm"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button" disabled={travado}
                        onClick={() => { setErro(''); setAviso(''); setRemovendo(m.user_id) }}
                        className="btn btn-ghost btn-sm"
                        title="Remove o acesso desta pessoa"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {removendo && (
          <p className="j-caption mt-3">
            Remover apaga o acesso da pessoa. Os casos e documentos que ela
            registrou continuam no histórico da agência.
          </p>
        )}
      </div>

      {/* Convite */}
      <div className="j-card">
        <p className="j-label mb-4">Adicionar usuário</p>
        <form onSubmit={convidar} className="space-y-4">
          <div>
            <label className="j-label" htmlFor="eq-nome">Nome</label>
            <input
              id="eq-nome" type="text" required
              value={nome} onChange={e => setNome(e.target.value)}
              className="j-input" placeholder="Nome de quem vai usar"
              disabled={!assentos?.canInvite}
            />
          </div>

          <div>
            <label className="j-label" htmlFor="eq-email">
              <Mail className="w-3.5 h-3.5 inline mr-1" /> E-mail
            </label>
            <input
              id="eq-email" type="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              className="j-input" placeholder="pessoa@suaagencia.com.br"
              disabled={!assentos?.canInvite}
            />
            <p className="j-hint">O convite para criar a senha vai para este e-mail</p>
          </div>

          <div>
            <label className="j-label" htmlFor="eq-telefone">
              <Phone className="w-3.5 h-3.5 inline mr-1" /> WhatsApp (opcional)
            </label>
            <input
              id="eq-telefone" type="tel"
              value={telefone} onChange={e => setTelefone(formatPhone(e.target.value))}
              className="j-input" placeholder="+55 (51) 99999-9999"
              disabled={!assentos?.canInvite}
            />
            <p className="j-hint">
              Com o número, essa pessoa também pode abrir casos pelo WhatsApp
            </p>
          </div>

          <button
            type="submit"
            disabled={convidando || !assentos?.canInvite}
            className="btn btn-primary"
          >
            {convidando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando convite…</>
              : <><UserPlus className="w-4 h-4" /> Enviar convite</>}
          </button>
        </form>
      </div>
    </div>
  )
}
