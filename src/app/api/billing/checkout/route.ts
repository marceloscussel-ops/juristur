/**
 * POST /api/billing/checkout
 *
 * Cria uma SESSÃO de checkout no Asaas (Asaas Checkout) e devolve a URL para o
 * front redirecionar. A cobrança só nasce quando o cliente paga na página do
 * Asaas — abandono não gera cobrança. A ativação do acesso acontece no webhook
 * (CHECKOUT_PAID); aqui só guardamos o checkoutId e o ciclo escolhido.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckout, serviceClient, type AsaasCustomerData } from '@/lib/asaas'
import { hasActiveAccess } from '@/lib/plans'
import { isValidCpfCnpj } from '@/lib/document'
import { isUnavPromoEligible } from '@/lib/promo'
import {
  dadosDoCliente, enderecoDaAgencia, jaAssinouAntes, planoPago, registrarAceite,
} from '@/lib/contrato/aceite'
import { exigirTitular } from '@/lib/titular'
import type { BillingCycle } from '@/types'

export const maxDuration = 30

const CYCLES:  BillingCycle[] = ['mensal', 'anual']
// Boleto saiu: o Asaas Checkout suporta só cartão e PIX. Mensal só no cartão
// (recorrência no checkout exige cartão); PIX fica no anual à vista.
const METHODS = ['card', 'pix'] as const
type Method = (typeof METHODS)[number]

/** Documento válido = CPF ou CNPJ com dígitos verificadores corretos. */
function hasValidCnpj(cnpj?: string | null): boolean {
  return isValidCpfCnpj(cnpj)
}

/** Telefone BR para o Asaas: 10–11 dígitos sem DDI. null se inválido. */
function brPhone(stored?: string | null): string | null {
  let d = (stored ?? '').replace(/\D/g, '')
  if (d.startsWith('55') && d.length >= 12) d = d.slice(2)
  return d.length === 10 || d.length === 11 ? d : null
}

