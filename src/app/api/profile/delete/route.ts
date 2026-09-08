/**
 * POST /api/profile/delete
 *
 * Direito de eliminação (LGPD, Art. 18, VI): exclui a conta da agência e todos
 * os seus dados pessoais, de forma imediata e irreversível.
 *
 * O que é apagado:
 *   - arquivos anexados aos casos (bucket `case-files`, que é público — deixá-los
 *     órfãos manteria documentos de clientes acessíveis por URL);
 *   - o usuário em auth.users, que cascateia para agencies → cases → análises,
 *     mensagens, arquivos e sessões de WhatsApp.
 *
 * O que é mantido, por obrigação legal (LGPD, Art. 16, I):
 *   - `billing_events` (registros fiscais de pagamento). A FK é ON DELETE SET
 *     NULL, então as linhas permanecem já desvinculadas da agência — sem dado
 *     pessoal, apenas o histórico da transação.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteSubscription, serviceClient } from '@/lib/asaas'
import { notifyAdminDeletionIssue } from '@/lib/notify'

export const maxDuration = 60

const BUCKET = 'case-files'
/** Palavra que a agência precisa digitar para confirmar a exclusão. */
const CONFIRMACAO = 'EXCLUIR'

type Db = ReturnType<typeof serviceClient>

/**
 * Lista todos os arquivos da agência no Storage. O caminho é
 * `${agencyId}/${caseId}/${arquivo}`, então é preciso descer um nível —
 * `list()` não é recursivo.
 */
async function listarArquivos(db: Db, agencyId: string): Promise<string[]> {
  const caminhos: string[] = []

  const { data: raiz } = await db.storage.from(BUCKET).list(agencyId, { limit: 1000 })
  for (const entrada of raiz ?? []) {
    // Pastas vêm sem id; arquivos soltos na raiz também são tratados.
    if (entrada.id) {
      caminhos.push(`${agencyId}/${entrada.name}`)
      continue
    }
    const { data: arquivos } = await db.storage
      .from(BUCKET)
      .list(`${agencyId}/${entrada.name}`, { limit: 1000 })
    for (const arquivo of arquivos ?? []) {
      caminhos.push(`${agencyId}/${entrada.name}/${arquivo.name}`)
    }
  }

  return caminhos
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    if (String(body.confirmacao ?? '').trim().toUpperCase() !== CONFIRMACAO) {
      return NextResponse.json(
        { error: `Digite ${CONFIRMACAO} para confirmar a exclusão.` },
        { status: 400 },
      )
    }

    const db = serviceClient()

    const { data: agency } = await db
      .from('agencies')
      .select('id, email, asaas_subscription_id')
      .eq('id', user.id)
      .maybeSingle()

    if (!agency) {
      return NextResponse.json({ error: 'Agência não encontrada.' }, { status: 404 })
    }

    // 1. Cancela a assinatura recorrente para não seguir cobrando uma conta que
    //    deixou de existir. Uma falha aqui NÃO bloqueia a exclusão (o direito do
    //    titular vem primeiro) — o admin é avisado para cancelar manualmente.
    if (agency.asaas_subscription_id) {
      try {
        await deleteSubscription(agency.asaas_subscription_id)
      } catch (err) {
        console.error('[profile/delete] falha ao cancelar assinatura:', err)
        await notifyAdminDeletionIssue(agency.email, agency.asaas_subscription_id)
      }
    }

    // 2. Arquivos do Storage. Não cascateiam com o banco e o bucket é público,
    //    então precisam ser removidos explicitamente (via service role: não há
    //    policy de DELETE para o usuário autenticado).
    try {
      const caminhos = await listarArquivos(db, agency.id)
      if (caminhos.length > 0) {
        const { error } = await db.storage.from(BUCKET).remove(caminhos)
        if (error) console.error('[profile/delete] falha ao remover arquivos:', error.message)
      }
    } catch (err) {
      console.error('[profile/delete] erro ao limpar o Storage:', err)
    }

    // 3. Sessões de WhatsApp saem antes, explicitamente: `whatsapp_sessions.case_id`
    //    referencia `cases` sem ON DELETE, então a exclusão em cascata dependeria
    //    da ordem em que o Postgres remove os filhos da agência. Tirando essas
    //    linhas primeiro, o cascata seguinte fica determinístico.
    await db.from('whatsapp_sessions').delete().eq('agency_id', agency.id)

    // 4. Remove o usuário. A FK agencies.id → auth.users(id) ON DELETE CASCADE
    //    leva junto agência, casos, análises, mensagens e arquivos.
    const { error: authError } = await db.auth.admin.deleteUser(agency.id)
    if (authError) {
      console.error('[profile/delete] falha ao excluir usuário:', authError.message)
      return NextResponse.json(
        { error: 'Não foi possível concluir a exclusão. Tente novamente em instantes.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[profile/delete]', err)
    return NextResponse.json({ error: 'Erro ao excluir a conta.' }, { status: 500 })
  }
}
