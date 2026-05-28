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
import { getSession, createSession, updateSession, closeSession } from '@/lib/whatsapp/session'
import { sendText, sendTextParts } from '@/lib/whatsapp/sender'
import { categoryMenu, parseCategory, formatAnalysis } from '@/lib/whatsapp/formatter'
import { transcribeAudio } from '@/lib/whatsapp/transcriber'
import { extractTextFromFile } from '@/lib/extract-text'
import { analyzeCase } from '@/lib/claude'
import { findSimilarCases, formatSimilarCases } from '@/lib/ai/rag'

export const maxDuration = 60

// ─── Payload Z-API ───────────────────────────────────────────────────────────

interface ZApiMessage {
  phone:     string
  fromMe?:   boolean
  type:      string
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
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/**
 * Normaliza número de telefone para o formato Z-API brasileiro.
 * Z-API envia: 55 + DDD (2) + número (8 dígitos) = 12 dígitos
 * Remove o nono dígito (9) de celulares se presente.
 * Ex: 5554999082111 → 555499082111
 *     554999082111  → 554999082111 (sem DDI duplicado)
 */
function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, '')

  // Garante DDI 55
  if (!digits.startsWith('55')) digits = '55' + digits

  // Remove o nono dígito se o número tem 13 dígitos (55 + DDD + 9 + 8)
  if (digits.length === 13) {
    digits = digits.slice(0, 4) + digits.slice(5) // remove o 5º dígito (o "9")
  }

  return digits
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
  sessionData: { category?: string; description?: string; fileUrls?: Array<{ url: string; name: string; type: string }> }
) {
  const supabase    = getServiceClient()
  const msgText     = msg.text?.message?.toLowerCase().trim() ?? ''
  const isDone      = ['pronto', 'não', 'nao', 'ok', 'sim'].includes(msgText)
  const currentFiles = sessionData.fileUrls ?? []

  // Recebeu arquivo
  if (msg.type === 'document' || msg.type === 'image') {
    if (currentFiles.length >= 5) {
      await sendText(phone, '⚠️ Limite de 5 arquivos atingido. Digite *pronto* para continuar.')
      return
    }

    const fileInfo = msg.document
      ? { url: msg.document.documentUrl, name: msg.document.fileName, type: msg.document.mimeType }
      : { url: msg.image!.imageUrl, name: `imagem-${Date.now()}.jpg`, type: msg.image!.mimeType }

    // Precisamos de um caseId para o upload — criamos o caso agora se ainda não existe
    let caseId = sessionData.fileUrls?.length === 0 ? undefined : (sessionData as Record<string, unknown>).caseId as string | undefined

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
    if (currentFiles.length > 0) {
      const { data: dbFiles } = await supabase
        .from('case_files')
        .select('file_name, extracted_text')
        .eq('case_id', (sessionData as Record<string, unknown>).caseId ?? '')
      for (const f of dbFiles ?? []) {
        if (f.extracted_text) filesContent.push(`[${f.file_name}]\n${f.extracted_text}`)
      }
    }

    // RAG + análise IA
    const similarCases = await findSimilarCases(description)
    const ragContext   = formatSimilarCases(similarCases)
    const result       = await analyzeCase(description, category, filesContent.join('\n\n---\n\n'), ragContext)

    // Salva caso (se ainda não foi criado pelo upload de arquivo)
    let caseId = (sessionData as Record<string, unknown>).caseId as string | undefined
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

    if (caseId) {
      await supabase.from('case_analyses').insert({
        case_id:     caseId,
        ai_response: result.text,
        tokens_used: result.tokensUsed,
      })
      await supabase.from('cases').update({ status: 'concluido' }).eq('id', caseId)
    }

    // Envia resposta formatada para WhatsApp
    const parts = formatAnalysis(result.text, category)
    await sendTextParts(phone, parts)

  } catch (err) {
    console.error('[whatsapp/webhook] análise error:', err)
    await sendText(phone,
      '⚠️ Ocorreu um erro ao analisar seu caso. Por favor, tente novamente ou acesse a plataforma web.'
    )
  } finally {
    await closeSession(sessionId)
  }
}

// ─── Webhook principal ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Validação do secret (header ou query param)
    const secret         = process.env.ZAPI_WEBHOOK_SECRET
    const headerSecret   = request.headers.get('x-webhook-secret')
    const { searchParams } = new URL(request.url)
    const querySecret    = searchParams.get('secret')

    if (secret && headerSecret !== secret && querySecret !== secret) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }

    const body = await request.json() as ZApiMessage

    // Ignora mensagens enviadas pelo próprio bot
    if (body.fromMe) return NextResponse.json({ ok: true })

    const phone = normalizePhone(body.phone)
    if (!phone) return NextResponse.json({ ok: true })

    console.log(`[webhook] type="${body.type}" phone="${phone}" hasAudio=${!!body.audio} hasText=${!!body.text}`)

    // Extrai texto da mensagem
    let text = body.text?.message?.trim() ?? ''

    // Áudio → transcrição Whisper (Z-API usa "audio" ou "ptt" para voz)
    const audioUrl = body.audio?.audioUrl ?? body.ptt?.audioUrl
    if ((body.type === 'audio' || body.type === 'ptt') && audioUrl) {
      try {
        text = await transcribeAudio(body.audio.audioUrl)
        await sendText(phone, `🎙️ _Transcrição do áudio:_\n"${text}"`)
      } catch {
        await sendText(phone, '⚠️ Não consegui transcrever o áudio. Por favor, envie como texto.')
        return NextResponse.json({ ok: true })
      }
    }

    // Busca agência pelo telefone
    const agency = await findAgencyByPhone(phone)
    if (!agency) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://juristur.vercel.app'
      await sendText(phone,
        `👋 Olá! Seu número não está cadastrado na plataforma JurisTur.\n\n` +
        `Para usar este serviço, acesse o link abaixo e cadastre sua agência:\n${appUrl}/cadastro`
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
        await handleAwaitingFiles(phone, session.id, agency.id, body, sessionData)
        break

      case 'processing':
        await sendText(phone, '⏳ Ainda estou analisando seu caso. Aguarde mais um instante...')
        break
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[whatsapp/webhook] unhandled error:', err)
    // Retorna 200 para Z-API não reenviar o webhook
    return NextResponse.json({ ok: true })
  }
}
