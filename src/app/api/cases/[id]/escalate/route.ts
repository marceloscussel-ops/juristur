import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { loadDefenseInfo, registrarSolicitacaoDefesa } from '@/lib/defesas'
import { getAgencyId } from '@/lib/agencia-do-usuario'

/**
 * Registra a solicitação de defesa de um caso (atendimento humano).
 * Idempotente por caso.
 *
 * Duas coisas são gravadas, de propósito:
 *   · `cases.escalated_at` — o caso foi escalado (é o que a UI do caso mostra);
 *   · uma linha em `defense_requests` — entra na fila do advogado, que depois
 *     marca se a defesa foi REALMENTE utilizada. Só essa marcação desconta da
 *     cota do plano; a solicitação em si não.
 *
 * No período gratuito a cota ainda barra o pedido. Assinante nunca é barrado:
 * sem cota, a defesa fica registrada e o custo é acertado com o advogado.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Qualquer usuário ativo da agência pode solicitar defesa; a cota consumida
  // é a da agência, não a da pessoa.
  const agencyId = await getAgencyId(user.id)

  const { data: caseRow } = await supabase
    .from('cases')
    .select('id, category, escalated_at')
    .eq('id', id)
    .eq('agency_id', agencyId)
    .single()

  if (!caseRow) return NextResponse.json({ error: 'Caso não encontrado' }, { status: 404 })

  // Já escalado antes: não consome cota de novo
  if (caseRow.escalated_at) {
    return NextResponse.json({ ok: true, alreadyEscalated: true })
  }

  const info = await loadDefenseInfo(supabase, agencyId)

  if (!info.canRequest) {
    const error = info.state === 'expirada'
      ? 'Seu período gratuito terminou. Assine um plano para solicitar defesa.'
      : `Você usou suas ${info.total} solicitações de defesa gratuitas. Assine um plano para continuar.`
    return NextResponse.json({ error, state: info.state }, { status: 402 })
  }

  await supabase
    .from('cases')
    .update({ escalated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('agency_id', agencyId)

  // A fila do advogado é escrita pelo service role: a policy de
  // `defense_requests` só permite LEITURA à agência, para o registro de
  // consumo da cota não poder ser forjado no navegador.
  await registrarSolicitacaoDefesa(
    createServiceClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY')),
    {
      agencyId:  agencyId,
      caseId:    id,
      origin:    'web',
      kind:      'defesa',
      subject:   caseRow.category ?? null,
      planAtUse: info.plan,
    },
  )

  const remaining = info.canUseIncluded ? Math.max(0, info.remaining - 1) : info.remaining
  return NextResponse.json({ ok: true, remaining, coberta: info.canUseIncluded })
}
