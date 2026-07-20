import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { analyzeCaseRevision } from '@/lib/claude'
import { sendText } from '@/lib/whatsapp/sender'

export const maxDuration = 300

function getServiceClient() {
  return createServiceClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
}

async function verifyLawyer() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = getServiceClient()
  const { data: lawyer } = await db.from('lawyers').select('id').eq('id', user.id).maybeSingle()
  if (!lawyer) return null
  return { user, db }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyLawyer()
  if (!auth) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

  const { id: caseId } = await params
  const { notes } = await req.json() as { notes: string }

  if (!notes?.trim()) {
    return NextResponse.json({ error: 'Comentários da revisão são obrigatórios.' }, { status: 400 })
  }

  // Busca o caso e a análise atual
  const { data: caseData } = await auth.db
    .from('cases')
    .select('description, category')
    .eq('id', caseId)
    .single()

  const { data: analysis } = await auth.db
    .from('case_analyses')
    .select('ai_response')
    .eq('case_id', caseId)
    .single()

  if (!caseData || !analysis) {
    return NextResponse.json({ error: 'Caso ou análise não encontrados.' }, { status: 404 })
  }

  // Marca como revisão solicitada
  await auth.db
    .from('case_analyses')
    .update({ review_status: 'revision_requested', lawyer_notes: notes })
    .eq('case_id', caseId)

  // Re-analisa com os comentários do advogado
  const result = await analyzeCaseRevision(
    caseData.description,
    caseData.category,
    analysis.ai_response,
    notes
  )

  // Salva nova análise
  await auth.db
    .from('case_analyses')
    .update({
      ai_response:   result.text,
      tokens_used:   result.tokensUsed,
      review_status: 'pending',
      lawyer_notes:  notes,
      reviewed_at:   null,
      severity:      result.severity ?? null,
    })
    .eq('case_id', caseId)

  // Notifica o advogado pelo WhatsApp com a nova análise
  const { data: settings } = await auth.db.from('lawyer_settings').select('lawyer_phone').single()
  if (settings?.lawyer_phone) {
    const shortCode = caseId.slice(0, 6)
    await sendText(settings.lawyer_phone, [
      `🔄 *Nova análise gerada — Código ${shortCode}*`,
      ``,
      `A IA incorporou seus comentários. Revise novamente:`,
      ``,
      result.text.slice(0, 2500),
      ``,
      `✅ *APROVAR ${shortCode}*`,
      `✍️ *REVISAR ${shortCode}: [novos comentários]*`,
    ].join('\n'))
  }

  return NextResponse.json({ ok: true })
}
