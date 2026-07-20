import { NextResponse } from 'next/server'
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

export async function GET() {
  const auth = await verifyLawyer()
  if (!auth) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

  const { data, error } = await auth.db
    .from('case_analyses')
    .select('id, ai_response, review_status, lawyer_notes, created_at, cases(id, title, description, category, status, origin, created_at, agencies(name))')
    .in('review_status', ['pending', 'revision_requested'])
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Erro ao buscar casos.' }, { status: 500 })
  return NextResponse.json({ analyses: data })
}
