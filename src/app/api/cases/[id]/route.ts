import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const { data: caseData, error } = await supabase
      .from('cases')
      .select('*, case_analyses(*), case_files(*)')
      .eq('id', id)
      .eq('agency_id', user.id)
      .single()

    if (error || !caseData) {
      return NextResponse.json({ error: 'Caso não encontrado.' }, { status: 404 })
    }

    return NextResponse.json({ case: caseData })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
