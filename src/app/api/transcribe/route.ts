/**
 * /api/transcribe — Ditado por voz dos campos descritivos.
 *
 * O navegador grava com MediaRecorder e manda o blob; aqui ele vira texto no
 * Whisper e volta para o campo, onde a pessoa revisa antes de enviar. Nada é
 * gravado em banco nem em storage: o áudio existe só durante a requisição.
 *
 * Vale para agência e para advogado — qualquer usuário autenticado —, porque
 * os dois lados têm campos de texto longo.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { transcribeFile } from '@/lib/whatsapp/transcriber'

// Transcrever ~3 min de áudio passa do default de 10s da Vercel.
export const maxDuration = 60

/**
 * Teto de tamanho do áudio. O corpo de uma function na Vercel para em 4,5 MB,
 * então 4 MB é o limite real; o cliente já corta a gravação em 3 min, o que dá
 * bem menos que isso. Serve também como teto de custo por chamada.
 */
const MAX_BYTES = 4 * 1024 * 1024

/** O que o MediaRecorder produz: webm/opus no Chrome e Firefox, mp4/aac no Safari. */
const TIPOS_ACEITOS = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'video/mp4']

function extensaoDe(mime: string): string {
  if (mime.includes('webm')) return 'webm'
  if (mime.includes('ogg'))  return 'ogg'
  if (mime.includes('mpeg')) return 'mp3'
  if (mime.includes('wav'))  return 'wav'
  return 'mp4'
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

    const formData = await request.formData()
    const audio    = formData.get('audio')

    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json({ error: 'Nenhum áudio recebido.' }, { status: 400 })
    }
    if (audio.size > MAX_BYTES) {
      return NextResponse.json(
        { error: 'Gravação muito longa. Grave em trechos de até 3 minutos.' },
        { status: 413 },
      )
    }

    // O type vem do navegador com parâmetros (`audio/webm;codecs=opus`).
    const mime = (audio.type || 'audio/webm').split(';')[0].trim().toLowerCase()
    if (!TIPOS_ACEITOS.includes(mime)) {
      return NextResponse.json({ error: 'Formato de áudio não suportado.' }, { status: 415 })
    }

    // O Whisper decide o decoder pela extensão do nome, não pelo content-type.
    const buffer = Buffer.from(await audio.arrayBuffer())
    const file   = new File([buffer], `ditado.${extensaoDe(mime)}`, { type: mime })

    const text = await transcribeFile(file)

    if (!text) {
      return NextResponse.json(
        { error: 'Não consegui entender o áudio. Tente falar mais perto do microfone.' },
        { status: 422 },
      )
    }

    return NextResponse.json({ text })
  } catch (err) {
    console.error('[transcribe] erro:', err)
    return NextResponse.json(
      { error: 'Não foi possível transcrever o áudio. Tente de novo.' },
      { status: 500 },
    )
  }
}
