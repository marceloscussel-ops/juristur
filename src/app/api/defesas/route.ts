/**
 * POST /api/defesas
 *
 * Registra uma solicitação de defesa feita pela agência na tela "Solicitar
 * defesa" — inclusive a solicitação SOLTA, que não parte de um caso aberto e
 * até agora não deixava rastro nenhum (a conversa ia para o WhatsApp e ninguém
 * sabia dizer quantas defesas aquela agência havia pedido).
 *
 * Pedir não consome a defesa inclusa no plano: a linha nasce como
 * 'solicitada' e só o advogado, em /lawyer/defesas, marca que foi utilizada.
 *
 * No período gratuito a cota (TRIAL_ESCALATIONS) ainda barra o pedido — é a
 * régua do funil. Para assinante nunca barra: sem cota disponível, a defesa
 * fica registrada e o custo é acertado com o advogado, como prevê o contrato.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { loadDefenseInfo, registrarSolicitacaoDefesa } from '@/lib/defesas'
import type { DefenseKind } from '@/types'

const KINDS: DefenseKind[] = ['contrato', 'defesa', 'audiencia', 'peca', 'outro']

function serviceClient() {
  return createServiceClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const caseId  = typeof body.caseId === 'string' ? body.caseId : null
  const subject = typeof body.subject === 'string' ? body.subject.slice(0, 500) : null
  const kind: DefenseKind = KINDS.includes(body.kind) ? body.kind : 'defesa'

  const info = await loadDefenseInfo(supabase, user.id)

  if (!info.canRequest) {
    const error = info.state === 'expirada'
      ? 'Seu período gratuito terminou. Assine um plano para solicitar defesa.'
      : `Você usou suas ${info.total} solicitações de defesa gratuitas. Assine um plano para continuar.`
    return NextResponse.json({ error, state: info.state }, { status: 402 })
  }

  // O caso, quando informado, precisa ser da própria agência.
  let caseIdOk: string | null = null
  if (caseId) {
    const { data: caseRow } = await supabase
      .from('cases')
      .select('id')
      .eq('id', caseId)
      .eq('agency_id', user.id)
      .maybeSingle()
    caseIdOk = caseRow?.id ?? null
  }

  const db = serviceClient()
  const id = await registrarSolicitacaoDefesa(db, {
    agencyId:  user.id,
    caseId:    caseIdOk,
    origin:    'web',
    kind,
    subject,
    planAtUse: info.plan,
  })

  if (caseIdOk) {
    await db
      .from('cases')
      .update({ escalated_at: new Date().toISOString() })
      .eq('id', caseIdOk)
      .is('escalated_at', null)
  }

  return NextResponse.json({
    ok: true,
    id,
    // A UI usa isto para dizer, na hora, se a defesa é a inclusa no plano.
    coberta:   info.canUseIncluded,
    remaining: Math.max(0, info.remaining - (info.canUseIncluded ? 1 : 0)),
  })
}