export async function POST(request: NextRequest) {
  try {
    // Contratar e trocar de plano é do titular: a cobrança sai no nome dele e o
    // plano vale para a agência toda. Um membro assinando criaria uma segunda
    // contratação para uma conta que já tem a sua.
    const porteiro = await exigirTitular(
      'Só o titular da conta pode assinar ou trocar o plano. Fale com ele.',
    )
    if ('erro' in porteiro) return porteiro.erro

    const { agencyId } = porteiro
    const supabase = await createClient()

    const { cycle, method, cnpj, address, aceiteContrato } = await request.json()
    if (!CYCLES.includes(cycle) || !METHODS.includes(method)) {
      return NextResponse.json({ error: 'Plano ou forma de pagamento inválidos.' }, { status: 400 })
    }

    // Aceite do contrato com o Anexo I desta contratação (plano, modalidade,
    // valor, forma de pagamento). Sem ele não se emite cobrança.
    if (aceiteContrato !== true) {
      return NextResponse.json(
        { error: 'É preciso aceitar o contrato para assinar o plano.', code: 'aceite_required' },
        { status: 422 },
      )
    }
    // Mensal: cartão = assinatura recorrente; PIX = cobrança avulsa de 1 mês.

    const { data: agency, error } = await supabase
      .from('agencies')
      .select('id, name, cnpj, email, phone, subscription_status, access_until, cep, endereco, endereco_numero, bairro, cidade, origem_campanha, created_at')
      .eq('id', agencyId)
      .single()

    if (error || !agency) {
      return NextResponse.json({ error: 'Agência não encontrada.' }, { status: 404 })
    }

    if (hasActiveAccess(agency)) {
      return NextResponse.json({ error: 'Sua assinatura já está ativa.' }, { status: 409 })
    }

    // O CPF/CNPJ não é pedido no cadastro (atrito alto) e o Asaas o exige. Em vez
    // de mandar a agência ao perfil no meio do pagamento, ele é informado no
    // próprio modal e gravado aqui, na mesma requisição.
    let documento = agency.cnpj
    if (!hasValidCnpj(documento)) {
      const informado = String(cnpj ?? '').replace(/\D/g, '')

      if (!informado) {
        return NextResponse.json(
          { error: 'Informe o CPF ou CNPJ da agência para emitir a cobrança.', code: 'cnpj_required' },
          { status: 422 },
        )
      }
      if (!hasValidCnpj(informado)) {
        return NextResponse.json(
          { error: 'CPF ou CNPJ inválido. Confira os números digitados.', code: 'cnpj_invalid' },
          { status: 422 },
        )
      }

      const { error: docError } = await serviceClient()
        .from('agencies')
        .update({ cnpj: informado })
        .eq('id', agency.id)

      if (docError) {
        console.error('[billing/checkout] falha ao gravar documento:', docError.message)
        return NextResponse.json({ error: 'Não foi possível salvar o documento.' }, { status: 500 })
      }
      documento = informado
    }

    // Endereço para PRÉ-CARREGAR o checkout (o Asaas exige o pacote completo).
    // Usa o que já está no cadastro; se o modal enviou um novo (CEP resolvido +
    // número), grava. É best-effort: sem endereço completo, a página do Asaas
    // coleta os dados normalmente — nunca bloqueia o pagamento.
    let cep      = (agency.cep ?? '').replace(/\D/g, '')
    let endereco = agency.endereco ?? ''
    let numero   = agency.endereco_numero ?? ''
    let bairro   = agency.bairro ?? ''
    let cidade   = agency.cidade ?? ''
    const enderecoOk = () => cep.length === 8 && !!endereco.trim() && !!numero.trim() && !!bairro.trim()

    if (!enderecoOk() && address) {
      cep      = String(address.cep ?? '').replace(/\D/g, '')
      endereco = String(address.logradouro ?? '').trim()
      numero   = String(address.numero ?? '').trim()
      bairro   = String(address.bairro ?? '').trim()
      cidade   = String(address.cidade ?? '').trim()
      if (enderecoOk()) {
        await serviceClient()
          .from('agencies')
          .update({ cep, endereco, endereco_numero: numero, bairro, cidade })
          .eq('id', agency.id)
      }
    }

    // Monta o customerData só quando temos tudo (Asaas recusa dados parciais).
    const phone = brPhone(agency.phone)
    let customerData: AsaasCustomerData | undefined
    if (phone && enderecoOk()) {
      customerData = {
        name: agency.name, cpfCnpj: documento, email: agency.email, phone,
        address: endereco, addressNumber: numero, postalCode: cep, province: bairro,
        ...(cidade ? { city: cidade } : {}),
      }
    }

    const result = await createCheckout(agency.id, cycle, method as Method, customerData)

    // Guarda o checkoutId + ciclo para reconciliar no webhook (CHECKOUT_PAID).
    // Status segue 'trial' até o pagamento ser confirmado.
    await serviceClient()
      .from('agencies')
      .update({
        plan: 'essencial',
        billing_cycle: cycle,
        asaas_checkout_id: result.checkoutId,
      })
      .eq('id', agency.id)

    // Registra o aceite desta contratação. Depois do checkout criado para o
    // Anexo I refletir o que foi efetivamente enviado à cobrança; antes do
    // pagamento porque o que se registra é o ato de aceitar, não o pagamento
    // (a ativação do acesso continua sendo do webhook).
    const { ip, userAgent } = dadosDoCliente(request)
    await registrarAceite({
      agencyId: agency.id,
      evento:   (await jaAssinouAntes(agency.id)) ? 'renovacao' : 'assinatura',
      agencia: {
        nome:      agency.name,
        documento: documento,
        email:     agency.email,
        telefone:  agency.phone,
        endereco:  enderecoDaAgencia({ cep, endereco, endereco_numero: numero, bairro, cidade }),
      },
      plano: planoPago({
        cycle:     cycle as BillingCycle,
        method:    method as Method,
        promoUnav: isUnavPromoEligible(agency),
      }),
      email: agency.email,
      ip, userAgent,
    })

    return NextResponse.json({ invoiceUrl: result.checkoutUrl })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao iniciar o pagamento.'
    console.error('[billing/checkout]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
