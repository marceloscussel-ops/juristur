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
import type { Agency, PaymentMethod } from '@/types'

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

// ─── Cobranças ────────────────────────────────────────────────────────────────

const successUrl = () => `${appUrl()}/assinar/sucesso`

/**
 * Campo `callback` (auto-redirect pós-pagamento). O Asaas valida que o domínio do
 * successUrl bata EXATAMENTE com o cadastrado nos dados comerciais da conta; um
 * mismatch derruba a criação da cobrança com "É necessário enviar uma URL que use
 * o mesmo domínio...". Como o redirect é só UX (o webhook é quem libera o acesso),
 * mantemos desligado por padrão. Religue com ASAAS_SEND_CALLBACK=true depois de
 * garantir que NEXT_PUBLIC_APP_URL == domínio cadastrado no Asaas.
 */
function callbackFields(): Record<string, unknown> {
  if (env('ASAAS_SEND_CALLBACK') !== 'true') return {}
  return { callback: { successUrl: successUrl(), autoRedirect: true } }
}

export interface CheckoutResult {
  invoiceUrl:      string
  subscriptionId?: string
  paymentId?:      string
}

/** Plano mensal: assinatura recorrente. Devolve a fatura da 1ª cobrança. */
export async function createMonthlySubscription(
  customerId: string, agencyId: string, method: PaymentMethod,
): Promise<CheckoutResult> {
  const plan = essentialPlan()
  const sub = await asaasFetch<{ id: string }>('/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      customer: customerId,
      billingType: toBillingType(method),
      value: plan.mensal,
      cycle: 'MONTHLY',
      nextDueDate: dueDate(0),
      externalReference: agencyId,
      description: `TurisGuard — Plano ${plan.nome} (mensal)`,
      ...callbackFields(),
    }),
  })

  const payments = await asaasFetch<{ data: { invoiceUrl: string }[] }>(
    `/subscriptions/${sub.id}/payments`,
  )
  const invoiceUrl = payments.data?.[0]?.invoiceUrl
  if (!invoiceUrl) throw new Error('Assinatura criada sem fatura inicial')

  return { invoiceUrl, subscriptionId: sub.id }
}

/** Plano anual no cartão: cobrança única parcelada em 12×. */
export async function createAnnualCardPayment(
  customerId: string, agencyId: string,
): Promise<CheckoutResult> {
  const plan = essentialPlan()
  const pay = await asaasFetch<{ id: string; invoiceUrl: string }>('/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer: customerId,
      billingType: 'CREDIT_CARD',
      installmentCount: 12,
      installmentValue: plan.anual,           // 12 × R$ 79
      dueDate: dueDate(0),
      externalReference: agencyId,
      description: `TurisGuard — Plano ${plan.nome} (anual, 12×)`,
      ...callbackFields(),
    }),
  })
  return { invoiceUrl: pay.invoiceUrl, paymentId: pay.id }
}

/** Cancela (deleta) uma assinatura no Asaas — não gera novas cobranças. */
export async function deleteSubscription(subscriptionId: string): Promise<void> {
  await asaasFetch(`/subscriptions/${subscriptionId}`, { method: 'DELETE' })
}

/** Plano anual no PIX/boleto: cobrança única à vista (R$ 948). */
export async function createAnnualUpfrontPayment(
  customerId: string, agencyId: string, method: 'pix' | 'boleto',
): Promise<CheckoutResult> {
  const plan = essentialPlan()
  const total = plan.anual * 12                // R$ 948 à vista
  const pay = await asaasFetch<{ id: string; invoiceUrl: string }>('/payments', {
    method: 'POST',
    body: JSON.stringify({
      customer: customerId,
      billingType: toBillingType(method),
      value: total,
      dueDate: dueDate(method === 'boleto' ? 3 : 0),
      externalReference: agencyId,
      description: `TurisGuard — Plano ${plan.nome} (anual, à vista)`,
      ...callbackFields(),
    }),
  })
  return { invoiceUrl: pay.invoiceUrl, paymentId: pay.id }
}
