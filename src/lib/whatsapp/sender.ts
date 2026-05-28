/**
 * sender.ts — Envia mensagens via Z-API
 * Docs: https://developer.z-api.io/
 */

import { env } from '@/lib/env'

const BASE_URL = () => {
  const id    = env('ZAPI_INSTANCE_ID')
  const token = env('ZAPI_TOKEN')
  if (!id || !token) throw new Error('ZAPI_INSTANCE_ID ou ZAPI_TOKEN não configurados.')
  return `https://api.z-api.io/instances/${id}/token/${token}`
}

async function zapiPost(path: string, body: unknown) {
  const clientToken = env('ZAPI_CLIENT_TOKEN')
  const res = await fetch(`${BASE_URL()}${path}`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(clientToken ? { 'Client-Token': clientToken } : {}),
    },
    body:    JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    console.error(`[Z-API] ${path} erro ${res.status}:`, text)
  }
  return res
}

/** Envia mensagem de texto simples. */
export async function sendText(phone: string, message: string) {
  return zapiPost('/send-text', { phone, message })
}

/** Envia múltiplos textos em sequência (para respostas longas). */
export async function sendTextParts(phone: string, parts: string[]) {
  for (const part of parts) {
    await sendText(phone, part)
    // Pequena pausa para manter ordem das mensagens
    await new Promise(r => setTimeout(r, 300))
  }
}

/** Envia documento (PDF, imagem) com legenda opcional. */
export async function sendDocument(phone: string, fileUrl: string, fileName: string, caption?: string) {
  return zapiPost('/send-document', { phone, document: fileUrl, fileName, caption: caption ?? '' })
}
