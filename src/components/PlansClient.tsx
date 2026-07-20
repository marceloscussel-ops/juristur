'use client'

import { useState } from 'react'
import { Check, X, MessageCircle, Sparkles } from 'lucide-react'
import { PLANS, type PlanDef } from '@/lib/plans'

type Billing = 'mensal' | 'anual'

export default function PlansClient({ whatsapp }: { whatsapp: string }) {
  const [billing, setBilling] = useState<Billing>('anual')
  const [modalPlan, setModalPlan] = useState<PlanDef | null>(null)

  return (
    <>
      {/* Toggle mensal / anual */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center gap-1 p-1 rounded-pill bg-ink-15">
          <Toggle active={billing === 'mensal'} onClick={() => setBilling('mensal')}>
            Mensal
          </Toggle>
          <Toggle active={billing === 'anual'} onClick={() => setBilling('anual')}>
            Anual <span className="text-teal font-semibold">−20%</span>
          </Toggle>
        </div>
      </div>

      {/* Grade de planos */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 items-stretch">
        {PLANS.map(plan => {
          const preco = billing === 'anual' ? plan.anual : plan.mensal
          const nota  = billing === 'anual' ? 'cobrado anualmente · economize 20%' : 'no plano mensal'
          return (
            <div
              key={plan.id}
              className={`relative rounded-xl bg-white p-6 flex flex-col ${
                plan.ativo
                  ? 'border-2 border-indigo shadow-card'
                  : 'border border-[rgba(13,13,26,0.07)] opacity-70'
              }`}
            >
              <span
                className={`absolute -top-3 left-1/2 -translate-x-1/2 rounded-pill px-3 py-1 text-[11px] font-semibold uppercase tracking-wide font-mono whitespace-nowrap ${
                  plan.ativo
                    ? 'bg-indigo text-white'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {plan.ativo ? 'Disponível agora' : 'Em breve'}
              </span>

              <h3 className="j-h3 mt-2">{plan.nome}</h3>
              <p className="j-caption min-h-[38px] mt-1">{plan.tagline}</p>

              {plan.ativo ? (
                <>
                  <div className="flex items-baseline gap-1 mt-3">
                    <span className="font-display font-extrabold text-[38px] tracking-tight text-ink">R$ {preco}</span>
                    <span className="j-caption">/mês</span>
                  </div>
                  <p className="text-[12px] text-ink-40 mb-5">{nota}</p>

                  <button
                    type="button"
                    onClick={() => setModalPlan(plan)}
                    className="w-full btn btn-primary"
                  >
                    Assinar {plan.nome}
                  </button>

                  <ul className="mt-5 space-y-2.5 list-none p-0 m-0">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-[13.5px] text-ink-80">
                        <Check className="w-4 h-4 text-teal shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-1.5 py-8">
                  <span className="font-display font-bold text-[18px] text-ink-40">Em breve</span>
                  <p className="j-caption max-w-[200px]">Valores e recursos serão divulgados em breve.</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {modalPlan && (
        <SubscribeModal plan={modalPlan} billing={billing} whatsapp={whatsapp} onClose={() => setModalPlan(null)} />
      )}
    </>
  )
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-pill px-4 py-1.5 text-[13px] font-medium transition-colors ${
        active ? 'bg-white text-ink shadow-sm' : 'text-ink-40 hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

function SubscribeModal({
  plan, billing, whatsapp, onClose,
}: { plan: PlanDef; billing: Billing; whatsapp: string; onClose: () => void }) {
  const preco = billing === 'anual' ? plan.anual : plan.mensal
  const msg = encodeURIComponent(
    `Olá! Quero assinar o plano ${plan.nome} do TurisGuard (R$ ${preco}/mês, cobrança ${billing}).`
  )
  const waLink = `https://wa.me/${whatsapp}?text=${msg}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="j-card max-w-[400px] w-full relative animate-fade-up"
        onClick={e => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-40 hover:text-ink transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
          <Sparkles className="w-6 h-6 text-indigo" />
        </div>

        <h3 className="j-h2">Pagamento chegando em breve</h3>
        <p className="j-body text-ink-80 mt-2">
          Estamos finalizando a ativação de pagamentos online. Para garantir o plano{' '}
          <strong>{plan.nome}</strong> (R$ {preco}/mês) agora, fale com a gente no WhatsApp — ativamos
          sua conta manualmente sem custo adicional.
        </p>

        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary w-full no-underline mt-5"
        >
          <MessageCircle className="w-4 h-4" />
          Falar no WhatsApp
        </a>
        <button type="button" onClick={onClose} className="btn btn-outline w-full mt-2">
          Agora não
        </button>
      </div>
    </div>
  )
}
