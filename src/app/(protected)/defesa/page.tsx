import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { loadDefenseInfo } from '@/lib/defesas'
import { whatsappLink } from '@/lib/whatsapp/public-number'
import { formatDate } from '@/lib/datetime'
import DefesaCaseList, { type DefesaCase } from '@/components/DefesaCaseList'
import DefesaQuota from '@/components/DefesaQuota'
import DefesaSolicitar from '@/components/DefesaSolicitar'
import {
  DEFENSE_KIND_LABELS, DEFENSE_STATUS_LABELS,
  type DefenseKind, type DefenseStatus,
} from '@/types'
import { ArrowLeft, AlertTriangle, Clock, FileText, UserCheck } from 'lucide-react'
import { getAgencyId } from '@/lib/agencia-do-usuario'

/**
 * Solicitar defesa — atendimento humano por um advogado.
 *
 * É a mesma escalada que já existia dentro do caso ("falar com um advogado"),
 * agora também como ação de primeira linha. A tela abre dizendo quantas defesas
 * o plano inclui no ano e quantas já foram utilizadas — e "utilizada" aqui
 * significa confirmada pelo advogado em /lawyer/defesas, não apenas pedida.
 */

interface Beneficio { icon: typeof UserCheck; text: string }

const BENEFITS: Beneficio[] = [
  { icon: UserCheck, text: 'Advogado especializado em direito do turismo, inscrito na OAB' },
  { icon: FileText,  text: 'O caso chega organizado, com a base legal já anexada' },
]

/** Prazo de 2h úteis é compromisso do Enterprise — não se promete a todos. */
const BENEFIT_SLA: Beneficio = { icon: Clock, text: 'Resposta humana em até 2h úteis' }

const STATUS_BADGE: Record<DefenseStatus, string> = {
  solicitada: 'badge-amber',
  utilizada:  'badge-success',
  descartada: 'badge-muted',
}

export default async function DefesaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Membro também pode solicitar defesa: a cota é da agência, não da pessoa.
  const agencyId = await getAgencyId(user!.id)

  const [{ data: recentCases }, { data: historico }] = await Promise.all([
    supabase
      .from('cases')
      .select('id, title, category, created_at, escalated_at')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
      .limit(5),
    // Histórico das solicitações. `error` é ignorado de propósito: se a
    // migration ainda não foi aplicada, a tela abre sem o histórico.
    supabase
      .from('defense_requests')
      .select('id, kind, status, subject, requested_at, used_at, consumes_quota')
      .eq('agency_id', agencyId)
      .order('requested_at', { ascending: false })
      .limit(5),
  ])

  const info = await loadDefenseInfo(supabase, agencyId)

  const beneficios = info.plan === 'enterprise' ? [...BENEFITS, BENEFIT_SLA] : BENEFITS

  const cases: DefesaCase[] = (recentCases ?? []).map(c => ({
    id:          c.id,
    title:       c.title ?? c.category,
    category:    c.category,
    created_at:  c.created_at,
    escalated:   !!c.escalated_at,
    whatsappUrl: whatsappLink(
      `Olá! Quero solicitar defesa para um caso: ${c.title ?? c.category} (categoria: ${c.category})`
    ),
  }))

  const genericUrl = whatsappLink(
    'Olá! Quero solicitar defesa para uma situação da minha agência.'
  )

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <Link
        href="/novo"
        className="inline-flex items-center gap-1.5 j-caption text-indigo hover:text-ink transition-colors no-underline mb-5"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar para as ações
      </Link>

      <div className="mb-6">
        <p className="j-overline">Atendimento humano</p>
        <h1 className="j-h1 mt-0.5">Solicitar defesa</h1>
        <p className="j-caption mt-1">
          Um advogado assume o caso e a conversa segue pelo WhatsApp.
        </p>
      </div>

      {/* Saldo do plano: inclusas no ano, utilizadas e em andamento */}
      <DefesaQuota info={info} />

      {/* Sem cota do período gratuito: bloqueia e oferece o plano */}
      {!info.canRequest ? (
        <div className="j-card border-coral-200 bg-coral-50">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-coral shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-coral-700">
                {info.state === 'expirada'
                  ? 'Seu período gratuito terminou.'
                  : `Você usou suas ${info.total} solicitações de defesa gratuitas.`}
              </p>
              <p className="j-caption mt-0.5">
                Assine um plano para continuar solicitando defesa.
              </p>
              <Link href="/assinar" className="btn btn-primary btn-sm no-underline mt-3 inline-flex">
                Ver planos
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="j-card">
          <ul className="space-y-2.5 list-none m-0 p-0 mb-5">
            {beneficios.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-2.5">
                <Icon className="w-4 h-4 text-coral shrink-0 mt-0.5" strokeWidth={1.9} />
                <span className="j-body text-ink-80">{text}</span>
              </li>
            ))}
          </ul>

          {genericUrl ? (
            <DefesaSolicitar href={genericUrl} info={info} />
          ) : (
            <p className="j-alert j-alert-warning">
              O canal de WhatsApp não está configurado. Fale com o suporte.
            </p>
          )}
        </div>
      )}

      {/* Casos já abertos: escalar um deles leva o contexto junto */}
      {cases.length > 0 && (
        <div className="j-card mt-4">
          <p className="j-label mb-1">Ou solicite defesa para um caso já aberto</p>
          <p className="j-caption mb-3">
            O advogado recebe o relato e a orientação já geradas para o caso.
          </p>
          <DefesaCaseList cases={cases} canEscalate={info.canRequest} />
        </div>
      )}

      {/* Histórico: o que o advogado marcou como utilizado é o que conta na cota */}
      {historico && historico.length > 0 && (
        <div className="j-card mt-4">
          <p className="j-label mb-1">Suas solicitações de defesa</p>
          <p className="j-caption mb-3">
            Uma defesa só desconta do plano quando o advogado confirma que foi utilizada.
          </p>
          <ul className="space-y-2 list-none m-0 p-0">
            {historico.map(d => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 bg-surface rounded-lg px-3.5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="j-body font-medium truncate">
                    {d.subject || DEFENSE_KIND_LABELS[d.kind as DefenseKind] || 'Defesa'}
                  </p>
                  <p className="j-caption truncate">
                    Solicitada em {formatDate(d.requested_at)}
                    {d.used_at ? ` · utilizada em ${formatDate(d.used_at)}` : ''}
                    {d.status === 'utilizada' && d.consumes_quota === false
                      ? ' · cobrada à parte'
                      : ''}
                  </p>
                </div>
                <span className={`badge ${STATUS_BADGE[d.status as DefenseStatus] ?? 'badge-muted'} shrink-0`}>
                  {DEFENSE_STATUS_LABELS[d.status as DefenseStatus] ?? d.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
