/**
 * transcriber.ts — Transcreve áudio para texto usando OpenAI Whisper.
 *
 * Duas portas de entrada, mesma transcrição:
 *   · `transcribeAudio(url)`  — áudio do WhatsApp, baixado da URL da Z-API;
 *   · `transcribeFile(file)`  — áudio gravado no navegador (ditado nos campos).
 */

import OpenAI from 'openai'
import { env } from '@/lib/env'

/**
 * Vocabulário que o Whisper usa como viés, não como regra. Sem isto ele
 * escreve "si de ce" no lugar de "CDC" e erra os nomes do setor, que são
 * justamente as palavras que mais aparecem num relato de agência.
 */
const VOCABULARIO_PT =
  'CDC, Código de Defesa do Consumidor, Procon, JEC, Juizado Especial Cível, ' +
  'danos morais, no-show, overbooking, reembolso, remarcação, pacote turístico, ' +
  'ANAC, voucher, milhas, Latam, Gol, Azul, CVC, Decolar, Booking.'

function client(): OpenAI {
  const apiKey = env('OPENAI_API_KEY')
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada.')
  return new OpenAI({ apiKey })
}

/** Transcreve um arquivo de áudio já em memória. */
export async function transcribeFile(file: File): Promise<string> {
  const openai = client()

  try {
    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      language: 'pt',
      prompt: VOCABULARIO_PT,
    })
    console.log(`[transcriber] transcrição ok: "${transcription.text.slice(0, 50)}"`)
    return transcription.text.trim()
  } catch (err) {
    console.error('[transcriber] erro Whisper:', err)
    throw err
  }
}

/** Baixa o áudio de uma URL (Z-API) e transcreve. */
export async function transcribeAudio(audioUrl: string): Promise<string> {
  console.log(`[transcriber] baixando áudio...`)

  const audioRes = await fetch(audioUrl)
  if (!audioRes.ok) {
    console.error(`[transcriber] erro ao baixar áudio: ${audioRes.status} ${audioRes.statusText}`)
    throw new Error(`Erro ao baixar áudio: ${audioRes.status}`)
  }

  const contentType = audioRes.headers.get('content-type') ?? 'audio/ogg'
  const arrayBuffer = await audioRes.arrayBuffer()
  const buffer      = Buffer.from(arrayBuffer)
  console.log(`[transcriber] áudio baixado: ${buffer.length} bytes, content-type=${contentType}`)

  // Whisper precisa de um File-like object com extensão coerente.
  const ext  = contentType.includes('mp4') ? 'mp4' : contentType.includes('mpeg') ? 'mp3' : 'ogg'
  const file = new File([buffer], `audio.${ext}`, { type: contentType })

  return transcribeFile(file)
}
