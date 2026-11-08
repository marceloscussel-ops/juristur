/**
 * POST /api/lawyer/defesas/[id]
 *
 * O advogado decide o destino de uma solicitação de defesa:
 *   · 'utilizada'  → a defesa foi prestada. É o ÚNICO caminho que desconta da
 *     cota do plano, e é por isso que esta rota existe: pedir não é consumir.
 *     `consumesQuota: false` registra a defesa sem descontar (cobrada à parte).
 *   · 'descartada' → não houve atendimento (dúvida resolvida na conversa).
 *   · 'solicitada' → desfaz a marcação e devolve à fila, para corrigir um
 *     clique errado sem precisar mexer no banco.
 *
 * `used_at` é a data que define em qual ano de assinatura a defesa entra, então
 * é gravada aqui (momento da confirmação) e limpa quando a marcação é desfeita.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyLawyer } from '@/lib/lawyer-auth'
import type { DefenseKind, DefenseStatus } from '@/types'

const STATUSES: DefenseStatus[] = ['solicitada', 'utilizada', 'descartada']
const KINDS:    DefenseKind[]   = ['contrato', 'defesa', 'audiencia', 'peca', 'outro']

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await verifyLawyer()
  if (!auth) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

  const { id } = await params
  const body = await request.json().catch(() => ({}))

  if (!STATUSES.includes(body.status)) {
    return NextResponse.json({ error: 'Situação inválida.' }, { status: 400 })
  }
  const status = body.status as DefenseStatus

  const { data: atual } = await auth.db
    .from('defense_requests')
    .select('id, agency_id, used_at')
    .eq('id', id)
    .maybeSingle()

  if (!atual) return NextResponse.json({ error: 'Solicitação não encontrada.' }, { status: 404 })

  const { data: agency } = await auth.db
    .from('agencies')
    .select('plan')
    .eq('id', atual.agency_id)
    .maybeSingle()

  const agora = new Date().toISOString()
  const patch: Record<string, unknown> = {
    status,
    decided_by: auth.userId,
    decided_at: status === 'solicitada' ? null : agora,
    // Mantém a data da primeira confirmação quando o advogado só corrige a
    // observação ou o tipo — remarcar não deve mover a defesa de ano.
    used_at:    status === 'utilizada' ? (atual.used_at ?? agora) : null,
  }

  if (status === 'utilizada') {
    patch.consumes_quota = body.consumesQuota !== false
    patch.plan_at_use    = agency?.plan ?? null
  }
  if (typeof body.notes === 'string') patch.lawyer_notes = body.notes.slice(0, 2000)
  if (KINDS.includes(body.kind)) patch.kind = body.kind

  const { error } = await auth.db.from('defense_requests').update(patch).eq('id', id)

  if (error) {
    console.error('[lawyer/defesas] falha ao marcar:', error.message)
    return NextResponse.json({ error: 'Não foi possível salvar.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
