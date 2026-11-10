/**
 * partners.ts — Indicadores comissionados.
 *
 * Um indicador (ex.: UNAV) traz agências e recebe percentual sobre o que elas
 * pagam. Duas coisas moram aqui: resolver o slug do link de indicação e gravar
 * a atribuição na agência.
 *
 * A gravação é WRITE-ONCE de propósito. Se o `partner_id` pudesse ser
 * sobrescrito, bastaria a pessoa reabrir o site pelo link de outro indicador
 * para a conta trocar de dono — e o erro só apareceria no fechamento da
 * comissão, quando já não há como saber quem trouxe quem.
 *
 * `origem` (canal de marketing) continua separada: uma agência pode ter vindo
 * do QR code do evento E ter sido indicada. O que esta regra faz é preencher a
 * origem quando ela está vazia, para a indicação aparecer no gráfico de
 * aquisição do painel.
 */

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

/** Cookie que carrega o slug do indicador entre o clique no link e o cadastro. */
export const INDICADOR_COOKIE = 'tg_ind'

/**
 * Validade do cookie. A agência raramente se cadastra no mesmo dia em que
 * recebe a indicação — costuma ouvir falar num evento ou numa newsletter da
 * associação e voltar depois.
 */
export const INDICADOR_COOKIE_DIAS = 90

/** Valor gravado em `agencies.origem` quando a agência chega por indicação. */
export const ORIGEM_INDICACAO = 'indicacao'

export interface Partner {
  id:             string
  slug:           string
  name:           string
  commission_pct: number
  recurring:      boolean
  active:         boolean
  contact_name?:  string | null
  contact_email?: string | null
  notes?:         string | null
  created_at?:    string
}

function db() {
  return createServiceClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
}

/**
 * Normaliza o slug que vem da URL (controlada pelo visitante): minúsculas,
 * só letras, números e hífen, tamanho limitado.
 */
export function limparSlug(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const s = valor.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40)
  return s || null
}

/** Indicador ATIVO com este slug, ou null. Indicador inativo não atribui. */
export async function buscarIndicadorPorSlug(slug: unknown): Promise<Partner | null> {
  const limpo = limparSlug(slug)
  if (!limpo) return null

  const { data } = await db()
    .from('partners')
    .select('id, slug, name, commission_pct, recurring, active')
    .eq('slug', limpo)
    .eq('active', true)
    .maybeSingle()

  return (data as Partner | null) ?? null
}

/** Todos os indicadores, ativos primeiro. Usada pelo painel gerencial. */
export async function listarIndicadores(): Promise<Partner[]> {
  const { data } = await db()
    .from('partners')
    .select('id, slug, name, commission_pct, recurring, active, contact_name, contact_email, notes, created_at')
    .order('active', { ascending: false })
    .order('name')

  return (data as Partner[] | null) ?? []
}

/**
 * Atribui a agência a um indicador, uma única vez.
 *
 * Retorna true quando a atribuição foi efetivada; false quando o slug não
 * existe, o indicador está inativo ou a agência JÁ tinha indicador (não
 * sobrescreve). Nunca lança: a indicação não pode derrubar um cadastro.
 */
export async function marcarIndicacao(
  agencyId: string,
  slug:     unknown,
): Promise<boolean> {
  try {
    const partner = await buscarIndicadorPorSlug(slug)
    if (!partner) return false

    const supabase = db()

    // `.is('partner_id', null)` é a guarda write-once — no banco, não na
    // aplicação: duas requisições simultâneas não conseguem atribuir duas vezes.
    const { data } = await supabase
      .from('agencies')
      .update({
        partner_id:            partner.id,
        partner_attributed_at: new Date().toISOString(),
      })
      .eq('id', agencyId)
      .is('partner_id', null)
      .select('id')

    if (!data?.length) return false

    // Origem só é preenchida se estiver vazia: um cadastro pelo QR do evento
    // que também foi indicado continua contando como evento na aquisição.
    await supabase
      .from('agencies')
      .update({ origem: ORIGEM_INDICACAO })
      .eq('id', agencyId)
      .is('origem', null)

    return true
  } catch (e) {
    console.error('[partners] marcarIndicacao:', e instanceof Error ? e.message : e)
    return false
  }
}

/**
 * Atribuição MANUAL, feita no painel gerencial — e a única que sobrescreve.
 *
 * Existe porque link e QR code nunca são à prova de tudo: a agência ouve falar
 * da plataforma no estande da associação e se cadastra direto do Google dias
 * depois. Sem este caminho, essa conversa acabaria numa planilha paralela.
 *
 * Sobrescrever é o ponto: é aqui que se corrige uma atribuição errada. Por isso
 * a rota que chama esta função é restrita ao administrador.
 *
 * `slug = null` remove a atribuição.
 */
export async function atribuirIndicacaoManual(
  agencyId: string,
  slug:     string | null,
): Promise<{ ok: true; partner: Partner | null } | { ok: false; erro: string }> {
  if (slug === null) {
    const { error } = await db()
      .from('agencies')
      .update({ partner_id: null, partner_attributed_at: null })
      .eq('id', agencyId)

    if (error) return { ok: false, erro: error.message }
    return { ok: true, partner: null }
  }

  const partner = await buscarIndicadorPorSlug(slug)
  if (!partner) return { ok: false, erro: 'Indicador não encontrado ou inativo.' }

  const { error } = await db()
    .from('agencies')
    .update({
      partner_id:            partner.id,
      partner_attributed_at: new Date().toISOString(),
    })
    .eq('id', agencyId)

  if (error) return { ok: false, erro: error.message }
  return { ok: true, partner }
}

// ─── Extrato de comissões (view partner_commissions) ─────────────────────────

/** Uma linha do extrato: um pagamento recebido de uma agência indicada. */
export interface CommissionRow {
  event_id:            string
  created_at:          string
  event:               string
  billing_type:        string | null
  partner_id:          string
  partner_name:        string
  partner_slug:        string
  commission_pct:      number
  recurring:           boolean
  agency_id:           string
  agency_name:         string
  plan:                string | null
  billing_cycle:       string | null
  subscription_status: string | null
  /** Negativo em estorno. */
  value:               number
  commission:          number
}

/** Extrato completo, mais recente primeiro. */
export async function listarComissoes(): Promise<CommissionRow[]> {
  const { data, error } = await db()
    .from('partner_commissions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[partners] listarComissoes:', error.message)
    return []
  }
  return (data as CommissionRow[] | null) ?? []
}

/**
 * Aplica a regra do indicador sobre o extrato de UMA agência.
 *
 * `recurring = false` comissiona só a primeira venda: das linhas positivas
 * fica apenas a mais antiga. Os estornos continuam valendo — se a venda
 * comissionada foi devolvida, a comissão também volta.
 */
export function comissoesDevidas(
  linhas:    CommissionRow[],
  recurring: boolean,
): CommissionRow[] {
  if (recurring) return linhas

  // Number() porque `numeric` do Postgres pode chegar como string.
  const positivas = linhas.filter(l => Number(l.value) > 0)
  const estornos  = linhas.filter(l => Number(l.value) < 0)
  const primeira  = positivas
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0]

  return [...(primeira ? [primeira] : []), ...estornos]
}
