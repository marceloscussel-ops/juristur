/**
 * transcriber.ts — Transcreve áudios do WhatsApp usando OpenAI Whisper.
 */

import OpenAI from 'openai'
import { Readable } from 'stream'

export async function transcribeAudio(audioUrl: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada.')

  const openai = new OpenAI({ apiKey })

  // Baixa o áudio da URL fornecida pela Z-API
  const audioRes = await fetch(audioUrl)
  if (!audioRes.ok) throw new Error(`Erro ao baixar áudio: ${audioRes.status}`)

  const arrayBuffer = await audioRes.arrayBuffer()
  const buffer      = Buffer.from(arrayBuffer)

  // Whisper precisa de um File-like object
  const file = new File([buffer], 'audio.ogg', { type: 'audio/ogg' })

  const transcription = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    language: 'pt',
  })

  return transcription.text.trim()
}
