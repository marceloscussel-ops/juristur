/**
 * POST /api/equipe/reenviar — manda de novo o convite de um usuário.
 *
 * Convite que caiu no spam, e-mail que a pessoa não viu, link vencido: o
 * caminho é reenviar, nunca convidar de novo. Um segundo convite para o mesmo
 * e-mail seria recusado pelo Auth ("already registered"), porque o usuário já
 * existe — ele só não confirmou o e-mail ainda.
 *
 * `inviteUserByEmail` reenvia o convite quando o usuário existe e ainda não
 * confirmou, que é exatamente o estado de um 'convidado'. Para quem já
 * confirmou (já tem senha) não há convite a repetir — aí o caminho é o
 * "esqueci minha senha".
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { appUrl } from '@/lib/urls'
import { exigirTitular } from '@/lib/titular'

function admin() {
  return createServiceClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
}

export async function POST(request: NextRequest) {
  const porteiro = await exigirTitular(
    'Só o titular da conta pode gerenciar os usuários da agência.',
  )
  if ('erro' in porteiro) return porteiro.erro

  const body   = await request.json().catch(() => ({}))
  const userId = String(body.userId ?? '')
  if (!userId) return NextResponse.json({ error: 'Usuário não informado.' }, { status: 400 })

  const db = admin()

  const { data: membro } = await db
    .from('agency_members')
    .select('user_id, agency_id, papel, nome, telefone, email, status')
    .eq('user_id', userId)
    .maybeSingle()

  // Mesma checagem das outras rotas: o alvo tem de ser da agência de quem
  // chamou, senão o id no corpo da requisição viraria uma porta para outra.
  if (!membro || membro.agency_id !== porteiro.agencyId) {
    return NextResponse.json({ error: 'Usuário não encontrado nesta agência.' }, { status: 404 })
  }

  if (membro.papel === 'titular') {
    return NextResponse.json({ error: 'O titular não recebe convite.' }, { status: 422 })
  }

  if (membro.status !== 'convidado') {
    return NextResponse.json(
      { error: 'Essa pessoa já ativou o acesso. Se ela perdeu a senha, use "esqueci minha senha" na tela de login.' },
      { status: 422 },
    )
  }

  if (!membro.email) {
    return NextResponse.json({ error: 'Esse usuário não tem e-mail cadastrado.' }, { status: 422 })
  }

  const { error } = await db.auth.admin.inviteUserByEmail(membro.email, {
    data: {
      name:      membro.nome,
      phone:     membro.telefone,
      agency_id: porteiro.agencyId,
      papel:     'membro',
    },
    // Mesmo destino do convite original: o link do Auth volta com os tokens
    // no fragmento da URL, e quem lê isso é a /resetar-senha.
    redirectTo: `${appUrl()}/resetar-senha`,
  })

  if (error) {
    console.error('[equipe/reenviar]', error.message)
    return NextResponse.json(
      { error: 'Não conseguimos reenviar o convite. Tente novamente em instantes.' },
      { status: 500 },
    )
  }

  await db
    .from('agency_members')
    .update({ convidado_em: new Date().toISOString() })
    .eq('user_id', userId)

  return NextResponse.json({ success: true })
}
