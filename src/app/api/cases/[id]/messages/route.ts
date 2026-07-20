import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { followUpCase, ConversationMessage } from '@/lib/claude'
import { CaseAnalysis, MAX_FOLLOWUP_QUESTIONS } from '@/types'

export const maxDuration = 60

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: caseRow } = await supabase
    .from('cases')
    .select('id')
    .eq('id', id)
    .eq('agency_id', user.id)
    .single()

  if (!caseRow) return NextResponse.json({ error: 'Caso não encontrado' }, { status: 404 })

  const { data: messages } = await supabase
    .from('case_messages')
    .select('id, role, content, created_at')
    .eq('case_id', id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ messages: messages ?? [] })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await req.json()
  const question: string = body.question?.trim() ?? ''
  if (!question) return NextResponse.json({ error: 'Pergunta obrigatória' }, { status: 400 })
  if (question.length > 2000) return NextResponse.json({ error: 'Pergunta muito longa' }, { status: 400 })

  // Busca o caso + análise aprovada
  const { data: caseRow } = await supabase
    .from('cases')
    .select('description, category, case_analyses(*)')
    .eq('id', id)
    .eq('agency_id', user.id)
    .single()

  if (!caseRow) return NextResponse.json({ error: 'Caso não encontrado' }, { status: 404 })

  const analysis = ((caseRow.case_analyses ?? []) as CaseAnalysis[])
    .find(a => a.review_status === 'approved')

  if (!analysis) {
    return NextResponse.json(
      { error: 'A análise ainda não foi aprovada. Aguarde e tente novamente.' },
      { status: 400 }
    )
  }

  // Busca histórico de follow-ups anteriores
  const { data: history } = await supabase
    .from('case_messages')
    .select('role, content')
    .eq('case_id', id)
    .order('created_at', { ascending: true })

  // Trava de limite: controla custo e evita conversa infinita
  const asked = (history ?? []).filter(m => m.role === 'user').length
  if (asked >= MAX_FOLLOWUP_QUESTIONS) {
    return NextResponse.json(
      {
        error: `Você atingiu o limite de ${MAX_FOLLOWUP_QUESTIONS} perguntas para este caso. Para novas dúvidas, abra um novo caso.`,
        limitReached: true,
      },
      { status: 429 }
    )
  }

  // Salva a pergunta do usuário
  await supabase.from('case_messages').insert({
    case_id: id,
    role:    'user',
    content: question,
  })

  // Chama Claude com contexto completo
  const result = await followUpCase(
    caseRow.description,
    caseRow.category,
    analysis.ai_response,
    (history ?? []) as ConversationMessage[],
    question,
  )

  // Salva e retorna a resposta da IA
  const { data: assistantMsg } = await supabase
    .from('case_messages')
    .insert({ case_id: id, role: 'assistant', content: result.text })
    .select('id, role, content, created_at')
    .single()

  return NextResponse.json({ message: assistantMsg }, { status: 201 })
}
