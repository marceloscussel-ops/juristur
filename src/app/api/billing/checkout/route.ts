/**
 * POST /api/billing/checkout
 *
 * Cria a cobrança no Asaas conforme o plano e a forma de pagamento escolhidos
 * e devolve a URL da fatura hospedada (invoiceUrl) para o front redirecionar.
 * A ATIVAÇÃO do acesso acontece só no webhook (fonte de verdade) — aqui apenas
 * registramos os ids e o ciclo escolhido.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ensureCustomer,
  createMonthlySubscription,
  createAnnualCardPayment,
  createAnnualUpfrontPayment,
  serviceClient,
} from '@/lib/asaas'
import { hasActiveAccess } from '@/lib/plans'
import { isValidCpfCnpj } from '@/lib/document'
import type { BillingCycle, PaymentMethod } from '@/types'

export const maxDuration = 30

const CYCLES:  BillingCycle[]  = ['mensal', 'anual']
const METHODS: PaymentMethod[] = ['card', 'pix', 'boleto']

/** Documento válido = CPF ou CNPJ com dígitos verificadores corretos. */
function hasValidCnpj(cnpj?: string | null): boolean {
  return isValidCpfCnpj(cnpj)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

    const { cycle, method } = await request.json()
    if (!CYCLES.includes(cycle) || !METHODS.includes(method)) {
      return NextResponse.json({ error: 'Plano ou forma de pagamento inválidos.' }, { status: 400 })
    }

    const { data: agency, error } = await supabase
      .from('agencies')
      .select('id, name, cnpj, email, phone, asaas_customer_id, subscription_status, access_until')
      .eq('id', user.id)
      .single()

    if (error || !agency) {
      return NextResponse.json({ error: 'Agência não encontrada.' }, { status: 404 })
    }

    if (hasActiveAccess(agency)) {
      return NextResponse.json({ error: 'Sua assinatura já está ativa.' }, { status: 409 })
    }

    if (!hasValidCnpj(agency.cnpj)) {
      return NextResponse.json(
        { error: 'Complete o CNPJ da agência no perfil antes de assinar.', code: 'invalid_cnpj' },
        { status: 422 },
      )
    }

    const customerId = await ensureCustomer(agency)

    const result =
      cycle === 'mensal'
        ? await createMonthlySubscription(customerId, agency.id, method)
        : method === 'card'
          ? await createAnnualCardPayment(customerId, agency.id)
          : await createAnnualUpfrontPayment(customerId, agency.id, method)

    // Persiste ids + ciclo (status segue 'trial' até o webhook confirmar o pagamento).
    await serviceClient()
      .from('agencies')
      .update({
        plan: 'essencial',
        billing_cycle: cycle,
        asaas_subscription_id: result.subscriptionId ?? null,
        asaas_payment_id: result.paymentId ?? null,
      })
      .eq('id', agency.id)

    return NextResponse.json({ invoiceUrl: result.invoiceUrl })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao iniciar o pagamento.'
    console.error('[billing/checkout]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
