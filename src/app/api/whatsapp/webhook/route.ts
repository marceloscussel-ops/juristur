/**
 * POST /api/whatsapp/webhook
 *
 * Recebe mensagens da Z-API e gerencia o fluxo de abertura de caso.
 *
 * Fluxo de estados:
 *   (início)          → awaiting_category
 *   awaiting_category → awaiting_description
 *   awaiting_description → awaiting_files
 *   awaiting_files    → processing → completed
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSession, createSession, updateSession, closeSession, touchSession } from '@/lib/whatsapp/session'
import { sendText, sendTextParts } from '@/lib/whatsapp/sender'
import { categoryMenu, parseCategory, formatAnalysis } from '@/lib/whatsapp/formatter'
import { transcribeAudio } from '@/lib/whatsapp/transcriber'
import { extractTextFromFile } from '@/lib/extract-text'
import { analyzeCase, analyzeCaseRevision, followUpCase, ConversationMessage } from '@/lib/claude'
import { findSimilarCases, formatSimilarCases } from '@/lib/ai/rag'
import { notifyAgencyCaseReady } from '@/lib/notify'
import { getTrialInfo, getEscalationInfo } from '@/lib/plans'
import { appUrl, caseUrl } from '@/lib/urls'
import { env } from '@/lib/env'
import { normalizePhone } from '@/lib/phone'
import { MAX_FOLLOWUP_QUESTIONS } from '@/types'

export const maxDuration = 60

// ─── Payload Z-API ───────────────────────────────────────────────────────────

interface ZApiMessage {
  phone:     string
  fromMe?:   boolean
  type:      string
  /** Id da mensagem na Z-API. `id` é queda de segurança caso o campo mude. */
  messageId?: string
  id?:        string
  text?:     { message: string }
  audio?:    { audioUrl: string; mimeType: string }
  // Z-API envia PTT (voice note) com campos alternativos
  ptt?:      { audioUrl: string; mimeType: string }
  image?:    { imageUrl: string; mimeType: string; caption?: string }
  document?: { documentUrl: string; mimeType: string; fileName: string }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getServiceClient() {
  return createClient(
    env('NEXT_PUBLIC_SUPABASE_URL'),
    env('SUPABASE_SERVICE_ROLE_KEY')
  )
}


/**
 * Porteiro contra reentrega da Z-API, que reenvia o webhook quando não recebe
 * resposta a tempo — e o nosso só responde depois de transcrever, consultar o
 * Claude e enviar tudo, o que passa do limite dela em perguntas por áudio.
 *
 * O INSERT é a trava, não um SELECT anterior: as duas execuções podem consultar
 * antes de qualquer uma gravar. Quem perde a corrida leva 23505 e para aqui.
 *
 * Na dúvida, processa. Se a tabela ainda não existe (migração não aplicada) ou
 * o banco oscila, seguir em frente e arriscar uma duplicata é melhor do que
 * engolir a mensagem de um cliente.
 */
async function isDuplicateDelivery(msg: ZApiMessage): Promise<boolean> {
  const messageId = msg.messageId ?? msg.id

  if (!messageId) {
    console.warn('[whatsapp/webhook] payload sem messageId/id — sem proteção contra reentrega:',
      Object.keys(msg).join(','))
    return false
  }

  const { error } = await getServiceClient()
    .from('whatsapp_processed_messages')
    .insert({ message_id: messageId })

  if (!error) return false

  if (error.code === '23505') {
    console.log(`[whatsapp/webhook] reentrega ignorada: ${messageId}`)
    return true
  }

  console.error('[whatsapp/webhook] dedup indisponível:', error.message)
  return false
}

/** Busca agência pelo número de telefone cadastrado. */
async function findAgencyByPhone(phone: string) {
  const supabase = getServiceClient()
  const { data } = await supabase
    .from('agencies')
    .select('id, name')
    .eq('phone', phone)
    .single()
  return data as { id: string; name: string } | null
}

