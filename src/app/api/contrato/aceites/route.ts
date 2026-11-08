import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAgencyId } from '@/lib/agencia-do-usuario'

export const dynamic = 'force-dynamic'

/**
 * GET /api/contrato/aceites
 *
 * Lista os aceites de contrato da agência logada, do mais recente para o mais
 * antigo. Não devolve `contract_text` (são alguns KB por linha e a tela só
 * mostra o resumo) — o texto completo sai no PDF de cada aceite.
 */
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  // A agência do usuário (membro ou titular) — nunca o id dele.
  const agencyId = await getAgencyId(user.id)

  const { data, error } = await supabase
    .from('contract_acceptances')
    .select('id, version, event, anexo, accepted_at')
    .eq('agency_id', agencyId)
    .order('accepted_at', { ascending: false })

  if (error) {
    console.error('[contrato/aceites]', error.message)
    return NextResponse.json({ error: 'Não foi possível carregar os aceites.' }, { status: 500 })
  }

  return NextResponse.json({ aceites: data ?? [] })
}
