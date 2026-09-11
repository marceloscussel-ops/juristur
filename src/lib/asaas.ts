/**
 * asaas.ts — Client fino da API do Asaas (cobrança).
 *
 * Ambiente controlado por ASAAS_API_URL (default: sandbox). Auth via header
 * `access_token`. Reusa env() (protege contra BOM em vars do Vercel/PowerShell).
 *
 * Modelo de cobrança (decidido no plano):
 *   - Mensal (R$ 99/mês) → assinatura recorrente (/subscriptions, ciclo MONTHLY).
 *   - Anual  (R$ 948/ano) → cobrança avulsa (/payments):
 *       · Cartão → parcelado 12× de R$ 79 (recebível garantido).
 *       · PIX/Boleto → à vista R$ 948 (nunca parcelado).
 */

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { PLANS, type PlanDef } from '@/lib/plans'
import type { Agency, PaymentMethod, BillingCycle } from '@/types'

const DEFAULT_API_URL = 'https://api-sandbox.asaas.com/v3'

function apiBase(): string {
  return env('ASAAS_API_URL') || DEFAULT_API_URL
}

export function serviceClient() {
  return createServiceClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
}

function appUrl(): string {
  return env('NEXT_PUBLIC_APP_URL') || 'https://www.turisguard.com'
}

/** Mapeia a forma de pagamento da nossa UI para o billingType do Asaas. */
export function toBillingType(method: PaymentMethod): 'CREDIT_CARD' | 'PIX' | 'BOLETO' {
  if (method === 'card') return 'CREDIT_CARD'
  if (method === 'pix')  return 'PIX'
  return 'BOLETO'
}

/** Plano Essential (único ativo). Fonte única dos valores. */
function essentialPlan(): PlanDef {
  const p = PLANS.find(p => p.id === 'essencial')
  if (!p) throw new Error('Plano essencial não configurado em plans.ts')
  return p
}

interface AsaasError { errors?: { code?: string; description?: string }[] }

async function asaasFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const key = env('ASAAS_API_KEY')
  if (!key) throw new Error('ASAAS_API_KEY ausente')

  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      access_token: key,
      ...(init?.headers ?? {}),
    },
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = (body as AsaasError).errors?.[0]?.description || `Asaas ${res.status}`
    throw new Error(msg)
  }
  return body as T
}

/** Data de hoje (America/Sao_Paulo) no formato YYYY-MM-DD exigido pelo Asaas. */
function dueDate(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000)
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) // en-CA => YYYY-MM-DD
}

// ─── Customer ─────────────────────────────────────────────────────────────────

type AgencyForBilling = Pick<
  Agency,
  'id' | 'name' | 'cnpj' | 'email' | 'phone' | 'asaas_customer_id'
>

/**
 * Garante um cliente Asaas para a agência. Cria na primeira vez e persiste o id.
 * `cpfCnpj` usa o CNPJ da agência (só dígitos) — o Asaas valida.
 */
export async function ensureCustomer(agency: AgencyForBilling): Promise<string> {
  if (agency.asaas_customer_id) return agency.asaas_customer_id

  const created = await asaasFetch<{ id: string }>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: agency.name,
      cpfCnpj: (agency.cnpj ?? '').replace(/\D/g, ''),
      email: agency.email,
      mobilePhone: agency.phone ?? undefined,
      externalReference: agency.id,
      notificationDisabled: false,
    }),
  })

  await serviceClient()
    .from('agencies')
    .update({ asaas_customer_id: created.id })
    .eq('id', agency.id)

  return created.id
}

// ─── Checkout (Asaas Checkout) ─────────────────────────────────────────────────
// A cobrança nasce SÓ quando o cliente paga na página hospedada — se abandonar,
// nada é criado (sem vencimento, sem régua de cobrança, sem risco de emitir NF
// sem pagamento). A página coleta os dados do pagador (nome, CPF, endereço,
// cartão), então NÃO enviamos `customer`. Reconciliação: externalReference =
// id da agência, e o checkoutId guardado na agência (ver webhook).

export interface CheckoutResult {
  checkoutUrl: string
  checkoutId:  string
}

/** Dados do pagador para pré-carregar o checkout — o Asaas exige TODOS juntos. */
export interface AsaasCustomerData {
  name:          string
  cpfCnpj:       string
  email:         string
  phone:         string   // 11 dígitos, sem DDI
  address:       string   // logradouro
  addressNumber: string
  postalCode:    string   // CEP
  province:      string   // bairro
  city?:         string
}

