/**
 * transcriber.ts — Transcreve áudios do WhatsApp usando OpenAI Whisper.
 */

import OpenAI from 'openai'

export async function transcribeAudio(audioUrl: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada.')

  const openai = new OpenAI({ apiKey })

  console.log(`[transcriber] baixando áudio: ${audioUrl}`)

  // Baixa o áudio da URL fornecida pela Z-API
  const audioRes = await fetch(audioUrl)
  if (!audioRes.ok) {
    console.error(`[transcriber] erro ao baixar áudio: ${audioRes.status} ${audioRes.statusText}`)
    throw new Error(`Erro ao baixar áudio: ${audioRes.status}`)
  }

  const contentType = audioRes.headers.get('content-type') ?? 'audio/ogg'
  const arrayBuffer = await audioRes.arrayBuffer()
  const buffer      = Buffer.from(arrayBuffer)
  console.log(`[transcriber] áudio baixado: ${buffer.length} bytes, content-type=${contentType}`)

  // Whisper precisa de um File-like object
  const ext  = contentType.includes('mp4') ? 'mp4' : contentType.includes('mpeg') ? 'mp3' : 'ogg'
  const file = new File([buffer], `audio.${ext}`, { type: contentType })

  try {
    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      language: 'pt',
    })
    console.log(`[transcriber] transcrição ok: "${transcription.text.slice(0, 50)}"`)
    return transcription.text.trim()
  } catch (err) {
    console.error('[transcriber] erro Whisper:', err)
    throw err
  }
}
