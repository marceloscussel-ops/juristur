import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAgencyId } from '@/lib/agencia-do-usuario'
import { buildContratoPdf, contratoFilename } from '@/lib/pdf/contrato-pdf'
import { montarContrato, type AnexoI } from '@/lib/contrato/termos'
import type { AceiteEvento } from '@/lib/contrato/termos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/contrato/<id do aceite>/pdf
 *
 * Baixa o contrato aceito em PDF. A RLS de `contract_acceptances` já limita a
 * leitura ao dono; o filtro por agency_id é cinto e suspensório.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  // A agência do usuário (membro ou titular) — nunca o id dele.
    const agencyId = await getAgencyId(user.id)

    const { data } = await supabase
      .from('contract_acceptances')
      .select('id, version, event, anexo, contract_text, accepted_at')
      .eq('id', id)
      .eq('agency_id', agencyId)
      .maybeSingle()

    if (!data) return NextResponse.json({ error: 'Aceite não encontrado.' }, { status: 404 })

    const anexo = (data.anexo ?? {}) as Partial<AnexoI>

    // Aceites gravados antes de `contract_text` existir (ou com a coluna vazia)
    // são remontados a partir do anexo — com o corpo ATUAL, que é o único que
    // temos. Melhor um PDF com nota de rodapé do que nenhum documento.
    const content = data.contract_text
      ?? (anexo.agencia && anexo.plano && anexo.aceite
        ? montarContrato(anexo as AnexoI)
        : null)

    if (!content) {
      return NextResponse.json(
        { error: 'Este aceite não tem texto de contrato associado.' },
        { status: 409 },
      )
    }

    const file = new Uint8Array(
      await buildContratoPdf({
        content,
        version:    data.version,
        event:      data.event as AceiteEvento,
        acceptedAt: data.accepted_at,
        agencyName: anexo.agencia?.nome ?? null,
      }),
    )

    const filename = contratoFilename(data.accepted_at)

    return new NextResponse(file, {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Length':      String(file.length),
        'Cache-Control':       'private, no-store',
      },
    })
  } catch (err) {
    console.error('[contrato pdf] falha ao gerar', err)
    return NextResponse.json({ error: 'Não foi possível gerar o PDF.' }, { status: 500 })
  }
}
