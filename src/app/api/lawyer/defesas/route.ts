/**
 * POST /api/lawyer/defesas
 *
 * O advogado lança uma defesa que não nasceu de um clique na plataforma —
 * chegou por WhatsApp, por telefone, numa audiência marcada direto com ele.
 * Sem isto a cota só enxergaria o que passou pelo botão, e o saldo mostrado à
 * agência mentiria.
 *
 * Por padrão a linha nasce já 'utilizada' (o advogado está registrando algo que
 * aconteceu). `consumesQuota: false` registra sem descontar da cota — é a defesa
 * cobrada à parte, prevista no Parágrafo Terceiro da Cláusula Terceira.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyLawyer } from '@/lib/lawyer-auth'
import { registrarSolicitacaoDefesa } from '@/lib/defesas'
import type { DefenseKind, DefenseStatus } from '@/types'

const KINDS:    DefenseKind[]   = ['contrato', 'defesa', 'audiencia', 'peca', 'outro']
const STATUSES: DefenseStatus[] = ['solicitada', 'utilizada', 'descartada']

export async function POST(request: NextRequest) {
  const auth = await verifyLawyer()
  if (!auth) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const agencyId = typeof body.agencyId === 'string' ? body.agencyId : ''
  if (!agencyId) return NextResponse.json({ error: 'Informe a agência.' }, { status: 400 })

  const kind: DefenseKind     = KINDS.includes(body.kind) ? body.kind : 'defesa'
  const status: DefenseStatus = STATUSES.includes(body.status) ? body.status : 'utilizada'
  const consumesQuota = body.consumesQuota !== false

  const { data: agency } = await auth.db
    .from('agencies')
    .select('id, plan')
    .eq('id', agencyId)
    .maybeSingle()

  if (!agency) return NextResponse.json({ error: 'Agência não encontrada.' }, { status: 404 })

  const id = await registrarSolicitacaoDefesa(auth.db, {
    agencyId,
    caseId:  typeof body.caseId === 'string' && body.caseId ? body.caseId : null,
    origin:  'advogado',
    kind,
    status,
    consumesQuota,
    subject:     typeof body.subject === 'string' ? body.subject.slice(0, 500) : null,
    lawyerNotes: typeof body.notes === 'string' ? body.notes.slice(0, 2000) : null,
    decidedBy:   auth.userId,
    planAtUse:   agency.plan ?? null,
  })

  if (!id) {
    return NextResponse.json(
      { error: 'Não foi possível registrar. Este caso já tem uma defesa lançada?' },
      { status: 409 },
    )
  }

  return NextResponse.json({ ok: true, id })
}
