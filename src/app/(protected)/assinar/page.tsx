import { createClient } from '@/lib/supabase/server'
import PlansClient from '@/components/PlansClient'
import { getTrialInfo, PLAN_LABELS } from '@/lib/plans'
import { isUnavPromoEligible, UNAV_PROMO_MESES, UNAV_PROMO } from '@/lib/promo'
import { isValidCpfCnpj } from '@/lib/document'
import type { AgencyPlan } from '@/types'
import { CheckCircle2, Gift } from 'lucide-react'

export default async function AssinarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: agency } = await supabase
    .from('agencies')
    .select('plan, subscription_status, trial_ends_at, created_at, access_until, origem_campanha, cnpj')
    .eq('id', user!.id)
    .single()

  const trial = agency ? getTrialInfo(agency) : null
  // Cadastrou-se pelo link do evento dentro do prazo → 14 meses no plano anual.
  const promoUnav = isUnavPromoEligible(agency)
  // O CPF/CNPJ não é pedido no cadastro: quando faltar, é coletado no próprio
  // modal de pagamento, sem mandar a agência ao perfil no meio do fluxo.
  const documentoPendente = !isValidCpfCnpj(agency?.cnpj)
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? ''

  const statusLine = (() => {
    if (!trial) return 'Escolha o plano ideal para a sua agência.'
    if (trial.isActive)  return `Você é assinante do plano ${PLAN_LABELS[(agency!.plan as AgencyPlan)] ?? ''}.`
    if (trial.isExpired) return 'Seu período gratuito terminou. Assine para voltar a usar o TurisGuard.'
    const dias = trial.daysLeft === 1 ? 'falta 1 dia' : `faltam ${trial.daysLeft} dias`
    return `Você está no período gratuito — ${dias}. Assine para não perder o acesso.`
  })()

  return (
    <div className="animate-fade-in">
      <div className="text-center max-w-xl mx-auto mb-8">
        <p className="j-overline">Assinatura</p>
        <h1 className="j-h1 mt-1">Escolha seu plano</h1>
        <p className="j-body text-ink-80 mt-2">{statusLine}</p>
      </div>

      {/* Promoção do evento — só aparece para quem tem direito */}
      {promoUnav && !trial?.isActive && (
        <div className="max-w-xl mx-auto mb-6 rounded-xl border border-indigo/30 bg-indigo-50/60 p-4 flex items-start gap-3">
          <Gift className="w-5 h-5 text-indigo shrink-0 mt-0.5" />
          <div>
            <p className="text-[15px] font-bold text-ink mb-0.5">
              Você tem {UNAV_PROMO.mesesBonus} meses extras no plano anual
            </p>
            <p className="j-body text-ink-80">
              Cortesia do evento UNAV 2026: ao assinar o plano anual, sua agência
              recebe <strong>{UNAV_PROMO_MESES} meses de acesso pelo preço de {12}</strong>.
              O bônus é aplicado automaticamente na confirmação do pagamento.
            </p>
          </div>
        </div>
      )}

      {trial?.isActive ? (
        <div className="j-card max-w-md mx-auto text-center py-10">
          <CheckCircle2 className="w-10 h-10 text-teal mx-auto mb-3" />
          <h2 className="j-h3">Assinatura ativa</h2>
          <p className="j-caption mt-1">Sua agência já tem acesso completo. Obrigado por confiar no TurisGuard!</p>
        </div>
      ) : (
        <PlansClient whatsapp={whatsapp} promoUnav={promoUnav} documentoPendente={documentoPendente} />
      )}

      <p className="text-center j-caption mt-8">
        Dúvidas sobre os planos? Fale com a gente pelo WhatsApp.
      </p>
    </div>
  )
}