/**
 * Cria uma sessão de checkout conforme o plano e a forma de pagamento.
 *   - mensal        → RECURRENT (assinatura; recorrência no Asaas Checkout exige cartão)
 *   - anual + card  → DETACHED+INSTALLMENT (até 12×; INSTALLMENT exige DETACHED junto)
 *   - anual + pix   → DETACHED à vista (exige chave PIX cadastrada na conta Asaas)
 *
 * `customerData` (opcional) pré-carrega os dados do pagador na página do Asaas.
 * Só é enviado quando temos o pacote COMPLETO (o Asaas recusa dados parciais);
 * sem ele, a página coleta tudo normalmente.
 */
export async function createCheckout(
  agencyId: string, cycle: BillingCycle, method: 'card' | 'pix',
  customerData?: AsaasCustomerData,
): Promise<CheckoutResult> {
  const plan = essentialPlan()
  const base = {
    externalReference: agencyId,
    minutesToExpire: 60,
    callback: {
      successUrl: `${appUrl()}/assinar/sucesso`,
      cancelUrl:  `${appUrl()}/assinar`,
      expiredUrl: `${appUrl()}/assinar`,
    },
    ...(customerData ? { customerData } : {}),
  }

  let payload: Record<string, unknown>
  if (cycle === 'mensal' && method === 'card') {
    // Mensal no cartão: assinatura recorrente (renova automático).
    payload = {
      ...base,
      billingTypes: ['CREDIT_CARD'],
      chargeTypes: ['RECURRENT'],
      items: [{ name: `TurisGuard ${plan.nome}`, quantity: 1, value: plan.mensal }],
      subscription: { cycle: 'MONTHLY', nextDueDate: dueDate(0) },
    }
  } else if (cycle === 'mensal') {
    // Mensal no PIX: cobrança avulsa de 1 mês (recorrência por PIX não existe no
    // checkout do Asaas; o cliente paga um PIX a cada mês).
    payload = {
      ...base,
      billingTypes: ['PIX'],
      chargeTypes: ['DETACHED'],
      items: [{ name: `TurisGuard ${plan.nome} (1 mês)`, quantity: 1, value: plan.mensal }],
    }
  } else if (method === 'card') {
    payload = {
      ...base,
      billingTypes: ['CREDIT_CARD'],
      chargeTypes: ['DETACHED', 'INSTALLMENT'],
      items: [{ name: `TurisGuard ${plan.nome} (anual)`, quantity: 1, value: plan.anual * 12 }],
      installment: { maxInstallmentCount: 12 },
    }
  } else {
    payload = {
      ...base,
      billingTypes: ['PIX'],
      chargeTypes: ['DETACHED'],
      items: [{ name: `TurisGuard ${plan.nome} (anual)`, quantity: 1, value: plan.anual * 12 }],
    }
  }

  const post = (b: Record<string, unknown>) =>
    asaasFetch<{ id: string; link: string }>('/checkouts', { method: 'POST', body: JSON.stringify(b) })

  let res: { id: string; link: string }
  try {
    res = await post(payload)
  } catch (err) {
    // Pré-carregamento é best-effort: se o Asaas recusar o customerData (telefone/
    // endereço inválido), refaz sem ele — a página coleta os dados normalmente.
    if (customerData) {
      console.warn('[asaas] checkout com customerData falhou, refazendo sem:', err instanceof Error ? err.message : err)
      const semDados = { ...payload }
      delete semDados.customerData
      res = await post(semDados)
    } else {
      throw err
    }
  }
  return { checkoutUrl: res.link, checkoutId: res.id }
}

export interface CheckoutInfo {
  status?:            string
  externalReference?: string | null
  customer?:          string | null
  subscription?:      string | null
  installment?:       string | null
}

/** Lê uma sessão de checkout — após paga, expõe customer/subscription/installment. */
export async function getCheckout(checkoutId: string): Promise<CheckoutInfo> {
  return asaasFetch<CheckoutInfo>(`/checkouts/${checkoutId}`)
}

/** Cancela (deleta) uma assinatura no Asaas — não gera novas cobranças. */
export async function deleteSubscription(subscriptionId: string): Promise<void> {
  await asaasFetch(`/subscriptions/${subscriptionId}`, { method: 'DELETE' })
}
