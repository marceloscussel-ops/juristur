/**
 * POST /api/billing/webhook
 *
 * Recebe eventos do Asaas e é a FONTE DE VERDADE da ativação/corte de acesso.
 * Segurança: header `asaas-access-token` deve bater com ASAAS_WEBHOOK_TOKEN.
 * Idempotência: cada (evento + cobrança) é gravado uma única vez em billing_events.
 * Sempre responde 200 rápido (o Asaas reenvia enquanto não receber 2xx).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { mesesPlanoAnual } from '@/lib/promo'
import { getCheckout } from '@/lib/asaas'

export const maxDuration = 60

interface AsaasPayment {
  id?:                string
  customer?:          string
  subscription?:      string
  value?:             number
  billingType?:       string
  status?:            string
  dueDate?:           string
  externalReference?: string
}

interface AsaasCheckout {
  id?:                string
  customer?:          string
  subscription?:      string
  installment?:       string
  status?:            string
  externalReference?: string
}

interface AsaasWebhook {
  event:         string
  payment?:      AsaasPayment
  subscription?: { id?: string; customer?: string; externalReference?: string }
  checkout?:     AsaasCheckout
}

function db() {
  return createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
}

// Eventos que liberam/estendem o acesso pago.
const GRANT = new Set(['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'])
// Eventos que cortam o acesso na hora (estorno/chargeback).
const REVOKE = new Set([
  'PAYMENT_REFUNDED',
  'PAYMENT_CHARGEBACK_REQUESTED',
  'PAYMENT_CHARGEBACK_DISPUTE',
])

/** Resolve a agência por externalReference, checkout, cliente ou assinatura. */
async function findAgencyId(
  supabase: ReturnType<typeof db>,
  keys: { ext?: string; checkoutId?: string; customer?: string; subscription?: string },
): Promise<string | null> {
  if (keys.ext) return keys.ext
  const byCol = async (col: string, val?: string) => {
    if (!val) return null
    const { data } = await supabase.from('agencies').select('id').eq(col, val).maybeSingle()
    return data?.id ?? null
  }
  return (
    (await byCol('asaas_checkout_id', keys.checkoutId)) ??
    (await byCol('asaas_customer_id', keys.customer)) ??
    (await byCol('asaas_subscription_id', keys.subscription))
  )
}

export async function POST(request: NextRequest) {
  // Autenticação do webhook
  const token = env('ASAAS_WEBHOOK_TOKEN')
  if (token && request.headers.get('asaas-access-token') !== token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: AsaasWebhook
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: true }) // corpo inválido: nada a fazer
  }

  const supabase = db()
  const p  = body.payment
  const sub = body.subscription
  const co = body.checkout
  const dedupeId = p?.id ?? co?.id ?? sub?.id ?? null

  const agencyId = await findAgencyId(supabase, {
    ext:          p?.externalReference ?? co?.externalReference ?? sub?.externalReference,
    checkoutId:   co?.id,
    customer:     p?.customer ?? co?.customer ?? sub?.customer,
    subscription: p?.subscription ?? co?.subscription ?? sub?.id,
  })

  // Idempotência: grava o evento; se já existe (dedupe index), sai sem reprocessar.
  const { error: insertErr } = await supabase.from('billing_events').insert({
    agency_id: agencyId,
    event: body.event,
    asaas_payment_id: dedupeId,
    asaas_subscription_id: p?.subscription ?? co?.subscription ?? sub?.id ?? null,
    billing_type: p?.billingType ?? null,
    value: p?.value ?? null,
    status: p?.status ?? co?.status ?? null,
    raw: body,
  })
  if (insertErr) {
    // 23505 = unique_violation → evento repetido. Qualquer outro erro: loga e segue 200.
    if (insertErr.code !== '23505') console.error('[billing/webhook] insert', insertErr.message)
    return NextResponse.json({ ok: true })
  }

  if (!agencyId) {
    console.warn('[billing/webhook] agência não encontrada para', body.event)
    return NextResponse.json({ ok: true })
  }

  // Estado atual da agência (uma leitura só).
  const { data: current } = await supabase
    .from('agencies')
    .select('access_until, origem_campanha, created_at, billing_cycle')
    .eq('id', agencyId)
    .maybeSingle()

  // Concede/estende o acesso; só estende para frente (nunca encurta).
  const grant = async (isMonthly: boolean, dueDate?: string) => {
    let accessUntil: Date
    if (isMonthly) {
      const base = dueDate ? new Date(dueDate) : new Date()
      accessUntil = new Date(base.getTime() + 35 * 86_400_000) // vencimento + folga
    } else {
      // Anual: 12 meses da confirmação — ou 14 para cadastro pelo link do evento
      // dentro do prazo (promoção UNAV 2026).
      accessUntil = new Date()
      accessUntil.setMonth(accessUntil.getMonth() + mesesPlanoAnual(current))
    }
    const currentMs = current?.access_until ? new Date(current.access_until).getTime() : 0
    if (accessUntil.getTime() > currentMs) {
      await supabase
        .from('agencies')
        .update({ subscription_status: 'active', plan: 'essencial', access_until: accessUntil.toISOString() })
        .eq('id', agencyId)
    }
  }

  if (body.event === 'CHECKOUT_PAID') {
    // Pagamento concluído na sessão de checkout — ativação primária. Guarda os ids
    // gerados (assinatura/cliente) para renovações e cancelamento; concede pelo ciclo.
    let subId  = co?.subscription ?? null
    let custId = co?.customer ?? null
    if (co?.id) {
      try {
        const info = await getCheckout(co.id)
        subId  = info.subscription ?? subId
        custId = info.customer ?? custId
      } catch (e) {
        console.warn('[billing/webhook] getCheckout falhou:', e instanceof Error ? e.message : e)
      }
    }
    const patch: Record<string, unknown> = {}
    if (subId)  patch.asaas_subscription_id = subId
    if (custId) patch.asaas_customer_id = custId
    if (Object.keys(patch).length) await supabase.from('agencies').update(patch).eq('id', agencyId)

    await grant(current?.billing_cycle === 'mensal')
  } else if (GRANT.has(body.event)) {
    // Cobranças confirmadas — inclui as renovações mensais. Se vier a assinatura,
    // guarda (garante que renovações futuras resolvam a agência).
    if (p?.subscription) {
      await supabase.from('agencies').update({ asaas_subscription_id: p.subscription }).eq('id', agencyId)
    }
    await grant(Boolean(p?.subscription), p?.dueDate)
  } else if (body.event === 'SUBSCRIPTION_DELETED') {
    // Cancelamento: para de renovar, mas mantém o acesso até o fim do ciclo pago
    // (access_until preservado). O gate corta sozinho quando access_until vence.
    await supabase
      .from('agencies')
      .update({ subscription_status: 'canceled' })
      .eq('id', agencyId)
  } else if (REVOKE.has(body.event)) {
    await supabase
      .from('agencies')
      .update({ subscription_status: 'expired', access_until: new Date().toISOString() })
      .eq('id', agencyId)
  } else if (body.event === 'PAYMENT_OVERDUE' && Boolean(p?.subscription)) {
    // Mensal em atraso: corta o acesso (perde no máximo o ciclo corrente).
    await supabase
      .from('agencies')
      .update({ subscription_status: 'expired', access_until: new Date().toISOString() })
      .eq('id', agencyId)
  }

  return NextResponse.json({ ok: true })
}
