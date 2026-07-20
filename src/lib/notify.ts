import { sendText } from '@/lib/whatsapp/sender'
import { sendTransactional } from '@/lib/whatsapp/transactional'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

const ADMIN_PHONE = process.env.ADMIN_WHATSAPP

function getServiceClient() {
  return createServiceClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
}

/**
 * Avisa a agência (cliente) via WhatsApp que a análise do caso foi concluída
 * e está liberada na plataforma.
 *
 * Idempotência de canal: casos com origem `whatsapp` recebem a análise inline
 * na própria conversa, então esta notificação separada é suprimida para eles —
 * ela existe para o cliente que NÃO está olhando (caso criado na web e liberado
 * depois pela revisão do advogado). Falha de envio é silenciosa: nunca deve
 * derrubar a conclusão do caso.
 */
export async function notifyAgencyCaseReady(caseId: string) {
  try {
    const db = getServiceClient()

    const { data: caseRow } = await db
      .from('cases')
      .select('description, agency_id, origin')
      .eq('id', caseId)
      .single()

    // Origem WhatsApp já recebeu a análise na conversa — não duplica o aviso.
    if (!caseRow || caseRow.origin === 'whatsapp') return

    const { data: agency } = await db
      .from('agencies')
      .select('name, phone')
      .eq('id', caseRow.agency_id)
      .single()

    if (!agency?.phone) return // sem WhatsApp cadastrado não há como avisar

    const shortCode = caseId.slice(0, 6).toUpperCase()
    const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://juristur.vercel.app'
    const link      = `${appUrl}/casos/${caseId}`
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

/** Notifica o advogado via WhatsApp sobre nova análise aguardando revisão. */
export async function notifyLawyerNewCase(
  lawyerPhone: string,
  caseId: string,
  agencyName: string,
  category: string,
  analysisText: string,
) {
  const shortCode = caseId.slice(0, 6).toUpperCase()
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL ?? 'https://juristur.vercel.app'

  const preview = analysisText.length > 1500
    ? analysisText.slice(0, 1500) + '\n[... continua na plataforma]'
    : analysisText

  const message = [
    `📋 *Novo caso para revisão — TurisGuard*`,
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
    `${appUrl}/lawyer/casos/${caseId}`,
    ``,
    `Ou responda aqui para decidir:`,
    `✅ APROVAR ${shortCode}`,
    `✍️ REVISAR ${shortCode}: seus comentários`,
    ``,
    `_Se este for o único caso pendente, basta responder APROVAR._`,
  ].join('\n')

  try { await sendText(lawyerPhone, message) } catch { /* silencioso */ }
}
