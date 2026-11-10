/**
 * POST /api/admin/indicacao — atribui (ou remove) o indicador de uma agência.
 *
 * Só o administrador: esta é a única rota que SOBRESCREVE a atribuição, e é por
 * ela que se corrige quem indicou quem. Fora daqui a marca é write-once (ver
 * src/lib/partners.ts).
 *
 * Corpo: { agencyId, slug }  — slug null/vazio remove a atribuição.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import { atribuirIndicacaoManual, limparSlug } from '@/lib/partners'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.email)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  }

  let body: { agencyId?: unknown; slug?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Corpo inválido.' }, { status: 400 })
  }

  const agencyId = typeof body.agencyId === 'string' ? body.agencyId : ''
  if (!agencyId) {
    return NextResponse.json({ error: 'Informe a agência.' }, { status: 400 })
  }

  const slug = limparSlug(body.slug)
  const resultado = await atribuirIndicacaoManual(agencyId, slug)

  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.erro }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    partner: resultado.partner ? { slug: resultado.partner.slug, name: resultado.partner.name } : null,
  })
}
