import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { normalizePhone, isValidBrazilianMobile } from '@/lib/phone'
import { isValidCpfCnpj } from '@/lib/document'

export async function POST(request: NextRequest) {
  try {
    const { name, cnpj, email, phone, password } = await request.json()

    if (!name || !email || !phone || !password) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 })
    }

    // CPF/CNPJ não é pedido no cadastro (atrito alto — ninguém sabe de cabeça).
    // Fica para o /perfil, e o checkout já bloqueia a assinatura enquanto o
    // documento não for válido. Se vier informado, precisa ser válido.
    const cnpjDigits = (cnpj ?? '').replace(/\D/g, '')
    if (cnpjDigits && !isValidCpfCnpj(cnpjDigits)) {
      return NextResponse.json(
        { error: 'CPF ou CNPJ inválido. Confira os números digitados.' },
        { status: 400 }
      )
    }

    if (!isValidBrazilianMobile(phone)) {
      return NextResponse.json(
        { error: 'WhatsApp inválido. Informe com DDI e DDD. Ex: +55 (51) 99999-9999' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, cnpj: cnpjDigits || undefined, phone },
      },
    })

    if (authError) {
      console.error('[register] authError:', authError)
      if (authError.message.includes('already registered')) {
        return NextResponse.json({ error: 'Este e-mail já está cadastrado.' }, { status: 409 })
      }
      if (authError.status === 429) {
        return NextResponse.json({ error: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' }, { status: 429 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      // Ocorre quando email confirmation está ativa e o e-mail já existe não-confirmado.
      // Supabase retorna user:null sem erro para evitar enumeração.
      return NextResponse.json({ error: 'Este e-mail já está em uso. Se você tentou se cadastrar antes, verifique sua caixa de entrada ou tente com outro e-mail.' }, { status: 409 })
    }

    // Usa service role para bypassar RLS e garantir telefone normalizado.
    // O trigger já pode ter criado o registro — usamos upsert para atualizar.
    // Strip BOM (﻿) que pode ser inserido por editores Windows no .env
    const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').replace(/^﻿/, '').trim()
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey
    )

    // `cnpj` é NOT NULL no banco: sem documento informado gravamos o mesmo
    // placeholder usado pelo trigger de criação. `isValidCpfCnpj` o rejeita, então
    // o checkout continua pedindo o documento real antes de assinar.
    const PLACEHOLDER_CNPJ = '00.000.000/0000-00'

    const { error: agencyError } = await admin.from('agencies').upsert({
      id: authData.user.id,
      name,
      cnpj: cnpjDigits || PLACEHOLDER_CNPJ,
      email,
      phone: phone ? normalizePhone(phone) : null,
    }, { onConflict: 'id' })

    if (agencyError) {
      console.error('[register] agencyError:', JSON.stringify(agencyError))
      return NextResponse.json({ error: `Agência: ${agencyError.message} (code: ${agencyError.code})` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 })
  }
}
