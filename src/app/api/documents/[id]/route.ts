import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAgencyId } from '@/lib/agencia-do-usuario'
import { generateContract, generateDocument, agencyProfileFromRow } from '@/lib/ai/documents'
import { getContractTemplate } from '@/lib/templates/contrato-turismo'
import type { AgencyDocument, DocumentFile } from '@/types'

export const maxDuration = 300

/**
 * Ações sobre um documento:
 *  - `confirmar`: o rascunho vira versão final e libera os downloads;
 *  - `regenerar`: roda a IA de novo com o mesmo prompt e os mesmos anexos,
 *    útil quando a geração falhou ou o resultado não serviu. Só em rascunho:
 *    documento confirmado não é sobrescrito sem querer.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

    const agencyId = await getAgencyId(user.id)

    const { action } = await request.json().catch(() => ({ action: null }))

    const { data } = await supabase
      .from('documents')
      .select('*, document_files(file_name, extracted_text)')
      .eq('id', id)
      .eq('agency_id', agencyId)
      .maybeSingle()

    if (!data) return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 })
    const doc = data as AgencyDocument

    if (action === 'confirmar') {
      if (!doc.content) {
        return NextResponse.json({ error: 'O documento ainda não foi gerado.' }, { status: 409 })
      }
      await supabase
        .from('documents')
        .update({ status: 'confirmado', updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('agency_id', agencyId)
      return NextResponse.json({ ok: true, status: 'confirmado' })
    }

    if (action === 'regenerar') {
      if (doc.status === 'confirmado') {
        return NextResponse.json(
          { error: 'Este documento já foi confirmado. Gere um novo para alterar o conteúdo.' },
          { status: 409 },
        )
      }

      const { data: agencyRow } = await supabase
        .from('agencies')
        .select('name, cnpj, email, phone, endereco, endereco_numero, bairro, cidade')
        .eq('id', agencyId)
        .maybeSingle()

      const filesContent = ((doc.document_files ?? []) as Partial<DocumentFile>[])
        .filter(f => f.extracted_text)
        .map(f => `[Arquivo: ${f.file_name}]\n${f.extracted_text}`)
        .join('\n\n---\n\n')

      const agency = agencyProfileFromRow(agencyRow)
      const prompt = doc.prompt ?? ''

      const result = doc.kind === 'contrato'
        ? await generateContract({
            template: getContractTemplate(doc.template_id),
            agency, filesContent, prompt,
          })
        : await generateDocument({
            agency, docType: doc.doc_type ?? 'Documento', filesContent, prompt,
          })

      await supabase
        .from('documents')
        .update({
          title:       result.title,
          content:     result.content,
          tokens_used: result.tokensUsed,
          updated_at:  new Date().toISOString(),
        })
        .eq('id', id)
        .eq('agency_id', agencyId)

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 })
  } catch (err) {
    console.error('[documents PATCH] error:', err)
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}

/** Remove o documento (e, por cascade, os anexos). */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const agencyId = await getAgencyId(user.id)

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', id)
    .eq('agency_id', agencyId)

  if (error) return NextResponse.json({ error: 'Não foi possível excluir.' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
