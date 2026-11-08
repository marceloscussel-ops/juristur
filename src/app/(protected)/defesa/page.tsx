import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getTrialInfo, getEscalationInfo } from '@/lib/plans'
import { whatsappLink } from '@/lib/whatsapp/public-number'
import DefesaCaseList, { type DefesaCase } from '@/components/DefesaCaseList'
import EscalateButton from '@/components/EscalateButton'
import { ArrowLeft, AlertTriangle, Clock, FileText, UserCheck } from 'lucide-react'
import { getAgencyId } from '@/lib/agencia-do-usuario'

/**
 * Solicitar defesa — atendimento humano por um advogado.
 *
 * É a mesma escalada que já existia dentro do caso ("falar com um advogado"),
 * agora também como ação de primeira linha. No plano Essential o fluxo é o
 * mesmo: a conversa segue pelo WhatsApp e a cota do período gratuito vale.
 */

const BENEFITS = [
  { icon: UserCheck, text: 'Advogado especializado em direito do turismo, inscrito na OAB' },
  { icon: FileText,  text: 'O caso chega organizado, com a base legal já anexada' },
  { icon: Clock,     text: 'Resposta humana em até 2h úteis' },
]

export default async function DefesaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Membro também pode solicitar defesa: a cota é da agência.
  const agencyId = await getAgencyId(user!.id)

  const [{ data: agency }, { data: recentCases }, { count: escalationsUsed }] = await Promise.all([
    supabase
      .from('agencies')
      .select('subscription_status, trial_ends_at, created_at, access_until')
      .eq('id', agencyId)
      .maybeSingle(),
    supabase
      .from('cases')
      .select('id, title, category, created_at, escalated_at')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', agencyId)
      .not('escalated_at', 'is', null),
  ])

  const trial = getTrialInfo(agency ?? {})
  const info  = getEscalationInfo(trial, escalationsUsed ?? 0)

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

      {/* Sem cota: bloqueia e oferece o plano */}
      {!info.canEscalate ? (
        <div className="j-card border-coral-200 bg-coral-50">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-coral shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-coral-700">
                {info.reason === 'trial_expired'
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
            {BENEFITS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-2.5">
                <Icon className="w-4 h-4 text-coral shrink-0 mt-0.5" strokeWidth={1.9} />
                <span className="j-body text-ink-80">{text}</span>
              </li>
            ))}
          </ul>

          {genericUrl ? (
            <EscalateButton href={genericUrl} variant="primary" />
          ) : (
            <p className="j-alert j-alert-warning">
              O canal de WhatsApp não está configurado. Fale com o suporte.
            </p>
          )}

          {info.total !== null && (
            <p className="j-caption mt-2 text-center">
              {info.remaining} de {info.total} solicitações gratuitas restantes
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
          <DefesaCaseList cases={cases} canEscalate={info.canEscalate} />
        </div>
      )}
    </div>
  )
}
