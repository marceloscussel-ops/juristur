import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizePhone } from '@/lib/phone'
import { isValidCpfCnpj } from '@/lib/document'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

    const { data: agency, error } = await supabase
      .from('agencies').select('*').eq('id', user.id).single()

    if (error || !agency) return NextResponse.json({ error: 'Agência não encontrada.' }, { status: 404 })
    return NextResponse.json({ agency })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

    const { name, phone, cnpj } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })

    // CPF/CNPJ é opcional na edição, mas se informado precisa ser válido.
    const docDigits = (cnpj ?? '').replace(/\D/g, '')
    if (docDigits && !isValidCpfCnpj(docDigits)) {
      return NextResponse.json({ error: 'CPF ou CNPJ inválido. Confira os números digitados.' }, { status: 400 })
    }

    // Normaliza para formato Z-API (sem o nono dígito)
    const phoneDigits = phone ? normalizePhone(phone) : null

    const update: { name: string; phone: string | null; cnpj?: string } = {
      name: name.trim(),
      phone: phoneDigits || null,
    }
    if (docDigits) update.cnpj = docDigits

    const { error } = await supabase
      .from('agencies')
      .update(update)
      .eq('id', user.id)

    if (error) {
      if (error.message.includes('unique') || error.code === '23505') {
        return NextResponse.json({ error: 'Este número já está cadastrado em outra conta.' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Erro ao salvar.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
