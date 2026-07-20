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

export async function GET() {
  const auth = await verifyLawyer()
  if (!auth) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

  const { data, error } = await auth.db.from('lawyer_settings').select('*').single()
  if (error) return NextResponse.json({ error: 'Erro ao buscar configurações.' }, { status: 500 })
  return NextResponse.json({ settings: data })
}

export async function PATCH(request: NextRequest) {
  const auth = await verifyLawyer()
  if (!auth) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 })

  const body = await request.json()
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.auto_approve === 'boolean') update.auto_approve = body.auto_approve
  if (typeof body.lawyer_phone === 'string')  update.lawyer_phone = body.lawyer_phone.trim() || null

  const { data, error } = await auth.db
    .from('lawyer_settings')
    .update(update)
    .eq('id', 1)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Erro ao salvar configurações.' }, { status: 500 })
  return NextResponse.json({ settings: data })
}
