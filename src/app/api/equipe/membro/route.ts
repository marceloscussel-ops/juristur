/**
 * PATCH  /api/equipe/membro — suspende ou reativa um usuário da agência
 * DELETE /api/equipe/membro — remove o usuário da agência
 *
 * Suspender é o freio reversível (perde o acesso, continua na lista e libera
 * o assento); remover apaga a conta de acesso dela. Os casos e documentos que
 * a pessoa registrou ficam: `created_by` não tem foreign key justamente para
 * o histórico jurídico da agência não depender de quem segue na equipe.
 *
 * Em nenhuma das duas o titular pode ser o alvo: é quem assina a conta e a
 * única pessoa que administra a equipe — suspender a si mesmo trancaria a
 * agência fora da própria cobrança.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { getEquipe } from '@/lib/equipe'
import { exigirTitular } from '../guard'

function admin() {
  return createServiceClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
}

/** Lê o alvo garantindo que ele é da agência de quem chamou e não é o titular. */
async function alvo(agencyId: string, userId: string) {
  if (!userId) return { erro: NextResponse.json({ error: 'Usuário não informado.' }, { status: 400 }) }

  const { data } = await admin()
    .from('agency_members')
    .select('user_id, agency_id, papel, nome, status')
    .eq('user_id', userId)
    .maybeSingle()

  // Checar o `agency_id` aqui é o que impede o titular de uma agência de
  // mexer no usuário de outra passando um id qualquer no corpo da requisição.
  if (!data || data.agency_id !== agencyId) {
    return { erro: NextResponse.json({ error: 'Usuário não encontrado nesta agência.' }, { status: 404 }) }
  }

  if (data.papel === 'titular') {
    return { erro: NextResponse.json({ error: 'O titular da conta não pode ser alterado.' }, { status: 422 }) }
  }

  return { membro: data }
}

export async function PATCH(request: NextRequest) {
  const porteiro = await exigirTitular()
  if ('erro' in porteiro) return porteiro.erro

  const body   = await request.json().catch(() => ({}))
  const status = String(body.status ?? '')

  if (status !== 'ativo' && status !== 'suspenso') {
    return NextResponse.json({ error: 'Status inválido.' }, { status: 400 })
  }

  const alvoRes = await alvo(porteiro.agencyId, String(body.userId ?? ''))
  if ('erro' in alvoRes) return alvoRes.erro

  // Reativar consome assento: depois de um downgrade a equipe pode ter mais
  // gente suspensa do que cabe no plano, e é o titular que escolhe quem volta.
  if (status === 'ativo') {
    const { seats } = await getEquipe(porteiro.agencyId)
    if (!seats.canInvite) {
      const motivo = seats.reason === 'trial_expired'
        ? 'Seu período gratuito terminou. Assine um plano para reativar usuários.'
        : `Seu plano inclui ${seats.total} ${seats.total === 1 ? 'usuário' : 'usuários'}. ` +
          'Suspenda outra pessoa ou troque de plano para reativar esta.'
      return NextResponse.json({ error: motivo, code: seats.reason }, { status: 409 })
    }
  }

  // Quem ainda não aceitou o convite continua 'convidado' até confirmar o
  // e-mail: marcá-lo como 'ativo' daria acesso a quem não provou ser dono da
  // caixa. Reativar, nesse caso, é só desfazer a suspensão.
  const novoStatus = status === 'ativo' && alvoRes.membro.status === 'convidado' ? 'convidado' : status

  const { error } = await admin()
    .from('agency_members')
    .update({ status: novoStatus })
    .eq('user_id', alvoRes.membro.user_id)

  if (error) {
    console.error('[equipe/membro PATCH]', JSON.stringify(error))
    return NextResponse.json({ error: 'Não foi possível alterar o usuário.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, status: novoStatus })
}

export async function DELETE(request: NextRequest) {
  const porteiro = await exigirTitular()
  if ('erro' in porteiro) return porteiro.erro

  const body    = await request.json().catch(() => ({}))
  const alvoRes = await alvo(porteiro.agencyId, String(body.userId ?? ''))
  if ('erro' in alvoRes) return alvoRes.erro

  // Apagar o usuário do Auth leva a linha de `agency_members` junto (a FK é
  // ON DELETE CASCADE). A conta dele só existe para acessar esta agência,
  // então não há o que preservar — e deixá-la viva faria a pessoa voltar a
  // logar e cair no fluxo que cria uma agência vazia.
  const { error } = await admin().auth.admin.deleteUser(alvoRes.membro.user_id)

  if (error) {
    console.error('[equipe/membro DELETE]', error.message)
    return NextResponse.json({ error: 'Não foi possível remover o usuário.' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
