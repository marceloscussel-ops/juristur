/**
 * GET  /api/equipe — equipe da agência + cota de assentos do plano
 * POST /api/equipe — convida um usuário para a agência
 *
 * O convite é o ponto mais delicado da feature. O caminho normal de cadastro
 * cria uma AGÊNCIA para todo usuário novo do Auth (trigger handle_new_user),
 * então um membro que se cadastrasse sozinho viraria uma agência vazia em vez
 * de entrar na agência do titular. Por isso o fluxo é sempre:
 *
 *   titular informa nome/telefone/e-mail
 *     → esta rota valida o assento e chama auth.admin.inviteUserByEmail
 *       com `agency_id` no metadata
 *     → o trigger vê o `agency_id` e grava só a linha em `agency_members`
 *     → o convidado define a senha pelo link (/resetar-senha) e o trigger
 *       on_auth_user_confirmed o põe como 'ativo'
 *
 * Nada disso passa pelo /cadastro, e o convidado nunca tem agência própria.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { appUrl } from '@/lib/urls'
import { normalizePhone, isValidBrazilianMobile } from '@/lib/phone'
import { isPhoneTaken } from '@/lib/agency'
import { getEquipe } from '@/lib/equipe'
import { exigirTitular } from '@/lib/titular'

function admin() {
  return createServiceClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
}

/**
 * Destino do link do convite. É o mesmo caminho do "esqueci minha senha":
 * /auth/callback troca o código por sessão e manda para /resetar-senha, onde
 * a pessoa define a senha. Não existe tela própria de convite — o convidado
 * só precisa de uma senha.
 */
function conviteRedirectTo(): string {
  return `${appUrl()}/auth/callback?next=/resetar-senha`
}

export async function GET() {
  const porteiro = await exigirTitular(
    'Só o titular da conta pode gerenciar os usuários da agência.',
  )
  if ('erro' in porteiro) return porteiro.erro

  const { membros, seats, plan } = await getEquipe(porteiro.agencyId)

  return NextResponse.json({
    membros,
    assentos: seats,
    plan,
    // O titular é quem está chamando — a tela usa isto para nunca oferecer
    // "remover" ou "suspender" na própria linha.
    titularId: porteiro.user.id,
  })
}

export async function POST(request: NextRequest) {
  const porteiro = await exigirTitular(
    'Só o titular da conta pode gerenciar os usuários da agência.',
  )
  if ('erro' in porteiro) return porteiro.erro

  const { agencyId } = porteiro
  const body = await request.json().catch(() => ({}))

  const nome     = String(body.nome ?? '').trim()
  const email    = String(body.email ?? '').trim().toLowerCase()
  const telefone = String(body.telefone ?? '').trim()

  if (!nome)  return NextResponse.json({ error: 'Informe o nome da pessoa.' }, { status: 400 })
  if (!email || !email.includes('@')) {
    return NextResponse.json({ error: 'Informe um e-mail válido.' }, { status: 400 })
  }

  // Telefone é opcional (dá para usar só a web), mas quando informado precisa
  // ser um WhatsApp válido: é por ele que o webhook identifica quem escreve.
  let phone: string | null = null
  if (telefone) {
    if (!isValidBrazilianMobile(telefone)) {
      return NextResponse.json(
        { error: 'WhatsApp inválido. Informe com DDI e DDD. Ex: +55 (51) 99999-9999' },
        { status: 400 },
      )
    }
    phone = normalizePhone(telefone)
    if (await isPhoneTaken(phone)) {
      return NextResponse.json(
        { error: 'Este WhatsApp já está cadastrado em outra conta. Use outro número.' },
        { status: 409 },
      )
    }
  }

  const { membros, seats } = await getEquipe(agencyId)

  if (membros.some(m => (m.email ?? '').toLowerCase() === email)) {
    return NextResponse.json(
      { error: 'Esse e-mail já está na equipe. Use "reenviar convite" na linha dele.' },
      { status: 409 },
    )
  }

  if (!seats.canInvite) {
    const motivo = seats.reason === 'trial_expired'
      ? 'Seu período gratuito terminou. Assine um plano para incluir usuários.'
      : `Seu plano inclui ${seats.total} ${seats.total === 1 ? 'usuário' : 'usuários'}. ` +
        'Troque de plano ou suspenda alguém da equipe para abrir um assento.'
    return NextResponse.json({ error: motivo, code: seats.reason }, { status: 409 })
  }

  const db = admin()

  const { data, error } = await db.auth.admin.inviteUserByEmail(email, {
    // `agency_id` é o que faz o trigger NÃO criar agência para o convidado.
    data: { name: nome, phone, agency_id: agencyId, papel: 'membro' },
    redirectTo: conviteRedirectTo(),
  })

  if (error || !data?.user) {
    console.error('[equipe POST] inviteUserByEmail:', error?.message)

    // E-mail que já tem conta: o Auth recusa o convite. Pode ser titular de
    // outra agência ou membro de outra equipe — em nenhum dos casos podemos
    // mexer na conta dela, então a saída é a pessoa usar outro e-mail.
    const jaExiste = /registered|already|exists/i.test(error?.message ?? '')
    return NextResponse.json(
      {
        error: jaExiste
          ? 'Esse e-mail já tem conta no TurisGuard. Peça para a pessoa usar outro e-mail, ou excluir a conta atual antes de entrar na sua equipe.'
          : 'Não conseguimos enviar o convite. Tente novamente em instantes.',
      },
      { status: jaExiste ? 409 : 500 },
    )
  }

  // O trigger já criou a linha com os dados do metadata. O upsert aqui é a
  // garantia de que nome e telefone ficaram gravados mesmo se o convite for
  // repetido para alguém que já estava na tabela — e nunca mexe no `status`,
  // para não ressuscitar sozinho quem o titular suspendeu.
  const linha = {
    user_id:      data.user.id,
    agency_id:    agencyId,
    papel:        'membro',
    nome,
    telefone:     phone,
    email,
    convidado_em: new Date().toISOString(),
  }

  const { error: insertErr } = await db.from('agency_members').insert({ ...linha, status: 'convidado' })

  if (insertErr?.code === '23505') {
    await db.from('agency_members').update(linha).eq('user_id', data.user.id)
  } else if (insertErr) {
    console.error('[equipe POST] agency_members insert:', JSON.stringify(insertErr))
  }

  return NextResponse.json({ success: true, userId: data.user.id })
}
