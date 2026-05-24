import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyzeCase } from '@/lib/claude'
import { extractTextFromFile } from '@/lib/extract-text'

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

    const formData = await request.formData()
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const category = formData.get('category') as string
    const files = formData.getAll('files') as File[]

    if (!title || !description || !category) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios.' }, { status: 400 })
    }

    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .insert({
        agency_id: user.id,
        title,
        description,
        category,
        status: 'em_analise',
      })
      .select()
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Erro ao criar caso.' }, { status: 500 })
    }

    const filesContent: string[] = []
    const uploadedFiles: Array<{ file_url: string; file_name: string; file_type: string }> = []

    for (const file of files.slice(0, 5)) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const filePath = `${user.id}/${caseData.id}/${Date.now()}-${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('case-files')
        .upload(filePath, buffer, { contentType: file.type })

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from('case-files').getPublicUrl(filePath)
        uploadedFiles.push({
          file_url: urlData.publicUrl,
          file_name: file.name,
          file_type: file.type,
        })

        const text = await extractTextFromFile(buffer, file.type, file.name)
        if (text) {
          filesContent.push(`[Arquivo: ${file.name}]\n${text}`)
        }
      }
    }

    if (uploadedFiles.length > 0) {
      await supabase.from('case_files').insert(
        uploadedFiles.map(f => ({ case_id: caseData.id, ...f }))
      )
    }

    try {
      const aiResponse = await analyzeCase(description, category, filesContent.join('\n\n---\n\n'))

      await supabase.from('case_analyses').insert({
        case_id: caseData.id,
        ai_response: aiResponse,
      })

      await supabase
        .from('cases')
        .update({ status: 'concluido' })
        .eq('id', caseData.id)
    } catch {
      // AI failure doesn't block case creation — status stays 'em_analise'
    }

    return NextResponse.json({ caseId: caseData.id }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}
