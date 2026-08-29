import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { analyzeCaseComplement } from '@/lib/claude'
import { notifyAgencyCaseReady, notifyLawyerNewCase } from '@/lib/notify'
import { CaseAnalysis, MAX_COMPLEMENT_LENGTH } from '@/types'
import { env } from '@/lib/env'

function getServiceClient() {
  return createServiceClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
}

// Reanálise da IA pode levar tempo — mesmo teto do fluxo de criação/revisão.
export const maxDuration = 300

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const complement: string = (body.complement ?? '').trim()

  if (!complement) {
    return NextResponse.json({ error: 'O complemento não pode ficar em branco.' }, { status: 400 })
  }
  if (complement.length > MAX_COMPLEMENT_LENGTH) {
    return NextResponse.json(
      { error: `O complemento é muito longo (máx. ${MAX_COMPLEMENT_LENGTH} caracteres).` },
      { status: 400 }
    )
  }

  // Caso + análises (só o dono acessa, via RLS)
  const { data: caseRow } = await supabase
    .from('cases')
    .select('description, category, complemented_at, case_analyses(*)')
    .eq('id', id)
    .eq('agency_id', user.id)
    .single()

  if (!caseRow) return NextResponse.json({ error: 'Caso não encontrado.' }, { status: 404 })

  // Trava: apenas um complemento por caso
  if (caseRow.complemented_at) {
    return NextResponse.json(
      { error: 'Este caso já recebeu um complemento. Para novas informações, abra um novo caso.' },
      { status: 409 }
    )
  }

  // Só é possível complementar depois que o advogado aprovou a análise
  const approved = ((caseRow.case_analyses ?? []) as CaseAnalysis[])
    .find(a => a.review_status === 'approved')

  if (!approved) {
    return NextResponse.json(
      { error: 'O complemento só fica disponível depois que a análise for aprovada.' },
      { status: 400 }
    )
  }

  // Reanálise da IA (relato original + complemento). Falha aqui NÃO grava o
  // complemento, para o usuário poder tentar de novo.
  let result
  try {
    result = await analyzeCaseComplement(
      caseRow.description,
      caseRow.category,
      approved.ai_response,
      complement,
    )
  } catch (err) {
    console.error('[complement POST] AI error:', err)
    return NextResponse.json(
      { error: 'Não foi possível reanalisar o caso agora. Tente novamente em instantes.' },
      { status: 502 }
    )
  }

  // Respeita a configuração do advogado: com auto_approve ligado, a reanálise
  // do complemento vai direto ao cliente; desligado, volta para o painel do
  // advogado aprovar (marcada como complemento de caso pré-aprovado).
  const db = getServiceClient()
  const { data: settings } = await db
    .from('lawyer_settings')
    .select('auto_approve, lawyer_phone')
    .single()

  const autoApprove  = settings?.auto_approve ?? true
  const reviewStatus = autoApprove ? 'approved' : 'pending'

  // Atualiza a análise (linha única por caso), marcando-a como oriunda de complemento
  await supabase
    .from('case_analyses')
    .update({
      ai_response:     result.text,
      tokens_used:     result.tokensUsed,
      severity:        result.severity ?? null,
      review_status:   reviewStatus,
      from_complement: true,
      lawyer_notes:    null,
      reviewed_at:     autoApprove ? new Date().toISOString() : null,
    })
    .eq('case_id', id)

  // Registra o complemento (preserva o relato original) e ajusta o status do caso
  await supabase
    .from('cases')
    .update({
      complement,
      complemented_at: new Date().toISOString(),
      status:          autoApprove ? 'concluido' : 'em_analise',
    })
    .eq('id', id)

  // Notificações: aprovado → avisa a agência; pendente → avisa o advogado
  // deixando claro que é um complemento de caso pré-aprovado.
  if (autoApprove) {
    await notifyAgencyCaseReady(id)
  } else if (settings?.lawyer_phone) {
    const { data: agencyData } = await supabase.from('agencies').select('name').eq('id', user.id).single()
    await notifyLawyerNewCase(
      settings.lawyer_phone,
      id,
      agencyData?.name ?? 'Agência',
      caseRow.category,
      result.text,
      true, // isComplement
    )
  }

  return NextResponse.json({ ok: true, reviewStatus }, { status: 201 })
}
