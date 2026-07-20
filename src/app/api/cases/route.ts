import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeCase } from '@/lib/claude'
import { extractTextFromFile } from '@/lib/extract-text'
import { findSimilarCases, formatSimilarCases } from '@/lib/ai/rag'
import { notifyAnalysisFailed, notifyLawyerNewCase, notifyAgencyCaseReady } from '@/lib/notify'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

function getServiceClient() {
  return createServiceClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
}

// Vercel Pro permite até 300s — necessário para Claude + RAG em casos com arquivos
export const maxDuration = 300

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const { data: cases, error } = await supabase
      .from('cases')
      .select('*, case_analyses(id, created_at)')
      .eq('agency_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar casos.' }, { status: 500 })
    }

    return NextResponse.json({ cases })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const formData    = await request.formData()
    const title       = formData.get('title') as string | null
    const description = formData.get('description') as string
    const category    = formData.get('category') as string
    const files       = (formData.getAll('files') as File[]).filter(f => f.size > 0)

    if (!description || !category) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios.' }, { status: 400 })
    }

    // Limite diário por agência (evita abuso durante o piloto)
    const today = new Date().toISOString().slice(0, 10)
    const { count: todayCount } = await supabase
      .from('cases')
      .select('*', { count: 'exact', head: true })
      .eq('agency_id', user.id)
      .gte('created_at', today)

    if ((todayCount ?? 0) >= 10) {
      return NextResponse.json(
        { error: 'Limite diário de 10 casos atingido. Tente novamente amanhã.' },
        { status: 429 }
      )
    }

    // 1. Criar o caso
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .insert({
        agency_id:   user.id,
        title:       title || null,
        description,
        category,
        status:      'em_analise',
        origin:      'web',
      })
      .select()
      .single()

    if (caseError || !caseData) {
      console.error('[cases POST] insert error:', caseError)
      return NextResponse.json({ error: 'Erro ao criar caso. Tente novamente.' }, { status: 500 })
    }

    // 2. Upload de arquivos
    const filesContent: string[] = []
    const uploadedFiles: Array<{
      file_url: string
      file_name: string
      file_type: string
      extracted_text: string
    }> = []

    for (const file of files.slice(0, 5)) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const buffer      = Buffer.from(arrayBuffer)
        const filePath    = `${user.id}/${caseData.id}/${Date.now()}-${file.name}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('case-files')
          .upload(filePath, buffer, { contentType: file.type })

        if (uploadError) {
          console.error('[cases POST] upload error:', uploadError)
          continue
        }

        if (uploadData) {
          const { data: urlData } = supabase.storage.from('case-files').getPublicUrl(filePath)
          const extracted = await extractTextFromFile(buffer, file.type, file.name)

          uploadedFiles.push({
            file_url:       urlData.publicUrl,
            file_name:      file.name,
            file_type:      file.type,
            extracted_text: extracted,
          })

          if (extracted) filesContent.push(`[Arquivo: ${file.name}]\n${extracted}`)
        }
      } catch (fileErr) {
        console.error('[cases POST] file processing error:', fileErr)
      }
    }

    if (uploadedFiles.length > 0) {
      await supabase.from('case_files').insert(
        uploadedFiles.map(f => ({ case_id: caseData.id, ...f }))
      )
    }

    // 3. Análise da IA (com RAG quando disponível)
    try {
      // Busca casos similares na base de conhecimento (falha silenciosa)
      const similarCases    = await findSimilarCases(description)
      const similarCasesCtx = formatSimilarCases(similarCases)

      const result = await analyzeCase(
        description,
        category,
        filesContent.join('\n\n---\n\n'),
        similarCasesCtx
      )

      // Verifica configuração de aprovação do advogado
      const db = getServiceClient()
      const { data: lawyerSettings } = await db
        .from('lawyer_settings')
        .select('auto_approve, lawyer_phone')
        .single()

      const autoApprove  = lawyerSettings?.auto_approve ?? true
      const reviewStatus = autoApprove ? 'approved' : 'pending'

      await supabase.from('case_analyses').insert({
        case_id:       caseData.id,
        ai_response:   result.text,
        tokens_used:   result.tokensUsed,
        review_status: reviewStatus,
        severity:      result.severity ?? null,
      })

      if (autoApprove) {
        await supabase.from('cases').update({ status: 'concluido' }).eq('id', caseData.id)
        await notifyAgencyCaseReady(caseData.id)
      } else {
        // Notifica advogado para revisar
        if (lawyerSettings?.lawyer_phone) {
          const { data: agencyData } = await supabase.from('agencies').select('name').eq('id', user.id).single()
          await notifyLawyerNewCase(
            lawyerSettings.lawyer_phone,
            caseData.id,
            agencyData?.name ?? 'Agência',
            category,
            result.text,
          )
        }
      }
    } catch (aiErr) {
      console.error('[cases POST] AI analysis error:', aiErr)
      await notifyAnalysisFailed(caseData.id, user.id, aiErr)
    }

    return NextResponse.json({ caseId: caseData.id }, { status: 201 })
  } catch (err) {
    console.error('[cases POST] unhandled error:', err)
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}
