import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

function getServiceClient() {
  return createServiceClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
}

async function verifyLawyer() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const db = getServiceClient()
  const { data: lawyer } = await db.from('lawyers').select('id').eq('id', user.id).maybeSingle()
  if (!lawyer) return null
  return { user, db }
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyLawyer()
  if (!auth) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

  const { id: caseId } = await params

  const { error: analysisError } = await auth.db
    .from('case_analyses')
    .update({ review_status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('case_id', caseId)

  if (analysisError) return NextResponse.json({ error: 'Erro ao aprovar análise.' }, { status: 500 })

  await auth.db.from('cases').update({ status: 'concluido' }).eq('id', caseId)

  return NextResponse.json({ ok: true })
}
