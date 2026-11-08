/**
 * equipe.ts — Usuários de uma agência e a cota de assentos do plano.
 *
 * Tudo aqui roda com service role: `agency_members` não tem policy de
 * escrita justamente para convidar, suspender e remover só poderem acontecer
 * por estas funções, chamadas pelas rotas que já validaram que quem pediu é
 * o titular. Nenhuma dessas operações pode ser forjada pelo navegador.
 */
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { getSeatInfo, getTrialInfo, usuariosDoPlano, type SeatInfo } from '@/lib/plans'
import { MEMBER_COLS, type AgencyMember } from '@/lib/agencia-do-usuario'
import type { AgencyPlan } from '@/types'

function admin() {
  return createServiceClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
}

/** Colunas da agência necessárias para calcular assentos. */
const AGENCY_SEAT_COLS = 'plan, subscription_status, trial_ends_at, created_at, access_until'

/** Lista a equipe: titular primeiro, depois por ordem de entrada. */
export async function listarMembros(agencyId: string): Promise<AgencyMember[]> {
  const { data } = await admin()
    .from('agency_members')
    .select(MEMBER_COLS)
    .eq('agency_id', agencyId)
    .order('created_at', { ascending: true })

  const membros = (data ?? []) as AgencyMember[]
  return [
    ...membros.filter(m => m.papel === 'titular'),
    ...membros.filter(m => m.papel !== 'titular'),
  ]
}

/**
 * Deixa a equipe caber no plano, suspendendo os excedentes.
 *
 * Downgrade NUNCA é bloqueado — a agência tem o direito de baixar de plano
 * mesmo com cinco pessoas na conta. Quem sobra vira 'suspenso' (perde o
 * acesso, mas continua na lista) e o titular escolhe quem reativa. A ordem é
 * por entrada: quem chegou primeiro fica, e o titular nunca é suspenso — ele
 * é quem paga e quem administra a conta.
 *
 * Devolve quantos foram suspensos.
 */
export async function suspenderExcedentes(
  agencyId: string,
  assentos: number,
): Promise<number> {
  const membros = await listarMembros(agencyId)
  const ativos  = membros.filter(m => m.status === 'ativo')

  if (ativos.length <= assentos) return 0

  // `listarMembros` já devolve o titular primeiro, então o corte cai sempre
  // nos membros mais recentes.
  const excedentes = ativos.slice(assentos).filter(m => m.papel !== 'titular')
  if (excedentes.length === 0) return 0

  const { error } = await admin()
    .from('agency_members')
    .update({ status: 'suspenso' })
    .in('user_id', excedentes.map(m => m.user_id))

  if (error) {
    console.error('[suspenderExcedentes] erro:', JSON.stringify(error))
    return 0
  }

  console.log(`[suspenderExcedentes] ${excedentes.length} usuário(s) suspenso(s) na agência ${agencyId}`)
  return excedentes.length
}

export interface EquipeDaAgencia {
  membros: AgencyMember[]
  seats:   SeatInfo
  plan:    AgencyPlan | null
}

/**
 * Equipe da agência com a cota de assentos já reconciliada com o plano.
 *
 * A reconciliação acontece na leitura (e não só na troca de plano) porque é
 * o ponto em que sabemos, de uma vez, o plano vigente e quem está ativo:
 * uma agência que caiu de plano aparece com os excedentes já suspensos,
 * sem depender de nenhum processo agendado.
 */
export async function getEquipe(agencyId: string): Promise<EquipeDaAgencia> {
  const { data: agency } = await admin()
    .from('agencies')
    .select(AGENCY_SEAT_COLS)
    .eq('id', agencyId)
    .maybeSingle()

  const trial = getTrialInfo(agency ?? {})
  const plan  = (agency?.plan ?? null) as AgencyPlan | null
  const total = trial.isActive ? usuariosDoPlano(plan) : undefined

  // Só reconcilia quem tem plano pago: no período gratuito o teto é o mesmo
  // para todos e não há downgrade para absorver.
  if (total !== undefined) await suspenderExcedentes(agencyId, total)

  const membros = await listarMembros(agencyId)

  // Convite pendente conta como assento ocupado: ele já vai virar acesso
  // quando a pessoa aceitar, e deixá-lo de fora permitiria convidar dez
  // pessoas num plano de três — a conta estouraria na hora dos aceites.
  const ocupados = membros.filter(m => m.status === 'ativo' || m.status === 'convidado').length

  return { membros, seats: getSeatInfo(plan, trial, ocupados), plan }
}

/**
 * Suspende os excedentes depois de uma TROCA de plano.
 *
 * Chamada pelo webhook de cobrança, que é o único lugar onde o plano da
 * agência muda. Silenciosa por natureza: uma falha aqui não pode derrubar o
 * processamento de um pagamento.
 *
 * `planoAnterior` é o plano de antes do pagamento, e está aqui para esta
 * função só agir num downgrade de verdade. Quem vinha de 'free' (ou de plano
 * nenhum) está contratando pela primeira vez, e nesse caminho o plano gravado
 * pode ser o fallback do webhook — 'essencial', teto de um usuário — em vez de
 * uma escolha: uma agência que testou o período gratuito com três pessoas
 * perderia duas na hora do pagamento, sem aviso e sem assento para reativar
 * ninguém. O acerto então fica para a tela de equipe, onde o titular vê o que
 * está acontecendo e decide quem fica.
 */
export async function aplicarAssentosDoPlano(
  agencyId:       string,
  planoAnterior?: string | null,
): Promise<void> {
  try {
    if (!planoAnterior || planoAnterior === 'free') {
      console.log(
        `[aplicarAssentosDoPlano] ${agencyId}: primeira contratação ` +
        `(plano anterior: ${planoAnterior ?? 'ausente'}) — assentos ficam para a tela de equipe`,
      )
      return
    }

    const { data: agency } = await admin()
      .from('agencies')
      .select(AGENCY_SEAT_COLS)
      .eq('id', agencyId)
      .maybeSingle()

    if (!agency) return

    const trial = getTrialInfo(agency)
    if (!trial.isActive) return  // sem plano pago vale o teto do período gratuito

    await suspenderExcedentes(agencyId, usuariosDoPlano(agency.plan as AgencyPlan))
  } catch (err) {
    console.error('[aplicarAssentosDoPlano]', err)
  }
}
