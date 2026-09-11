'use client'

import { useState, useEffect } from 'react'
import { Check, X, Sparkles, CreditCard, QrCode, Loader2, AlertCircle, Gift } from 'lucide-react'
import { PLANS, type PlanDef } from '@/lib/plans'
import { UNAV_PROMO_MESES } from '@/lib/promo'
import { formatCpfCnpj, isValidCpfCnpj } from '@/lib/document'
import type { PaymentMethod } from '@/types'

type Billing = 'mensal' | 'anual'

export default function PlansClient({
  whatsapp, promoUnav = false, documentoPendente = false, enderecoPendente = false,
}: { whatsapp: string; promoUnav?: boolean; documentoPendente?: boolean; enderecoPendente?: boolean }) {
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
          const nota  = billing === 'anual'
            ? promoUnav
              ? `cobrado anualmente · ${UNAV_PROMO_MESES} meses de acesso`
              : 'cobrado anualmente · economize 20%'
            : 'no plano mensal'
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
        <SubscribeModal
          plan={modalPlan}
          billing={billing}
          whatsapp={whatsapp}
          promoUnav={promoUnav}
          documentoPendente={documentoPendente}
          enderecoPendente={enderecoPendente}
          onClose={() => setModalPlan(null)}
        />
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

interface MethodOption {
  id:    PaymentMethod
  label: string
  desc:  string
  icon:  React.ReactNode
}

interface CepInfo { logradouro: string; bairro: string; cidade: string; uf: string }

function SubscribeModal({
  plan, billing, whatsapp, promoUnav, documentoPendente, enderecoPendente, onClose,
}: {
  plan: PlanDef; billing: Billing; whatsapp: string
  promoUnav: boolean; documentoPendente: boolean; enderecoPendente: boolean; onClose: () => void
}) {
  const [method, setMethod]   = useState<PaymentMethod>('card')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<React.ReactNode>('')
  // Documento pedido aqui quando falta, para não interromper o pagamento.
  const [pedirDoc, setPedirDoc] = useState(documentoPendente)
  const [doc, setDoc]           = useState('')
  const [docErro, setDocErro]   = useState('')
  // Endereço pedido aqui quando falta, para pré-carregar o checkout do Asaas.
  const [cep, setCep]           = useState('')
  const [numero, setNumero]     = useState('')
  const [cepInfo, setCepInfo]   = useState<CepInfo | null>(null)
  const [cepErro, setCepErro]   = useState('')
  const [cepLoading, setCepLoading] = useState(false)

  // Busca o endereço pelo CEP (ViaCEP) quando completa os 8 dígitos.
  async function buscarCep(valor: string) {
    const d = valor.replace(/\D/g, '')
    setCepInfo(null)
    setCepErro('')
    if (d.length !== 8) return
    setCepLoading(true)
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`)
      const j = await r.json()
      if (j.erro) { setCepErro('CEP não encontrado.'); return }
      setCepInfo({ logradouro: j.logradouro ?? '', bairro: j.bairro ?? '', cidade: j.localidade ?? '', uf: j.uf ?? '' })
    } catch {
      setCepErro('Não foi possível buscar o CEP.')
    } finally {
      setCepLoading(false)
    }
  }

  // Ao voltar do Asaas pelo botão do navegador, a página é restaurada do bfcache
  // com o estado congelado (botão preso em "Iniciando…"). Reseta nesse caso.
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) { setLoading(false); setError('') }
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  const anualTotal = plan.anual * 12 // R$ 948

  // Mensal é assinatura recorrente → só cartão. Anual aceita cartão (12×) ou PIX à vista.
  const options: MethodOption[] = billing === 'anual'
    ? [
        { id: 'card', label: 'Cartão de crédito', desc: `12× de R$ ${plan.anual} (total R$ ${anualTotal})`, icon: <CreditCard className="w-5 h-5" /> },
        { id: 'pix',  label: 'PIX',               desc: `R$ ${anualTotal} à vista`,                          icon: <QrCode className="w-5 h-5" /> },
      ]
    : [
        { id: 'card', label: 'Cartão de crédito', desc: `R$ ${plan.mensal}/mês · renova automático`, icon: <CreditCard className="w-5 h-5" /> },
      ]

  async function handleContinue() {
    setError('')
    setDocErro('')

    // Validação local antes de ir ao servidor, para o erro aparecer no campo.
    if (pedirDoc) {
      if (!doc.trim()) {
        setDocErro('Informe o CPF ou CNPJ da agência.')
        return
      }
      if (!isValidCpfCnpj(doc)) {
        setDocErro('CPF ou CNPJ inválido. Confira os números digitados.')
        return
      }
    }
    if (enderecoPendente) {
      if (cep.replace(/\D/g, '').length !== 8 || !cepInfo) {
        setCepErro('Informe um CEP válido.')
        return
      }
      if (!numero.trim()) {
        setCepErro('Informe o número do endereço.')
        return
      }
    }

    setLoading(true)
    try {
      const res  = await fetch('/api/billing/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          cycle:  billing,
          method,
          ...(pedirDoc ? { cnpj: doc.replace(/\D/g, '') } : {}),
          ...(enderecoPendente && cepInfo ? {
            address: {
              cep:        cep.replace(/\D/g, ''),
              numero:     numero.trim(),
              logradouro: cepInfo.logradouro,
              bairro:     cepInfo.bairro,
              cidade:     cepInfo.cidade,
            },
          } : {}),
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        // O servidor é a autoridade sobre o documento: se pedir, mostra o campo.
        if (data.code === 'cnpj_required' || data.code === 'cnpj_invalid') {
          setPedirDoc(true)
          setDocErro(data.error || 'Informe um CPF ou CNPJ válido.')
        } else {
          setError(data.error || 'Não foi possível iniciar o pagamento.')
        }
        setLoading(false)
        return
      }

      // Redireciona para a fatura hospedada do Asaas.
      window.location.href = data.invoiceUrl
    } catch {
      setError('Erro de conexão. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="j-card max-w-[420px] w-full relative animate-fade-up"
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

        <h3 className="j-h2">Assinar {plan.nome}</h3>
        <p className="j-caption mt-1">
          {billing === 'anual'
            ? 'Plano anual — escolha como quer pagar.'
            : 'Plano mensal — cobrança recorrente no cartão.'}
        </p>

        {billing === 'anual' && promoUnav && (
          <div className="mt-3 rounded-lg border border-indigo/30 bg-indigo-50/60 px-3 py-2 flex items-center gap-2">
            <Gift className="w-4 h-4 text-indigo shrink-0" />
            <span className="text-[13px] text-ink-80">
              Promoção UNAV: <strong>{UNAV_PROMO_MESES} meses de acesso</strong> pelo preço de 12.
            </span>
          </div>
        )}

        {pedirDoc && (
          <div className="mt-5">
            <label className="j-label" htmlFor="doc-cobranca">
              CPF ou CNPJ da agência
            </label>
            <input
              id="doc-cobranca"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={doc}
              onChange={e => { setDoc(formatCpfCnpj(e.target.value)); setDocErro('') }}
              disabled={loading}
              className={`j-input font-mono ${docErro ? 'j-input-error' : ''}`}
              placeholder="00.000.000/0000-00"
            />
            <p className={`j-hint ${docErro ? 'j-hint-error' : ''}`}>
              {docErro || 'Necessário para emitir a cobrança. Fica salvo no seu perfil.'}
            </p>
          </div>
        )}

        {enderecoPendente && (
          <div className="mt-5">
            <label className="j-label">Endereço de cobrança</label>
            <div className="flex gap-2">
              <input
                type="text" inputMode="numeric" autoComplete="postal-code"
                value={cep}
                onChange={e => {
                  const d = e.target.value.replace(/\D/g, '').slice(0, 8)
                  setCep(d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d)
                  if (d.length === 8) buscarCep(d)
                }}
                disabled={loading}
                className={`j-input font-mono w-[45%] ${cepErro ? 'j-input-error' : ''}`}
                placeholder="CEP"
              />
              <input
                type="text" inputMode="numeric"
                value={numero}
                onChange={e => { setNumero(e.target.value); setCepErro('') }}
                disabled={loading}
                className="j-input flex-1"
                placeholder="Número"
              />
            </div>
            <p className={`j-hint ${cepErro ? 'j-hint-error' : ''}`}>
              {cepErro
                || (cepLoading ? 'Buscando endereço…'
                  : cepInfo ? `${cepInfo.logradouro ? cepInfo.logradouro + ', ' : ''}${cepInfo.bairro ? cepInfo.bairro + ' — ' : ''}${cepInfo.cidade}/${cepInfo.uf}`
                  : 'Para não redigitar seus dados na próxima tela. Fica salvo no seu perfil.')}
            </p>
          </div>
        )}

        <div className="mt-5 space-y-2.5">
          {options.map(opt => {
            const active = method === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMethod(opt.id)}
                className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                  active
                    ? 'border-indigo bg-indigo-50 text-ink'
                    : 'border-[rgba(13,13,26,0.1)] hover:border-indigo/50'
                }`}
              >
                <span className={active ? 'text-indigo' : 'text-ink-40'}>{opt.icon}</span>
                <span className="flex-1">
                  <span className="block j-body font-medium">{opt.label}</span>
                  <span className="block j-caption">{opt.desc}</span>
                </span>
                <span
                  className={`w-4 h-4 rounded-full border-2 shrink-0 ${
                    active ? 'border-indigo bg-indigo' : 'border-ink-40'
                  }`}
                />
              </button>
            )
          })}
        </div>

        {error && (
          <div className="j-alert j-alert-danger mt-4">
            <AlertCircle className="w-4 h-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleContinue}
          disabled={loading}
          className="btn btn-primary w-full mt-5"
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Iniciando…</>
            : 'Continuar para pagamento'}
        </button>

        <p className="j-caption text-center mt-3">
          Pagamento processado com segurança pelo Asaas.
          {whatsapp && (
            <>
              {' '}Dúvidas?{' '}
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Fale no WhatsApp
              </a>.
            </>
          )}
        </p>
      </div>
    </div>
  )
}
