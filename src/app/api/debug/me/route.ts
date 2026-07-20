import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Verifica também via service role se o user está na tabela lawyers
  const db = createServiceClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
  const { data: lawyerRow } = await db.from('lawyers').select('*').eq('id', user.id).maybeSingle()
  const { data: allLawyers } = await db.from('lawyers').select('id, email')

  // Estado da agência (para diagnosticar o banner de trial)
  const { data: agencyRow, error: agencyErr } = await db
    .from('agencies').select('*').eq('id', user.id).maybeSingle()

  return NextResponse.json({
    user_id:       user.id,
    email:         user.email,
    app_metadata:  user.app_metadata,
    role_from_jwt: user.app_metadata?.role,
    is_lawyer_jwt: user.app_metadata?.role === 'lawyer',
    lawyer_row_db: lawyerRow,
    all_lawyers:   allLawyers,
    agency_row:    agencyRow,
    agency_error:  agencyErr?.message ?? null,
  })
}