/** Salva arquivo enviado pelo WhatsApp no Supabase Storage. */
async function saveWhatsAppFile(
  agencyId: string,
  caseId:   string,
  fileUrl:  string,
  mimeType: string,
  fileName: string
): Promise<{ publicUrl: string; extractedText: string }> {
  const supabase = getServiceClient()

  const fileRes = await fetch(fileUrl)
  if (!fileRes.ok) throw new Error('Erro ao baixar arquivo do WhatsApp')

  const buffer    = Buffer.from(await fileRes.arrayBuffer())
  const filePath  = `${agencyId}/${caseId}/${Date.now()}-${fileName}`

  const { error } = await supabase.storage
    .from('case-files')
    .upload(filePath, buffer, { contentType: mimeType })

  if (error) throw new Error(`Erro no upload: ${error.message}`)

  const { data: urlData } = supabase.storage.from('case-files').getPublicUrl(filePath)
  const extractedText     = await extractTextFromFile(buffer, mimeType, fileName)

  return { publicUrl: urlData.publicUrl, extractedText }
}

// ─── Handler do advogado ──────────────────────────────────────────────────────

async function sendLawyerHelp(phone: string) {
  await sendText(phone, [
    `🔎 *Comandos disponíveis:*`,
    ``,
    `Para aprovar, responda:  *APROVAR*`,
    `Para pedir ajuste:  *REVISAR: seus comentários*`,
    ``,
    `_Havendo mais de um caso pendente, inclua o código (6 primeiros caracteres). Ex: APROVAR A1B2C3_`,
  ].join('\n'))
}

