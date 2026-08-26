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

interface AsaasWebhook {
  event:         string
  payment?:      AsaasPayment
  subscription?: { id?: string; customer?: string; externalReference?: string }
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

/** Resolve a agência pelo externalReference, cliente ou assinatura Asaas. */
async function findAgencyId(
  supabase: ReturnType<typeof db>, ext?: string, customer?: string, subscription?: string,
): Promise<string | null> {
  if (ext) return ext
  if (customer) {
    const { data } = await supabase
      .from('agencies').select('id').eq('asaas_customer_id', customer).maybeSingle()
    if (data) return data.id
  }
  if (subscription) {
    const { data } = await supabase
      .from('agencies').select('id').eq('asaas_subscription_id', subscription).maybeSingle()
    if (data) return data.id
  }
  return null
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
  const p = body.payment
  const sub = body.subscription
  const dedupeId = p?.id ?? sub?.id ?? null
  const agencyId = await findAgencyId(
    supabase,
    p?.externalReference ?? sub?.externalReference,
    p?.customer ?? sub?.customer,
    p?.subscription ?? sub?.id,
  )

  // Idempotência: grava o evento; se já existe (dedupe index), sai sem reprocessar.
  const { error: insertErr } = await supabase.from('billing_events').insert({
    agency_id: agencyId,
    event: body.event,
    asaas_payment_id: dedupeId,
    asaas_subscription_id: p?.subscription ?? sub?.id ?? null,
    billing_type: p?.billingType ?? null,
    value: p?.value ?? null,
    status: p?.status ?? null,
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

  // Assinatura mensal quando há vínculo de subscription; senão é o plano anual (avulso).
  const isMonthly = Boolean(p?.subscription ?? sub?.id)

  if (GRANT.has(body.event)) {
    let accessUntil: Date
    if (isMonthly) {
      // até o próximo vencimento + folga de 5 dias
      const base = p?.dueDate ? new Date(p.dueDate) : new Date()
      accessUntil = new Date(base.getTime() + 35 * 86_400_000)
    } else {
      // anual: 12 meses a partir da confirmação
      accessUntil = new Date()
      accessUntil.setMonth(accessUntil.getMonth() + 12)
    }

    // Só estende para frente — nunca encurta um acesso já concedido.
    const { data: current } = await supabase
      .from('agencies').select('access_until').eq('id', agencyId).maybeSingle()
    const currentMs = current?.access_until ? new Date(current.access_until).getTime() : 0
    if (accessUntil.getTime() > currentMs) {
      await supabase
        .from('agencies')
        .update({ subscription_status: 'active', plan: 'essencial', access_until: accessUntil.toISOString() })
        .eq('id', agencyId)
    }
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
  } else if (body.event === 'PAYMENT_OVERDUE' && isMonthly) {
    // Mensal em atraso: corta o acesso (perde no máximo o ciclo corrente).
    // No anual (cartão autorizado / PIX à vista) um overdue não derruba o acesso.
    await supabase
      .from('agencies')
      .update({ subscription_status: 'expired', access_until: new Date().toISOString() })
      .eq('id', agencyId)
  }

  return NextResponse.json({ ok: true })
}
