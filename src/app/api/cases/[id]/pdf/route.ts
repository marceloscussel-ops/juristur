import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildCasePdf, casePdfFilename } from '@/lib/pdf/case-pdf'
import type { Case, Severity } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SEVERITY_LABEL: Record<Severity, string> = {
  leve:         'Risco leve',
  medio:        'Risco médio',
  elevado:      'Risco elevado',
  elevadissimo: 'Risco elevadíssimo',
}

/** Baixa a orientação do caso como PDF (sem passar pela impressora do sistema). */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('cases')
      .select('*, case_analyses(*)')
      .eq('id', id)
      .eq('agency_id', user.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Caso não encontrado.' }, { status: 404 })
    }

    const caseData = data as Case
    // Mesma regra da tela: só a análise aprovada pelo advogado pode sair em PDF.
    const analysis = (caseData.case_analyses ?? []).find(a => a.review_status === 'approved')

    if (!analysis) {
      return NextResponse.json({ error: 'A análise ainda não foi aprovada.' }, { status: 409 })
    }

    const { data: agency } = await supabase
      .from('agencies')
      .select('name')
      .eq('id', user.id)
      .maybeSingle()

    // O título pode vir vazio nos casos abertos pelo WhatsApp.
    const title = caseData.title?.trim() || `Caso ${caseData.category}`

    const pdf = await buildCasePdf({
      title,
      category:       caseData.category,
      createdAt:      caseData.created_at,
      description:    caseData.description,
      complement:     caseData.complement,
      complementedAt: caseData.complemented_at,
      analysis:       analysis.ai_response,
      severityLabel:  analysis.severity ? SEVERITY_LABEL[analysis.severity] : null,
      approvedAt:     analysis.reviewed_at ?? analysis.created_at,
      agencyName:     agency?.name ?? null,
    })

    const filename = casePdfFilename(title, caseData.created_at)

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Length':      String(pdf.length),
        'Cache-Control':       'private, no-store',
      },
    })
  } catch (err) {
    console.error('[pdf] falha ao gerar', err)
    return NextResponse.json({ error: 'Não foi possível gerar o PDF.' }, { status: 500 })
  }
}
