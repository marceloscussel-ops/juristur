import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTrialInfo, getEscalationInfo } from '@/lib/plans'

/**
 * Registra a escalada de um caso para atendimento humano, respeitando a cota
 * de escaladas gratuitas do período de teste. Idempotente por caso.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: caseRow } = await supabase
    .from('cases')
    .select('id, escalated_at')
    .eq('id', id)
    .eq('agency_id', user.id)
    .single()

  if (!caseRow) return NextResponse.json({ error: 'Caso não encontrado' }, { status: 404 })

  // Já escalado antes: não consome cota de novo
  if (caseRow.escalated_at) {
    return NextResponse.json({ ok: true, alreadyEscalated: true })
  }

  // Estado do período gratuito + escaladas já usadas em outros casos
  const { data: agency } = await supabase
    .from('agencies')
    .select('subscription_status, trial_ends_at, created_at')
    .eq('id', user.id)
    .single()

  const { count } = await supabase
    .from('cases')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', user.id)
    .not('escalated_at', 'is', null)

  const trial = getTrialInfo(agency ?? {})
  const info  = getEscalationInfo(trial, count ?? 0)

  if (!info.canEscalate) {
    const error = info.reason === 'trial_expired'
      ? 'Seu período gratuito terminou. Assine um plano para escalar casos.'
      : `Você usou suas ${info.total} escaladas gratuitas. Assine um plano para continuar.`
    return NextResponse.json({ error, reason: info.reason }, { status: 402 })
  }

  await supabase
    .from('cases')
    .update({ escalated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('agency_id', user.id)

  const remaining = Number.isFinite(info.remaining) ? Math.max(0, info.remaining - 1) : info.remaining
  return NextResponse.json({ ok: true, remaining })
}
