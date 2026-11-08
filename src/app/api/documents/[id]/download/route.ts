import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAgencyId } from '@/lib/agencia-do-usuario'
import { buildDocumentPdf, documentFilename } from '@/lib/pdf/document-pdf'
import { buildDocumentDocx } from '@/lib/docx/document-docx'
import type { AgencyDocument } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MIME = {
  pdf:  'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
} as const

/**
 * Baixa o documento gerado em PDF ou DOCX: /api/documents/<id>/download?formato=docx
 *
 * Uma rota só para os dois formatos porque a origem é a mesma (o markdown
 * guardado em `documents.content`) e as checagens de dono e de conteúdo
 * pronto são idênticas — só o encoder final muda.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const formato = request.nextUrl.searchParams.get('formato') === 'docx' ? 'docx' : 'pdf'

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  // A agência do usuário (membro ou titular) — nunca o id dele.
    const agencyId = await getAgencyId(user.id)

    const { data } = await supabase
      .from('documents')
      .select('id, title, content, kind, doc_type, created_at')
      .eq('id', id)
      .eq('agency_id', agencyId)
      .maybeSingle()

    if (!data) return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 })

    const doc = data as AgencyDocument
    if (!doc.content) {
      return NextResponse.json({ error: 'O documento ainda não foi gerado.' }, { status: 409 })
    }

    const { data: agency } = await supabase
      .from('agencies').select('name').eq('id', agencyId).maybeSingle()

    const title = doc.title?.trim() || doc.doc_type?.trim() || 'Documento'

    const built = formato === 'docx'
      ? await buildDocumentDocx({ title, content: doc.content, agencyName: agency?.name })
      : await buildDocumentPdf({
          title, content: doc.content, createdAt: doc.created_at, agencyName: agency?.name,
        })

    const file = new Uint8Array(built)

    const filename = documentFilename(title, doc.created_at, formato)

    return new NextResponse(file, {
      headers: {
        'Content-Type':        MIME[formato],
        'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Content-Length':      String(file.length),
        'Cache-Control':       'private, no-store',
      },
    })
  } catch (err) {
    console.error('[documents download] falha ao gerar', err)
    return NextResponse.json({ error: 'Não foi possível gerar o arquivo.' }, { status: 500 })
  }
}
