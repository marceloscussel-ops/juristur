import { sendText, sendTextParts } from '@/lib/whatsapp/sender'
import { sendTransactional } from '@/lib/whatsapp/transactional'
import { formatAnalysis } from '@/lib/whatsapp/formatter'
import { openFollowUpSession } from '@/lib/whatsapp/session'
import { appUrl, caseUrl } from '@/lib/urls'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

const ADMIN_PHONE = process.env.ADMIN_WHATSAPP

function getServiceClient() {
  return createServiceClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
}

/**
 * Avisa a agência (cliente) que a análise do caso foi liberada.
 *
 * O canal depende da origem do caso:
 *  - `whatsapp`: entrega o parecer INLINE na conversa. Quando a revisão manual
 *    está ligada, a análise fica retida durante o atendimento e só chega aqui,
 *    depois do aval do advogado — por isso a sessão também é reaberta em
 *    follow-up, para as perguntas de acompanhamento continuarem funcionando.
 *  - `web`: manda um aviso curto com link, para o cliente que não está olhando.
 *
 * Falha de envio é silenciosa: nunca deve derrubar a conclusão do caso.
 */
export async function notifyAgencyCaseReady(caseId: string) {
  try {
    const db = getServiceClient()

    const { data: caseRow } = await db
      .from('cases')
      .select('description, category, agency_id, origin')
      .eq('id', caseId)
      .single()

    if (!caseRow) return

    const { data: agency } = await db
      .from('agencies')
      .select('name, phone')
      .eq('id', caseRow.agency_id)
      .single()

    if (!agency?.phone) return // sem WhatsApp cadastrado não há como avisar

    if (caseRow.origin === 'whatsapp') {
      await deliverAnalysisOnWhatsapp(caseId, caseRow.agency_id, caseRow.category ?? '', agency.phone)
      return
    }

    const shortCode = caseId.slice(0, 6).toUpperCase()
    const link      = caseUrl(caseId)
    const desc      = (caseRow.description ?? '').trim().replace(/\s+/g, ' ')
    const shortDesc = desc.length > 120 ? desc.slice(0, 117).trimEnd() + '…' : desc

    await sendTransactional({
      to:           agency.phone,
      templateName: 'case_ready',
      params:       [agency.name, shortCode, shortDesc, link],
      text: [
        `✅ *Sua análise está pronta — TurisGuard*`,
        ``,
        `Olá, ${agency.name}!`,
        `A análise do seu caso *${shortCode}* foi concluída.`,
        ...(shortDesc ? [`_${shortDesc}_`] : []),
        ``,
        `Acesse o parecer completo na plataforma:`,
        link,
      ].join('\n'),
    })
  } catch { /* silencioso */ }
}

/**
 * Entrega o parecer aprovado na própria conversa do WhatsApp e devolve a pessoa
 * ao estado de follow-up, como se a análise tivesse saído na hora.
 */
