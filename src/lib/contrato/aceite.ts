/**
 * aceite.ts — Registro do aceite do contrato (lado servidor).
 *
 * O aceite é gravado por `service role`: a tabela `contract_acceptances` só
 * permite LEITURA pelo dono via RLS, e nada de escrita pelo navegador. Isso é
 * de propósito — o valor do registro vem de ele ter sido escrito pelo servidor,
 * com IP e user-agent colhidos da requisição, e de nunca ser alterado depois.
 *
 * Quem chama: /api/auth/register (cadastro por e-mail), /bem-vindo (cadastro
 * por Google) e /api/billing/checkout (assinatura e renovação).
 */

import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { formatDateLong, formatDateTime } from '@/lib/datetime'
import { PLANS, TRIAL_DAYS, escalonamentosLabel } from '@/lib/plans'
import { PROMO_EVENTO_MESES } from '@/lib/promo'
import {
  CONTRATO_VERSAO, montarContrato,
  type AceiteEvento, type AnexoAgencia, type AnexoI, type AnexoPlano,
} from '@/lib/contrato/termos'
import type { BillingCycle, PaymentMethod } from '@/types'

function db() {
  return createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
}

/**
 * IP e user-agent da requisição — a prova de onde o aceite partiu.
 * Aceita a `Request` (rotas de API) ou os headers soltos (server components,
 * via `headers()` do next/headers).
 */
export function dadosDoCliente(
  origem: Request | Headers,
): { ip: string | null; userAgent: string | null } {
  const h = 'headers' in origem ? origem.headers : origem
  // Na Vercel o IP real vem no x-forwarded-for (o primeiro da lista).
  const forwarded = h.get('x-forwarded-for') ?? ''
  const ip = forwarded.split(',')[0].trim() || h.get('x-real-ip') || null
  return { ip, userAgent: h.get('user-agent')?.slice(0, 400) ?? null }
}

/** Endereço em uma linha, a partir das colunas da agência. */
export function enderecoDaAgencia(a: {
  endereco?: string | null; endereco_numero?: string | null
  bairro?: string | null; cidade?: string | null; cep?: string | null
}): string | null {
  const rua = [a.endereco, a.endereco_numero].filter(Boolean).join(', ')
  const cep = (a.cep ?? '').replace(/\D/g, '')
  const partes = [rua, a.bairro, a.cidade, cep ? `CEP ${cep.slice(0, 5)}-${cep.slice(5)}` : null]
    .filter(Boolean)
  return partes.length ? partes.join(' - ') : null
}

/** Anexo I do plano pago, montado a partir do que foi escolhido no checkout. */
export function planoPago(opts: {
  cycle:     BillingCycle
  method:    PaymentMethod
  promoEvento?: boolean
  planId?:   string
}): AnexoPlano {
  const plan = PLANS.find(p => p.id === (opts.planId ?? 'essencial')) ?? PLANS[0]
  const anual = opts.cycle === 'anual'
  const mensalidade = anual ? plan.anual : plan.mensal
  const total = plan.anual * 12

  const valor = anual
    ? `R$ ${mensalidade},00 por mês, cobrado anualmente (total de R$ ${total},00)`
    : `R$ ${mensalidade},00 por mês`

  const pagamento = anual && opts.method === 'card'
    ? `Cartão de crédito — 12x de R$ ${mensalidade},00`
    : anual
      ? `PIX — R$ ${total},00 à vista`
      : opts.method === 'card'
        ? 'Cartão de crédito — renovação automática mensal'
        : 'PIX — pagamento mensal'

  const observacao = anual && opts.promoEvento
    ? `Promoção de evento: ${PROMO_EVENTO_MESES} meses de acesso pelo valor de 12.`
    : anual
      ? 'Vigência de 12 meses, com renovação automática salvo cancelamento expresso.'
      : 'Vigência mínima de 3 meses, renovada a cada mensalidade paga.'

  return {
    nome:           plan.nome,
    escalonamentos: escalonamentosLabel(plan.id),
    modalidade:     anual ? 'Anual' : 'Mensal',
    valor,
    formaPagamento: pagamento,
    ativacao:       `${formatDateLong(new Date())} (sujeita à confirmação do pagamento)`,
    observacao,
  }
}

/** Anexo I do cadastro: ainda não há plano pago, só o período de avaliação. */
export function planoAvaliacao(trialEndsAt?: string | null): AnexoPlano {
  const fim = trialEndsAt
    ? new Date(trialEndsAt)
    : new Date(Date.now() + TRIAL_DAYS * 86_400_000)

  return {
    nome:           'Período de avaliação gratuito',
    modalidade:     `Avaliação gratuita de ${TRIAL_DAYS} dias`,
    valor:          'Sem cobrança durante o período de avaliação',
    formaPagamento: 'Não aplicável',
    ativacao:       formatDateLong(new Date()),
    escalonamentos: 'Conforme o plano contratado ao fim da avaliação',
    observacao:
      `Acesso gratuito até ${formatDateLong(fim)}. A contratação de plano pago, ` +
      'com o respectivo Anexo I, depende de novo aceite na plataforma.',
  }
}

export interface RegistrarAceiteInput {
  agencyId: string
  evento:   AceiteEvento
  agencia:  AnexoAgencia
  plano:    AnexoPlano
  /** Conta autenticada que praticou o aceite. */
  email?:   string | null
  ip?:      string | null
  userAgent?: string | null
}

/**
 * Grava o aceite. Devolve o id da linha, ou null se a gravação falhar.
 *
 * Falha de gravação **não** derruba o fluxo de quem chama: perder o registro do
 * aceite é ruim, mas barrar o cadastro ou o pagamento por causa dele é pior.
 * O erro vai para o log para ser reconciliado.
 */
export async function registrarAceite(input: RegistrarAceiteInput): Promise<string | null> {
  const anexo: AnexoI = {
    agencia: input.agencia,
    plano:   input.plano,
    aceite: {
      evento:    input.evento,
      dataHora:  formatDateTime(new Date()),
      email:     input.email ?? input.agencia.email ?? null,
      ip:        input.ip ?? null,
      userAgent: input.userAgent ?? null,
      versao:    CONTRATO_VERSAO,
    },
  }

  const { data, error } = await db()
    .from('contract_acceptances')
    .insert({
      agency_id:     input.agencyId,
      version:       CONTRATO_VERSAO,
      event:         input.evento,
      anexo,
      contract_text: montarContrato(anexo),
      ip:            input.ip ?? null,
      user_agent:    input.userAgent ?? null,
    })
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[aceite] falha ao gravar:', error.message)
    return null
  }
  return data?.id ?? null
}

/** A agência já tem algum aceite registrado? (qualquer versão/evento) */
export async function temAceite(agencyId: string): Promise<boolean> {
  const { count } = await db()
    .from('contract_acceptances')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
  return (count ?? 0) > 0
}

/**
 * Já houve aceite de contratação paga? Decide se o próximo aceite de checkout
 * é 'assinatura' (primeira vez) ou 'renovacao'.
 */
export async function jaAssinouAntes(agencyId: string): Promise<boolean> {
  const { count } = await db()
    .from('contract_acceptances')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)
    .in('event', ['assinatura', 'renovacao'])
  return (count ?? 0) > 0
}