async function handleLawyerCommand(phone: string, rawText: string) {
  const db = getServiceClient()

  // Tolera copiar/colar: remove markdown do WhatsApp (* _ ~ `) e normaliza espaços.
  // Assim "✅ *APROVAR A7ED6E*" vira "✅ APROVAR A7ED6E" e é reconhecido igual a digitar.
  const text = rawText.replace(/[*_~`]/g, ' ').replace(/\s+/g, ' ').trim()

  const cmd = text.match(/\b(APROVAR|REVISAR)\b\s*([\s\S]*)/i)
  if (!cmd) { await sendLawyerHelp(phone); return }

  const action = cmd[1].toUpperCase()
  const rest   = cmd[2].trim()

  // Extrai código (hex, 6 primeiros do UUID) e comentários conforme a ação
  let shortCode: string | null = null
  let notes = ''
  if (action === 'APROVAR') {
    const m = rest.match(/^([A-Fa-f0-9]{4,8})\b/)
    shortCode = m ? m[1].toUpperCase() : null
  } else {
    const withCode = rest.match(/^([A-Fa-f0-9]{4,8})\s*:\s*([\s\S]+)/)
    if (withCode) { shortCode = withCode[1].toUpperCase(); notes = withCode[2].trim() }
    else          { notes = rest.replace(/^:\s*/, '').trim() }
  }

  // Resolve o caso alvo: código explícito OU único caso pendente
  const { data: pending } = await db
    .from('case_analyses').select('case_id').eq('review_status', 'pending')
  const pendingIds: string[] = (pending ?? []).map(p => p.case_id)

  let targetId: string | null = null
  if (shortCode) {
    targetId = pendingIds.find(id => id.toUpperCase().startsWith(shortCode!)) ?? null
    if (!targetId) {
      const { data: all } = await db.from('cases').select('id')
      targetId = (all ?? []).find(c => c.id.toUpperCase().startsWith(shortCode!))?.id ?? null
    }
    if (!targetId) {
      await sendText(phone, `⚠️ Caso com código "${shortCode}" não encontrado.`)
      return
    }
  } else if (pendingIds.length === 1) {
    targetId = pendingIds[0]
  } else if (pendingIds.length === 0) {
    await sendText(phone, `✅ Não há casos aguardando revisão no momento.`)
    return
  } else {
    const codes = pendingIds.map(id => id.slice(0, 6).toUpperCase()).join(', ')
    await sendText(phone,
      `Há ${pendingIds.length} casos aguardando revisão. Informe o código.\n` +
      `Ex: *${action} ${pendingIds[0].slice(0, 6).toUpperCase()}*\n\n` +
      `Pendentes: ${codes}`
    )
    return
  }

  const codeLabel = targetId.slice(0, 6).toUpperCase()

  // ── APROVAR ──
  if (action === 'APROVAR') {
    await db.from('case_analyses')
      .update({ review_status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('case_id', targetId)
    await db.from('cases').update({ status: 'concluido' }).eq('id', targetId)
    await notifyAgencyCaseReady(targetId)
    await sendText(phone, `✅ Caso *${codeLabel}* aprovado. A análise foi liberada para a agência.`)
    return
  }

  // ── REVISAR ──
  if (!notes) {
    await sendText(phone,
      `Para revisar o caso *${codeLabel}*, envie os comentários assim:\n` +
      `*REVISAR ${codeLabel}: precisa citar o art. 22...*`
    )
    return
  }

  const { data: caseRow } = await db
    .from('cases').select('description, category').eq('id', targetId).single()
  const { data: analysis } = await db
    .from('case_analyses').select('ai_response').eq('case_id', targetId).single()

  if (!caseRow || !analysis) {
    await sendText(phone, `⚠️ Análise do caso "${codeLabel}" não encontrada.`)
    return
  }

  await sendText(phone, `⏳ Gerando nova análise com seus comentários...`)
  await db.from('case_analyses')
    .update({ review_status: 'revision_requested', lawyer_notes: notes })
    .eq('case_id', targetId)

  try {
    const result = await analyzeCaseRevision(caseRow.description, caseRow.category, analysis.ai_response, notes)

    await db.from('case_analyses').update({
      ai_response:   result.text,
      tokens_used:   result.tokensUsed,
      review_status: 'pending',
      lawyer_notes:  notes,
      reviewed_at:   null,
      severity:      result.severity ?? null,
    }).eq('case_id', targetId)

    const preview = result.text.length > 1500 ? result.text.slice(0, 1500) + '\n[continua...]' : result.text
    await sendText(phone, [
      `🔄 *Nova análise gerada — Código ${codeLabel}*`,
      ``,
      preview,
      ``,
      `Responda para decidir:`,
      `APROVAR ${codeLabel}`,
      `REVISAR ${codeLabel}: novos comentários`,
    ].join('\n'))
  } catch {
    await sendText(phone, `⚠️ Erro ao gerar nova análise. Tente pela plataforma web.`)
  }
}

// ─── Escalação para advogado (menu impresso no fim da análise) ────────────────

/**
 * Lê a resposta ao menu "Deseja falar com um advogado?".
 *
 * Aceita só os números do menu (e a forma com emoji). Palavras como "sim"/"não"
 * ficam de fora de propósito: depois de uma resposta de follow-up o bot pergunta
 * "tem mais alguma dúvida?", e ali um "sim" significa outra coisa — escalar por
 * engano consumiria uma escalada da cota da agência.
 */
function parseEscalationChoice(text: string): 'yes' | 'no' | null {
  const t = text.trim()
  if (t === '1' || t === '1️⃣') return 'yes'
  if (t === '2' || t === '2️⃣') return 'no'
  return null
}

/**
 * Registra o pedido de atendimento humano. Mesmas regras de cota do
 * POST /api/cases/[id]/escalate, que é a via web do mesmo fluxo.
 */
async function handleEscalation(
  phone:  string,
  caseId: string,
  agency: { id: string; name: string },
) {
  const db = getServiceClient()

  const { data: caseRow } = await db
    .from('cases')
    .select('id, category, escalated_at')
    .eq('id', caseId)
    .eq('agency_id', agency.id)
    .single()

  if (!caseRow) {
    await sendText(phone, '⚠️ Não encontrei esse caso. Acesse a plataforma web para falar com um advogado.')
    return
  }

  // Já escalado antes: não consome cota de novo
  if (caseRow.escalated_at) {
    await sendText(phone, '✅ Este caso já está na fila do advogado. Em breve falamos com você por aqui.')
    return
  }

  const { data: agencyRow } = await db
    .from('agencies')
    .select('subscription_status, trial_ends_at, created_at')
    .eq('id', agency.id)
    .single()

  const { count } = await db
    .from('cases')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agency.id)
    .not('escalated_at', 'is', null)

  const info = getEscalationInfo(getTrialInfo(agencyRow ?? {}), count ?? 0)

  if (!info.canEscalate) {
    const motivo = info.reason === 'trial_expired'
      ? 'Seu período gratuito terminou.'
      : `Você já usou suas ${info.total} escaladas gratuitas.`
    await sendText(phone,
      `⚠️ ${motivo}\n\nAssine um plano para falar com um advogado sobre este caso:\n${appUrl()}/assinar`
    )
    return
  }

  await db.from('cases').update({ escalated_at: new Date().toISOString() }).eq('id', caseId)

  await sendText(phone,
    '✅ Certo! Encaminhei seu caso para um advogado.\n\n' +
    'O atendimento continua por aqui mesmo, neste número. ' +
    'Enquanto isso, pode seguir tirando dúvidas sobre a análise.'
  )

  const { data: lwSettings } = await db
    .from('lawyer_settings').select('lawyer_phone').single()

  if (lwSettings?.lawyer_phone) {
    const { notifyLawyerEscalation } = await import('@/lib/notify')
    await notifyLawyerEscalation(lwSettings.lawyer_phone, caseId, agency.name, caseRow.category ?? '')
  }
}

// ─── Follow-up após análise ───────────────────────────────────────────────────

async function handleFollowUp(phone: string, caseId: string, question: string) {
  const db = getServiceClient()

  const { data: caseRow } = await db
    .from('cases')
    .select('description, category')
    .eq('id', caseId)
    .single()

  const { data: analysis } = await db
    .from('case_analyses')
    .select('ai_response')
    .eq('case_id', caseId)
    .eq('review_status', 'approved')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!caseRow || !analysis) {
    await sendText(phone, '⚠️ Não encontrei a análise desse caso. Acesse a plataforma web para mais detalhes.')
    return
  }

  const { data: history } = await db
    .from('case_messages')
    .select('role, content')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true })

  // Trava de limite: controla custo e evita conversa infinita
  const asked = (history ?? []).filter(m => m.role === 'user').length
  if (asked >= MAX_FOLLOWUP_QUESTIONS) {
    await sendText(phone,
      `⚠️ Você já fez ${MAX_FOLLOWUP_QUESTIONS} perguntas sobre este caso, que é o limite.\n\n` +
      'Para uma nova dúvida, digite *novo caso* e faça uma nova análise.'
    )
    return
  }

  // Salva a pergunta
  await db.from('case_messages').insert({ case_id: caseId, role: 'user', content: question })

  await sendText(phone, '⏳ Um momento...')

  try {
    const result = await followUpCase(
      caseRow.description,
      caseRow.category,
      analysis.ai_response,
      (history ?? []) as ConversationMessage[],
      question,
    )

    // Salva a resposta
    await db.from('case_messages').insert({ case_id: caseId, role: 'assistant', content: result.text })

    // Envia sem usar formatAnalysis (resposta conversacional, não estruturada)
    const MAX = 3800
    if (result.text.length <= MAX) {
      await sendText(phone, result.text)
    } else {
      const mid = result.text.lastIndexOf('\n', MAX)
      await sendText(phone, result.text.slice(0, mid > 0 ? mid : MAX))
      await sendText(phone, result.text.slice(mid > 0 ? mid : MAX).trim())
    }
    await sendText(phone, '_Tem mais alguma dúvida? Pode perguntar. Para novo caso, digite *novo caso*._')
  } catch {
    await sendText(phone, '⚠️ Erro ao processar sua pergunta. Tente pela plataforma web.')
  }
}

// ─── Handlers de estado ───────────────────────────────────────────────────────

async function handleNoSession(phone: string, agency: { id: string; name: string }) {
  const session = await createSession(phone, agency.id)
  await sendText(phone, categoryMenu(agency.name))
  return session
}

async function handleAwaitingCategory(
  phone:     string,
  sessionId: string,
  text:      string
) {
  const category = parseCategory(text)
  if (!category) {
    await sendText(phone,
      '❓ Não reconheci a categoria. Digite o *número* correspondente:\n\n' +
      categoryMenu('').split('\n').slice(2).join('\n')
    )
    return
  }

  await updateSession(sessionId, 'awaiting_description', { category })
  await sendText(phone,
    `Entendido — *${category}*.\n\n` +
    'Agora me descreva o problema com o máximo de detalhes.\n' +
    'Pode escrever normalmente ou enviar um *áudio* 🎙️'
  )
}

async function handleAwaitingDescription(
  phone:     string,
  sessionId: string,
  text:      string
) {
  if (text.length < 20) {
    await sendText(phone,
      '⚠️ A descrição está muito curta. Por favor, detalhe melhor o que aconteceu ' +
      '(quem, quando, qual valor, o que foi contratado).'
    )
    return
  }

  await updateSession(sessionId, 'awaiting_files', { description: text })
  await sendText(phone,
    'Tem algum documento relacionado ao caso?\n' +
    '(contrato, e-mail, voucher, comprovante...)\n\n' +
    'Pode enviar agora (até 5 arquivos: PDF, imagem).\n' +
    'Quando terminar, digite *pronto*.\n' +
    'Se não tiver arquivos, digite *não*.'
  )
}

async function handleAwaitingFiles(
  phone:     string,
  sessionId: string,
  agencyId:  string,
  msg:       ZApiMessage,
  sessionData: { category?: string; description?: string; fileUrls?: Array<{ url: string; name: string; type: string }> },
  existingCaseId: string | null
) {
  const supabase    = getServiceClient()
  const msgText     = msg.text?.message?.toLowerCase().trim() ?? ''
  const isDone      = ['pronto', 'não', 'nao', 'ok', 'sim'].includes(msgText)
  const currentFiles = sessionData.fileUrls ?? []

  // Fonte única do id do caso: a coluna `case_id` da sessão. O caso pode já ter
  // sido criado pelo primeiro upload de arquivo; senão, nasce na análise.
  let caseId = existingCaseId ?? undefined

  // Recebeu arquivo (Z-API sempre envia type="ReceivedCallback" — detecta pelo campo presente)
  if (msg.document || msg.image) {
    if (currentFiles.length >= 5) {
      await sendText(phone, '⚠️ Limite de 5 arquivos atingido. Digite *pronto* para continuar.')
      return
    }

    const fileInfo = msg.document
      ? { url: msg.document.documentUrl, name: msg.document.fileName, type: msg.document.mimeType }
      : { url: msg.image!.imageUrl, name: `imagem-${Date.now()}.jpg`, type: msg.image!.mimeType }

    // Precisamos de um caseId para o upload — criamos o caso agora se ainda não existe
    if (!caseId) {
      const { data: newCase } = await supabase
        .from('cases')
        .insert({
          agency_id:   agencyId,
          title:       sessionData.category ?? 'Caso WhatsApp',
          description: sessionData.description ?? '',
          category:    sessionData.category ?? 'Outro',
          status:      'em_analise',
          origin:      'whatsapp',
        })
        .select()
        .single()
      caseId = newCase?.id
      await updateSession(sessionId, 'awaiting_files', {}, caseId)
    }

    try {
      await saveWhatsAppFile(agencyId, caseId!, fileInfo.url, fileInfo.type, fileInfo.name)
      const updated = [...currentFiles, { url: fileInfo.url, name: fileInfo.name, type: fileInfo.type }]
      await updateSession(sessionId, 'awaiting_files', { fileUrls: updated })
      await sendText(phone,
        `✅ Arquivo recebido (${updated.length}/5).\n` +
        'Envie mais arquivos ou digite *pronto* para analisar.'
      )
    } catch {
      await sendText(phone, '⚠️ Erro ao receber o arquivo. Tente novamente ou digite *pronto* para continuar sem ele.')
    }
    return
  }

  // Usuário sinalizou término
  if (!isDone) {
    await sendText(phone, 'Digite *pronto* quando terminar de enviar os arquivos, ou *não* se não tiver.')
    return
  }

  // ── Processar caso ───────────────────────────────────────────────────────────
  await updateSession(sessionId, 'processing')
  await sendText(phone,
    '✅ Recebi tudo! Estou analisando seu caso...\nIsso pode levar alguns instantes ⏳'
  )

  try {
    const category    = sessionData.category ?? 'Outro'
    const description = sessionData.description ?? ''

    // Resgata texto extraído dos arquivos já salvos
    const filesContent: string[] = []
    if (caseId) {
      const { data: dbFiles } = await supabase
        .from('case_files')
        .select('file_name, extracted_text')
        .eq('case_id', caseId)
      for (const f of dbFiles ?? []) {
        if (f.extracted_text) filesContent.push(`[${f.file_name}]\n${f.extracted_text}`)
      }
    }

    // RAG + análise IA
    const similarCases = await findSimilarCases(description)
    const ragContext   = formatSimilarCases(similarCases)
    const result       = await analyzeCase(description, category, filesContent.join('\n\n---\n\n'), ragContext)

    // Salva caso (se ainda não foi criado pelo upload de arquivo)
    if (!caseId) {
      const { data: newCase } = await supabase
        .from('cases')
        .insert({
          agency_id:   agencyId,
          title:       category,
          description,
          category,
          status:      'em_analise',
          origin:      'whatsapp',
        })
        .select()
        .single()
      caseId = newCase?.id
    }

    // O auto_approve do advogado decide se a análise vai direto ao cliente ou
    // fica retida esperando revisão. Fica fora do `if (caseId)` porque governa
    // também a entrega, logo abaixo.
    const { data: lwSettings } = await supabase
      .from('lawyer_settings')
      .select('auto_approve, lawyer_phone')
      .single()

    const autoApprove = lwSettings?.auto_approve ?? true

    if (caseId) {
      const reviewStatus = autoApprove ? 'approved' : 'pending'

      await supabase.from('case_analyses').insert({
        case_id:       caseId,
        ai_response:   result.text,
        tokens_used:   result.tokensUsed,
        review_status: reviewStatus,
        severity:      result.severity ?? null,
      })

      if (autoApprove) {
        await supabase.from('cases').update({ status: 'concluido' }).eq('id', caseId)
      } else if (lwSettings?.lawyer_phone) {
        const { data: agencyRow } = await supabase.from('agencies').select('name').eq('id', agencyId).single()
        const { notifyLawyerNewCase } = await import('@/lib/notify')
        await notifyLawyerNewCase(lwSettings.lawyer_phone, caseId, agencyRow?.name ?? 'Agência', category, result.text)
      }
    }

    // Revisão manual ligada: a análise NÃO vai para o cliente agora. Ela fica
    // retida e é entregue por notifyAgencyCaseReady quando o advogado aprovar —
    // que é também quem reabre a sessão em follow-up.
    if (!autoApprove) {
      await sendText(phone,
        '✅ Recebi seu caso e a análise já foi gerada.\n\n' +
        'Ela está passando pela revisão de um advogado. Assim que for liberada, ' +
        'eu envio o parecer completo aqui mesmo. 🕐' +
        (caseId ? `\n\n📄 Acompanhar na plataforma:\n${caseUrl(caseId)}` : '')
      )
      await closeSession(sessionId)
      return
    }

    // Envia resposta formatada para WhatsApp
    const parts = formatAnalysis(result.text, category)
    await sendTextParts(phone, parts)

    await sendText(phone,
      '❓ Ficou com alguma dúvida sobre a análise? Me pergunte agora!\n\n' +
      (caseId
        ? `📄 Ver este caso na plataforma — histórico completo, anexos e mais opções:\n${caseUrl(caseId)}\n\n`
        : '') +
      '_Para iniciar um novo caso, digite *novo caso*._'
    )
    // Grava o case_id na sessão: sem ele o follow-up não sabe sobre qual caso
    // a agência está perguntando e a conversa morre em "Sessão inválida".
    await updateSession(sessionId, 'follow_up', undefined, caseId)

  } catch (err) {
    console.error('[whatsapp/webhook] análise error:', err)
    await sendText(phone,
      '⚠️ Ocorreu um erro ao analisar seu caso. Por favor, tente novamente ou acesse a plataforma web.'
    )
    await closeSession(sessionId)
  }
}

// ─── Webhook principal ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Validação do secret (header ou query param)
    // Strip BOM/chars inválidos do env var (problema de vars adicionadas via PowerShell)
    const secret         = env('ZAPI_WEBHOOK_SECRET')
    const headerSecret   = request.headers.get('x-webhook-secret') ?? ''
    const { searchParams } = new URL(request.url)
    const querySecret    = searchParams.get('secret') ?? ''

    if (secret && headerSecret !== secret && querySecret !== secret) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const body = await request.json() as ZApiMessage

    // Ignora mensagens enviadas pelo próprio bot
    if (body.fromMe) return NextResponse.json({ ok: true })

    const phone = normalizePhone(body.phone)
    if (!phone) return NextResponse.json({ ok: true })

    // Antes de qualquer trabalho: esta mensagem já foi processada?
    if (await isDuplicateDelivery(body)) return NextResponse.json({ ok: true, duplicate: true })

    // Verifica se é o advogado enviando um comando (APROVAR / REVISAR)
    const supabaseService = getServiceClient()
    const { data: lawyerSettings } = await supabaseService
      .from('lawyer_settings')
      .select('lawyer_phone')
      .single()

    const lawyerPhone = lawyerSettings?.lawyer_phone
      ? normalizePhone(lawyerSettings.lawyer_phone)
      : null

    if (lawyerPhone && phone === lawyerPhone) {
      const msgText = body.text?.message?.trim() ?? ''
      await handleLawyerCommand(phone, msgText)
      return NextResponse.json({ ok: true })
    }

    console.log(`[webhook] type="${body.type}" phone="${phone}" hasAudio=${!!body.audio} hasText=${!!body.text}`)

    // Extrai texto da mensagem
    let text = body.text?.message?.trim() ?? ''

    // Áudio → transcrição Whisper
    // Z-API sempre envia type="ReceivedCallback" — o conteúdo é detectado pelo campo presente
    const audioUrl = body.audio?.audioUrl ?? body.ptt?.audioUrl
    if (audioUrl) {
      try {
        text = await transcribeAudio(audioUrl)
        await sendText(phone, `🎙️ _Transcrição do áudio:_\n"${text}"`)
      } catch {
        await sendText(phone, '⚠️ Não consegui transcrever o áudio. Por favor, envie como texto.')
        return NextResponse.json({ ok: true })
      }
    }

    // Busca agência pelo telefone
    const agency = await findAgencyByPhone(phone)
    if (!agency) {
      await sendText(phone,
        `👋 Olá! Seu número não está cadastrado na plataforma TurisGuard.\n\n` +
        `Para usar este serviço, acesse o link abaixo e cadastre sua agência:\n${appUrl()}/cadastro`
      )
      return NextResponse.json({ ok: true })
    }

    // Busca sessão ativa
    const session = await getSession(phone)

    if (!session) {
      await handleNoSession(phone, agency)
      return NextResponse.json({ ok: true })
    }

    const state       = session.current_state
    const sessionData = session.session_data as {
      category?: string
      description?: string
      fileUrls?: Array<{ url: string; name: string; type: string }>
    }

    // Qualquer estado: "cancelar" reinicia
    if (text.toLowerCase() === 'cancelar') {
      await closeSession(session.id)
      await sendText(phone, '🔄 Conversa reiniciada. Envie qualquer mensagem para começar um novo caso.')
      return NextResponse.json({ ok: true })
    }

    // Pós-análise: resposta à pergunta do advogado
    if (state === 'completed' || !state) {
      await handleNoSession(phone, agency)
      return NextResponse.json({ ok: true })
    }

    switch (state) {
      case 'awaiting_category':
        await handleAwaitingCategory(phone, session.id, text)
        break

      case 'awaiting_description':
        if (text) {
          await handleAwaitingDescription(phone, session.id, text)
        } else {
          await sendText(phone, 'Por favor, descreva o problema em texto ou envie um áudio 🎙️')
        }
        break

      case 'awaiting_files':
        await handleAwaitingFiles(phone, session.id, agency.id, body, sessionData, session.case_id)
        break

      case 'processing':
        await sendText(phone, '⏳ Ainda estou analisando seu caso. Aguarde mais um instante...')
        break

      case 'follow_up': {
        const t = text.toLowerCase().trim()
        const isNewCase = t === 'novo caso' || t === 'encerrar' || t === 'sair'

        if (isNewCase) {
          await closeSession(session.id)
          await handleNoSession(phone, agency)
          break
        }

        // Rede de segurança: sessões antigas, salvas antes de gravarmos o case_id
        if (!session.case_id) {
          await sendText(phone, '⚠️ Sessão inválida. Para começar um novo caso, digite *novo caso*.')
          await closeSession(session.id)
          break
        }

        // Conversa viva: renova o relógio para a sessão não expirar no meio
        await touchSession(session.id)

        if (!text) {
          await sendText(phone,
            'Me mande sua dúvida em texto ou em áudio 🎙️ que eu respondo sobre a análise.'
          )
          break
        }

        // Menu do fim da análise: 1 = falar com advogado, 2 = por enquanto não
        const choice = parseEscalationChoice(text)
        if (choice === 'yes') {
          await handleEscalation(phone, session.case_id, agency)
        } else if (choice === 'no') {
          await sendText(phone,
            'Tudo bem! 👍 Se mudar de ideia, é só digitar *1* para falar com um advogado.\n\n' +
            '_Ficou alguma dúvida sobre a análise? Pode perguntar. Para um novo caso, digite *novo caso*._'
          )
        } else {
          await handleFollowUp(phone, session.case_id, text)
        }
        break
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[whatsapp/webhook] unhandled error:', err)
    // Retorna 200 para Z-API não reenviar o webhook
    return NextResponse.json({ ok: true })
  }
}
