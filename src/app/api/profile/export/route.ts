/**
 * GET /api/profile/export
 *
 * Direito de acesso e portabilidade (LGPD, Art. 18, II e V): devolve, em JSON,
 * todos os dados da agência autenticada — cadastro, casos, análises, mensagens
 * e a relação de arquivos anexados.
 *
 * Oferecido junto da exclusão de conta para que a agência possa guardar o
 * próprio histórico jurídico antes de apagá-lo.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Depende da sessão do usuário — nunca pode ser avaliada em build.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

    // RLS garante que só vêm os dados da própria agência.
    const [{ data: agency }, { data: cases }] = await Promise.all([
      supabase.from('agencies').select('*').eq('id', user.id).maybeSingle(),
      supabase
        .from('cases')
        .select('*, case_analyses(*), case_messages(*), case_files(id, file_name, file_type, file_url, created_at)')
        .eq('agency_id', user.id)
        .order('created_at', { ascending: true }),
    ])

    if (!agency) return NextResponse.json({ error: 'Agência não encontrada.' }, { status: 404 })

    const payload = {
      exportadoEm: new Date().toISOString(),
      observacao:
        'Exportação de dados pessoais do TurisGuard, conforme a LGPD (Lei 13.709/2018), Art. 18, II e V.',
      conta: {
        id:         agency.id,
        nome:       agency.name,
        email:      agency.email,
        documento:  agency.cnpj,
        telefone:   agency.phone,
        criadaEm:   agency.created_at,
        plano:      agency.plan,
        assinatura: agency.subscription_status,
        acessoAte:  agency.access_until,
      },
      casos: (cases ?? []).map(c => ({
        id:          c.id,
        titulo:      c.title,
        categoria:   c.category,
        descricao:   c.description,
        complemento: c.complement,
        status:      c.status,
        origem:      c.origin,
        criadoEm:    c.created_at,
        analises:    c.case_analyses,
        mensagens:   c.case_messages,
        arquivos:    c.case_files,
      })),
    }

    const nomeArquivo = `turisguard-meus-dados-${new Date().toISOString().slice(0, 10)}.json`

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type':        'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${nomeArquivo}"`,
        'Cache-Control':       'no-store',
      },
    })
  } catch (err) {
    console.error('[profile/export]', err)
    return NextResponse.json({ error: 'Erro ao exportar os dados.' }, { status: 500 })
  }
}
