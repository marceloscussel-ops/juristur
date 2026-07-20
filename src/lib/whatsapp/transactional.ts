/**
 * transactional.ts — Ponto único de envio de notificações transacionais.
 *
 * Esta é a FRONTEIRA de troca de provider de WhatsApp. A lógica de negócio
 * (o que notificar) nunca fala com o provider direto — fala com este módulo.
 *
 *   HOJE: Z-API, texto livre.
 *   AMANHÃ (WhatsApp Cloud API da Meta): mensagens business-initiated enviadas
 *   FORA da janela de 24h exigem um TEMPLATE pré-aprovado (categoria utility).
 *   Por isso cada notificação carrega tanto o texto livre (`text`, usado pela
 *   Z-API e válido dentro da janela de 24h na Meta) quanto a identidade do
 *   template + parâmetros (`templateName`, `params`), já prontos para a virada.
 *
 * Na migração, só ESTE arquivo muda.
 */

import { sendText } from './sender'

export interface TransactionalMessage {
  /** Telefone do destinatário, normalizado (formato Z-API: 55 + DDD + 8 dígitos). */
  to: string
  /** Nome do template aprovado na Meta. Usado só na Cloud API; ignorado pela Z-API. */
  templateName: string
  /** Valores dos placeholders {{1}}, {{2}}... do template Meta, na ordem. */
  params: string[]
  /** Render em texto livre — usado pela Z-API hoje e dentro da janela 24h na Meta. */
  text: string
}

/** Envia uma notificação transacional pelo provider ativo. */
export async function sendTransactional(msg: TransactionalMessage): Promise<void> {
  // ── Provider atual: Z-API (texto livre) ──
  await sendText(msg.to, msg.text)

  // ── Migração Meta Cloud API (referência para o dia da troca): ──
  //   const inWindow = await hasOpen24hWindow(msg.to)
  //   if (inWindow) await sendText(msg.to, msg.text)                        // serviço → grátis
  //   else          await sendTemplate(msg.to, msg.templateName, msg.params) // utility → cobrado
}
