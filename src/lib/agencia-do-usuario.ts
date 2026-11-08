/**
 * agencia-do-usuario.ts — De qual agência é o usuário autenticado?
 *
 * Até os planos com 3 e 5 usuários, agência e usuário eram a mesma coisa:
 * `agencies.id` É o `auth.users.id`, então todo lugar do código escrevia
 * `.eq('agency_id', user.id)`. Com `agency_members` isso passou a estar
 * errado para quem é membro — o `user.id` dele não é o id da agência, e a
 * consulta simplesmente não devolveria nada (ou, pior, devolveria os dados
 * de uma agência que não existe).
 *
 * Toda resolução passa por aqui para a regra existir num lugar só.
 *
 * Usa service role de propósito: precisamos ler o vínculo mesmo quando ele
 * NÃO está ativo (convidado ou suspenso), e a policy de `agency_members` só
 * mostra linhas de quem já está ativo. Não serve para o middleware, que roda
 * no Edge e não enxerga env var lida dinamicamente — lá a consulta é feita
 * com a sessão do próprio usuário.
 */
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

export type PapelMembro  = 'titular' | 'membro'
export type StatusMembro = 'convidado' | 'ativo' | 'suspenso'

export interface AgencyMember {
  user_id:      string
  agency_id:    string
  papel:        PapelMembro
  nome:         string | null
  telefone:     string | null
  email:        string | null
  status:       StatusMembro
  convidado_em: string | null
  aceito_em:    string | null
  created_at:   string
}

export const MEMBER_COLS =
  'user_id, agency_id, papel, nome, telefone, email, status, convidado_em, aceito_em, created_at'

function admin() {
  return createServiceClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
}

export interface Vinculo {
  /**
   * Agência a usar nas consultas. Nunca null, para não espalhar `?? user.id`
   * pelo código:
   *   · vínculo ativo  → a agência dele;
   *   · sem vínculo    → o próprio id (titular de antes da migration, ou
   *     banco onde ela ainda não rodou — mesmo comportamento de sempre);
   *   · convidado ou suspenso → o próprio id, que não casa com nenhuma
   *     agência. A consulta volta vazia em vez de vazar dados da agência.
   */
  agencyId:   string
  isTitular:  boolean
  /** `false` para convidado e suspenso: não deve ver nada da agência. */
  isAtivo:    boolean
  status:     StatusMembro
  membership: AgencyMember | null
  /**
   * A consulta falhou e não sabemos de quem é este usuário.
   *
   * Existe porque confundir "não tem vínculo" com "não consegui ler o
   * vínculo" criou uma agência fantasma para um membro em produção: uma
   * falha momentânea devolvia `membership: null`, o layout concluía que era
   * um titular sem agência e chamava `ensureAgency`. Quem lê este tipo tem
   * de decidir o que fazer quando não dá para saber — e nunca criar nada.
   */
  erro:       boolean
}

/** Vínculo completo do usuário com a sua agência. */
export async function getVinculo(userId: string): Promise<Vinculo> {
  const ler = () => admin()
    .from('agency_members')
    .select(MEMBER_COLS)
    .eq('user_id', userId)
    .maybeSingle()

  // Uma tentativa a mais antes de desistir: a falha típica aqui é de rede
  // (um soluço entre o servidor e o Supabase), e o custo de repetir uma
  // leitura por id é muito menor que o de tratar um membro como titular.
  let { data, error } = await ler()
  if (error) ({ data, error } = await ler())

  // Tabela ainda não criada (42P01): banco onde a migration não rodou. Aí o
  // comportamento antigo — todo usuário é a própria agência — é o certo.
  const tabelaAusente = error?.code === '42P01'

  if (error && !tabelaAusente) {
    console.error('[getVinculo] erro ao ler agency_members:', JSON.stringify(error))
    // Não sabemos quem é: devolve o próprio id (as consultas por agência
    // voltam vazias em vez de vazarem) e NÃO concede poderes de titular —
    // senão um soluço do banco promoveria um membro a dono da conta.
    return {
      agencyId:   userId,
      isTitular:  false,
      isAtivo:    true,
      status:     'ativo',
      membership: null,
      erro:       true,
    }
  }

  // Sem linha: trata como titular da própria agência, que é exatamente o que
  // o sistema fazia antes desta feature.
  if (!data) {
    return {
      agencyId:   userId,
      isTitular:  true,
      isAtivo:    true,
      status:     'ativo',
      membership: null,
      erro:       false,
    }
  }

  const membership = data as AgencyMember
  const isAtivo    = membership.status === 'ativo'

  return {
    agencyId:   isAtivo ? membership.agency_id : userId,
    isTitular:  membership.papel === 'titular',
    isAtivo,
    status:     membership.status,
    membership,
    erro:       false,
  }
}

/** Atalho para quem só precisa do id da agência nas consultas. */
export async function getAgencyId(userId: string): Promise<string> {
  return (await getVinculo(userId)).agencyId
}

/**
 * Ativa um vínculo que ainda está como 'convidado'.
 *
 * Quem aceita o convite vira 'ativo' pelo trigger `on_auth_user_confirmed`.
 * Esta é a rede de segurança para o caso de o Auth já ter criado o usuário
 * confirmado (ou de a confirmação ter acontecido antes do trigger existir):
 * estar com sessão aberta já prova que a pessoa abriu o link do convite.
 */
export async function ativarSeConvidado(userId: string): Promise<void> {
  await admin()
    .from('agency_members')
    .update({ status: 'ativo', aceito_em: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('status', 'convidado')
}

/**
 * Nome de cada usuário da agência, por `user_id` — para mostrar a autoria
 * (`cases.created_by`) sem uma consulta por linha do painel.
 *
 * Quem foi removido da equipe não está mais no mapa: `created_by` não tem
 * foreign key justamente para o caso continuar existindo sem ele, então a
 * tela cai no traço.
 */
export async function getNomesDaEquipe(agencyId: string): Promise<Record<string, string>> {
  const { data } = await admin()
    .from('agency_members')
    .select('user_id, nome, email')
    .eq('agency_id', agencyId)

  const mapa: Record<string, string> = {}
  for (const m of data ?? []) {
    mapa[m.user_id] = m.nome || m.email || 'Usuário'
  }
  return mapa
}
