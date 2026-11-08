import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizePhone } from '@/lib/phone'
import { isValidCpfCnpj } from '@/lib/document'
import { notifyWelcome } from '@/lib/notify'
import { getVinculo } from '@/lib/agencia-do-usuario'
import { exigirTitular } from '@/lib/titular'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { isPhoneTaken } from '@/lib/agency'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

    const vinculo = await getVinculo(user.id)

    const { data: agency, error } = await supabase
      .from('agencies').select('*').eq('id', vinculo.agencyId).single()

    if (error || !agency) return NextResponse.json({ error: 'Agência não encontrada.' }, { status: 404 })

    // `isTitular` manda na tela: editar dados, assinatura e exclusão da conta
    // são do titular. O membro vê a agência, não mexe nela.
    return NextResponse.json({
      agency,
      isTitular: vinculo.isTitular,
      papel:     vinculo.membership?.papel ?? 'titular',
      // Quem está conectado. Para o membro, o e-mail da agência não é o dele —
      // sem isto a tela não mostra em lugar nenhum com que conta ele entrou.
      usuario:   { email: user.email, nome: vinculo.membership?.nome ?? null },
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Dados da agência são do titular: nome e CNPJ aparecem no contrato e nas
    // cobranças, e o telefone é o canal de aviso da conta.
    const porteiro = await exigirTitular(
      'Só o titular da conta pode alterar os dados da agência.',
    )
    if ('erro' in porteiro) return porteiro.erro

    const { user, agencyId } = porteiro
    const supabase = await createClient()

    const { name, phone, cnpj } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })

    // CPF/CNPJ é opcional na edição, mas se informado precisa ser válido.
    const docDigits = (cnpj ?? '').replace(/\D/g, '')
    if (docDigits && !isValidCpfCnpj(docDigits)) {
      return NextResponse.json({ error: 'CPF ou CNPJ inválido. Confira os números digitados.' }, { status: 400 })
    }

    // Normaliza para formato Z-API (sem o nono dígito)
    const phoneDigits = phone ? normalizePhone(phone) : null

    // Telefone que estava gravado antes desta edição. Serve só para decidir se
    // esta é a PRIMEIRA vez que a conta ganha um WhatsApp — é o caso do cadastro
    // via Google, que só informa o número no /bem-vindo. Sem essa checagem, toda
    // edição de perfil dispararia outra mensagem de boas-vindas.
    const { data: before } = await supabase
      .from('agencies').select('phone').eq('id', agencyId).maybeSingle()

    // O número também é chave de busca em `agency_members.telefone` (cada
    // usuário da equipe tem o seu). Barra aqui, antes do update, porque a
    // violação de UNIQUE sairia como erro genérico de banco.
    if (phoneDigits && await isPhoneTaken(phoneDigits, user.id)) {
      return NextResponse.json(
        { error: 'Este número já está cadastrado em outra conta.' },
        { status: 409 },
      )
    }

    const update: { name: string; phone: string | null; cnpj?: string } = {
      name: name.trim(),
      phone: phoneDigits || null,
    }
    if (docDigits) update.cnpj = docDigits

    const { error } = await supabase
      .from('agencies')
      .update(update)
      .eq('id', agencyId)

    if (error) {
      if (error.message.includes('unique') || error.code === '23505') {
        return NextResponse.json({ error: 'Este número já está cadastrado em outra conta.' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Erro ao salvar.' }, { status: 500 })
    }

    // Espelha nome e telefone na linha de titular: é o que a tela de equipe
    // mostra, e o webhook do WhatsApp procura o número nas duas tabelas.
    await createServiceClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
      .from('agency_members')
      .update({ nome: name.trim(), telefone: phoneDigits || null })
      .eq('user_id', user.id)
      .eq('papel', 'titular')

    if (!before?.phone && phoneDigits) await notifyWelcome(phoneDigits, name.trim())

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
