/**
 * POST /api/feedback — grava (ou atualiza) o 👍/👎 do usuário sobre um caso
 * ou documento da agência dele.
 *
 * Corpo: { targetType: 'case'|'document', targetId, rating: 1|-1,
 *          reasons?: string[], comment?: string }
 *
 * O voto é enviado no clique e, se a pessoa quiser, de novo com motivos e
 * comentário — por isso é upsert (um feedback por usuário e item).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getVinculo } from '@/lib/agencia-do-usuario'
import {
  feedbackDb, COMENTARIO_MAX, MOTIVOS_NEGATIVOS, MOTIVOS_POSITIVOS,
  type FeedbackTarget,
} from '@/lib/feedback'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 })
  }

  const targetType = body.targetType
  if (targetType !== 'case' && targetType !== 'document') {
    return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 })
  }
  const targetId = typeof body.targetId === 'string' ? body.targetId : ''
  if (!/^[0-9a-f-]{36}$/i.test(targetId)) {
    return NextResponse.json({ error: 'Item inválido.' }, { status: 400 })
  }
  const rating = body.rating
  if (rating !== 1 && rating !== -1) {
    return NextResponse.json({ error: 'Voto inválido.' }, { status: 400 })
  }

  // Só aceita motivos da lista do próprio voto: o painel agrupa por eles.
  const permitidos = (rating === 1 ? MOTIVOS_POSITIVOS : MOTIVOS_NEGATIVOS)[targetType as FeedbackTarget]
  const reasons = Array.isArray(body.reasons)
    ? Array.from(new Set(body.reasons.filter((r): r is string => typeof r === 'string' && permitidos.includes(r))))
    : []
  const comment = typeof body.comment === 'string'
    ? body.comment.trim().slice(0, COMENTARIO_MAX) || null
    : null

  const vinculo = await getVinculo(user.id)
  if (!vinculo.isAtivo || vinculo.erro) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  }
  const agencyId = vinculo.agencyId

  // O item precisa ser da agência. Consulta com a sessão do usuário (RLS)
  // e o filtro explícito de agência, como nas páginas do caso/documento.
  let analysisId: string | null = null
  if (targetType === 'case') {
    const { data } = await supabase
      .from('cases')
      .select('id, case_analyses(id, review_status, created_at)')
      .eq('id', targetId).eq('agency_id', agencyId)
      .maybeSingle()
    if (!data) return NextResponse.json({ error: 'Caso não encontrado.' }, { status: 404 })
    const aprovada = (data.case_analyses ?? []).find(
      (a: { review_status?: string }) => a.review_status === 'approved',
    ) as { id: string } | undefined
    analysisId = aprovada?.id ?? null
  } else {
    const { data } = await supabase
      .from('documents')
      .select('id')
      .eq('id', targetId).eq('agency_id', agencyId)
      .maybeSingle()
    if (!data) return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 })
  }

  const { error } = await feedbackDb()
    .from('feedback')
    .upsert({
      agency_id:   agencyId,
      user_id:     user.id,
      target_type: targetType,
      target_id:   targetId,
      analysis_id: analysisId,
      rating,
      reasons,
      comment,
      updated_at:  new Date().toISOString(),
    }, { onConflict: 'user_id,target_type,target_id' })

  if (error) {
    console.error('[feedback] erro ao gravar:', JSON.stringify(error))
    return NextResponse.json({ error: 'Não foi possível registrar.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