async function deliverAnalysisOnWhatsapp(
  caseId:   string,
  agencyId: string,
  category: string,
  phone:    string,
) {
  const db = getServiceClient()

  const { data: analysis } = await db
    .from('case_analyses')
    .select('ai_response')
    .eq('case_id', caseId)
    .eq('review_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!analysis?.ai_response) return

  // Abre a sessão ANTES de enviar: se a pessoa responder na hora, o webhook já
  // encontra o estado certo. Pode não abrir, se houver outra conversa em curso.
  const opened = await openFollowUpSession(phone, agencyId, caseId)

  await sendText(phone, '✅ *Boa notícia!* Um advogado revisou e liberou a análise do seu caso.')
  await sendTextParts(phone, formatAnalysis(analysis.ai_response, category || undefined))

  const link = `📄 Ver este caso na plataforma — histórico completo, anexos e mais opções:\n${caseUrl(caseId)}`

  await sendText(phone, opened
    ? '❓ Ficou com alguma dúvida sobre a análise? Me pergunte agora!\n\n' +
      `${link}\n\n_Para iniciar um novo caso, digite *novo caso*._`
    : link
  )
}

/** Alerta o admin via WhatsApp quando uma análise de IA falha. */
export async function notifyAnalysisFailed(caseId: string, agencyId: string, error: unknown) {
  if (!ADMIN_PHONE) return

  const errorMsg  = error instanceof Error ? error.message : String(error)
  const timestamp = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  const message = [
    `⚠️ *TurisGuard — Falha na análise*`,
    ``,
    `Caso: ${caseId}`,
    `Agência: ${agencyId}`,
    `Hora: ${timestamp}`,
    `Erro: ${errorMsg.slice(0, 200)}`,
    ``,
    `O caso foi criado com status _em_analise_. Verifique os logs no Vercel.`,
  ].join('\n')

  try { await sendText(ADMIN_PHONE, message) } catch { /* silencioso */ }
}

/**
 * Alerta o admin quando uma conta foi excluída (LGPD) mas a assinatura no Asaas
 * não pôde ser cancelada. A exclusão segue em frente — o direito do titular vem
 * primeiro —, então o cancelamento precisa ser feito à mão para não cobrar uma
 * conta que não existe mais.
 */
export async function notifyAdminDeletionIssue(email: string, subscriptionId: string) {
  if (!ADMIN_PHONE) return

  const message = [
    `⚠️ *TurisGuard — cancelar assinatura à mão*`,
    ``,
    `A conta *${email}* foi excluída (LGPD), mas o cancelamento da assinatura no Asaas falhou.`,
    ``,
    `Assinatura: ${subscriptionId}`,
    ``,
    `Cancele no painel do Asaas para não seguir cobrando.`,
  ].join('\n')

  try { await sendText(ADMIN_PHONE, message) } catch { /* silencioso */ }
}

/**
 * Dá as boas-vindas à agência no WhatsApp, logo depois do cadastro.
 *
 * Serve a dois propósitos além da cortesia: revela o canal de WhatsApp (que a
 * agência não teria como descobrir sozinha) e prova, na hora, que o número
 * informado no cadastro realmente recebe as nossas mensagens — é por ele que
 * avisamos quando a análise fica pronta.
 *
 * Deve ser chamada UMA vez por conta, quando o telefone é gravado pela primeira
 * vez. Falha de envio é silenciosa: nunca deve derrubar um cadastro.
 */
export async function notifyWelcome(phone: string, agencyName: string) {
  if (!phone) return

  try {
    await sendTransactional({
      to:           phone,
      templateName: 'welcome',
      params:       [agencyName, appUrl()],
      text: [
        `👋 *Bem-vindo ao TurisGuard, ${agencyName}!*`,
        ``,
        `Sua conta já está ativa. Além da plataforma, você pode usar o TurisGuard *por aqui mesmo*:`,
        ``,
        `• Mande o caso por mensagem ou áudio`,
        `• A análise volta nesta conversa`,
        ``,
        `Salve este número para não perder o canal.`,
        ``,
        `Acessar a plataforma:`,
        appUrl(),
      ].join('\n'),
    })
  } catch { /* silencioso */ }
}

/** Notifica o advogado que a agência pediu atendimento humano em um caso. */
export async function notifyLawyerEscalation(
  lawyerPhone: string,
  caseId:      string,
  agencyName:  string,
  category:    string,
) {
  const shortCode = caseId.slice(0, 6).toUpperCase()

  const message = [
    `🙋 *Pedido de atendimento — TurisGuard*`,
    ``,
    `🏢 Agência: ${agencyName}`,
    `📁 Categoria: ${category}`,
    `🔑 Código: ${shortCode}`,
    ``,
    `A agência pediu para falar com um advogado sobre este caso, pelo WhatsApp.`,
    ``,
    `Ver o caso:`,
    `${appUrl()}/lawyer/casos/${caseId}`,
  ].join('\n')

  try { await sendText(lawyerPhone, message) } catch { /* silencioso */ }
}

/** Notifica o advogado via WhatsApp sobre nova análise aguardando revisão. */
export async function notifyLawyerNewCase(
  lawyerPhone: string,
  caseId: string,
  agencyName: string,
  category: string,
  analysisText: string,
  isComplement = false,
) {
  const shortCode = caseId.slice(0, 6).toUpperCase()

  const preview = analysisText.length > 1500
    ? analysisText.slice(0, 1500) + '\n[... continua na plataforma]'
    : analysisText

  const header = isComplement
    ? `🧩 *Complemento em caso pré-aprovado — TurisGuard*`
    : `📋 *Novo caso para revisão — TurisGuard*`

  const message = [
    header,
    ...(isComplement
      ? [``, `⚠️ A agência acrescentou um complemento a um caso já aprovado. A IA regerou a análise abaixo — revise antes de reentregar.`]
      : []),
    ``,
    `🏢 Agência: ${agencyName}`,
    `📁 Categoria: ${category}`,
    `🔑 Código: ${shortCode}`,
    ``,
    `─────────────────────────`,
    preview,
    `─────────────────────────`,
    ``,
    `Revisar na plataforma:`,
    `${appUrl()}/lawyer/casos/${caseId}`,
    ``,
    `Ou responda aqui para decidir:`,
    `✅ APROVAR ${shortCode}`,
    `✍️ REVISAR ${shortCode}: seus comentários`,
    ``,
    `_Se este for o único caso pendente, basta responder APROVAR._`,
  ].join('\n')

  try { await sendText(lawyerPhone, message) } catch { /* silencioso */ }
}
