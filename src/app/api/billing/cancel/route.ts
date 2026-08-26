/**
 * POST /api/billing/cancel
 *
 * Cancela a assinatura mensal no Asaas (para de renovar). O acesso é mantido até
 * o fim do ciclo já pago — `access_until` é preservado; o middleware corta sozinho
 * quando vence. Só se aplica ao plano mensal (o anual é cobrança avulsa e não renova).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteSubscription, serviceClient } from '@/lib/asaas'

export const maxDuration = 30

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

    const { data: agency, error } = await supabase
      .from('agencies')
      .select('id, asaas_subscription_id, billing_cycle, subscription_status')
      .eq('id', user.id)
      .single()

    if (error || !agency) {
      return NextResponse.json({ error: 'Agência não encontrada.' }, { status: 404 })
    }

    if (!agency.asaas_subscription_id) {
      return NextResponse.json(
        { error: 'Não há assinatura recorrente para cancelar.' },
        { status: 400 },
      )
    }

    await deleteSubscription(agency.asaas_subscription_id)

    // Marca como cancelada mas preserva access_until (acesso até o fim do ciclo pago).
    await serviceClient()
      .from('agencies')
      .update({ subscription_status: 'canceled' })
      .eq('id', agency.id)

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao cancelar a assinatura.'
    console.error('[billing/cancel]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
