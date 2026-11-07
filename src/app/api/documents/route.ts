import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractTextFromFile } from '@/lib/extract-text'
import { generateContract, generateDocument, agencyProfileFromRow } from '@/lib/ai/documents'
import { getContractTemplate, DEFAULT_CONTRACT_TEMPLATE_ID } from '@/lib/templates/contrato-turismo'

// Claude redigindo um contrato inteiro leva mais que o default do Vercel.
export const maxDuration = 300

/** Teto por agência por dia. Guarda-corpo contra abuso/loop, não cota de plano. */
const MAX_DOCS_PER_DAY = 50

const MAX_FILES = 5

/**
 * Cria um documento (contrato ou outro) e já o gera com a IA.
 *
 * O documento nasce como `rascunho`: a agência confere na tela antes de
 * confirmar e baixar. Os anexos são fonte de dados do consumidor, não parte
 * do documento final.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

    const formData = await request.formData()
    const kind     = (formData.get('kind') as string) === 'outro' ? 'outro' : 'contrato'
    const prompt   = ((formData.get('prompt') as string) ?? '').trim()
    const docType  = ((formData.get('doc_type') as string) ?? '').trim()
    const files    = (formData.getAll('files') as File[]).filter(f => f.size > 0)

    if (kind === 'outro' && !docType) {
      return NextResponse.json({ error: 'Informe o tipo do documento.' }, { status: 400 })
    }
    if (kind === 'outro' && !prompt) {
      return NextResponse.json({ error: 'Descreva o documento que você precisa.' }, { status: 400 })
    }
    if (kind === 'contrato' && !prompt && files.length === 0) {
      return NextResponse.json(
        { error: 'Envie os documentos do cliente ou informe os dados no campo de texto.' },
        { status: 400 },
      )
    }

    // Limite diário por agência
    const today = new Date().toISOString().slice(0, 10)
    const { count: todayCount } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', user.id)
      .gte('created_at', today)

    if ((todayCount ?? 0) >= MAX_DOCS_PER_DAY) {
      return NextResponse.json(
        { error: `Limite diário de ${MAX_DOCS_PER_DAY} documentos atingido. Tente novamente amanhã.` },
        { status: 429 },
      )
    }

    const template = getContractTemplate(
      (formData.get('template_id') as string) ?? DEFAULT_CONTRACT_TEMPLATE_ID,
    )

    // 1. Cria a linha antes de gerar: se a IA falhar, o rascunho existe e a
    //    agência pode tentar de novo sem redigitar tudo.
    const { data: doc, error: insertError } = await supabase
      .from('documents')
      .insert({
        agency_id:   user.id,
        kind,
        template_id: kind === 'contrato' ? template.id : null,
        doc_type:    kind === 'outro' ? docType : template.nome,
        title:       null,
        prompt,
        status:      'rascunho',
      })
      .select()
      .single()

    if (insertError || !doc) {
      console.error('[documents POST] insert error:', JSON.stringify(insertError))
      return NextResponse.json({ error: 'Erro ao criar o documento. Tente novamente.' }, { status: 500 })
    }

    // 2. Anexos: upload + extração de texto
    const filesContent: string[] = []
    const uploaded: Array<{
      file_url: string; file_name: string; file_type: string; extracted_text: string
    }> = []

    for (const file of files.slice(0, MAX_FILES)) {
      try {
        const buffer   = Buffer.from(await file.arrayBuffer())
        const filePath = `${user.id}/doc-${doc.id}/${Date.now()}-${file.name}`

        const { data: up, error: upErr } = await supabase.storage
          .from('case-files')
          .upload(filePath, buffer, { contentType: file.type })

        if (upErr || !up) { console.error('[documents POST] upload error:', upErr); continue }

        const { data: urlData } = supabase.storage.from('case-files').getPublicUrl(filePath)
        const extracted = await extractTextFromFile(buffer, file.type, file.name)

        uploaded.push({
          file_url:       urlData.publicUrl,
          file_name:      file.name,
          file_type:      file.type,
          extracted_text: extracted,
        })
        if (extracted) filesContent.push(`[Arquivo: ${file.name}]\n${extracted}`)
      } catch (fileErr) {
        console.error('[documents POST] file processing error:', fileErr)
      }
    }

    if (uploaded.length > 0) {
      await supabase.from('document_files').insert(
        uploaded.map(f => ({ document_id: doc.id, ...f })),
      )
    }

    // 3. Geração
    const { data: agencyRow } = await supabase
      .from('agencies')
      .select('name, cnpj, email, phone, endereco, endereco_numero, bairro, cidade')
      .eq('id', user.id)
      .maybeSingle()

    const agency = agencyProfileFromRow(agencyRow)
    const joined = filesContent.join('\n\n---\n\n')

    try {
      const result = kind === 'contrato'
        ? await generateContract({ template, agency, filesContent: joined, prompt })
        : await generateDocument({ agency, docType, filesContent: joined, prompt })

      await supabase
        .from('documents')
        .update({
          title:       result.title,
          content:     result.content,
          tokens_used: result.tokensUsed,
          updated_at:  new Date().toISOString(),
        })
        .eq('id', doc.id)
        .eq('agency_id', user.id)
    } catch (aiErr) {
      console.error('[documents POST] AI error:', aiErr)
      // O rascunho fica sem conteúdo; a tela oferece "Gerar novamente".
      return NextResponse.json(
        { documentId: doc.id, warning: 'O documento foi criado, mas a geração falhou. Tente gerar novamente.' },
        { status: 201 },
      )
    }

    return NextResponse.json({ documentId: doc.id }, { status: 201 })
  } catch (err) {
    console.error('[documents POST] unhandled error:', err)
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}
