import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { normalizePhone, isValidBrazilianMobile } from '@/lib/phone'

export async function POST(request: NextRequest) {
  try {
    const { name, cnpj, email, phone, password } = await request.json()

    if (!name || !cnpj || !email || !phone || !password) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios.' }, { status: 400 })
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
        data: { name, cnpj, phone },
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

    const { error: agencyError } = await admin.from('agencies').upsert({
      id: authData.user.id,
      name,
      cnpj,
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
