import { MessageCircle } from 'lucide-react'
import { WHATSAPP_NUMBER, whatsappLink, formatWhatsappNumber } from '@/lib/whatsapp/public-number'

/**
 * Card que revela o número do TurisGuard no WhatsApp.
 *
 * Sem ele o canal é invisível: a agência não tem como adivinhar para qual número
 * escrever. Por isso o número aparece em texto (para salvar na agenda) além do
 * botão que abre a conversa já com a primeira mensagem escrita.
 *
 * Não renderiza nada quando a env var não está configurada — melhor sumir do que
 * mostrar um link quebrado.
 */
export default function WhatsappCta() {
  if (!WHATSAPP_NUMBER) return null

  const href = whatsappLink('Olá! Quero usar o TurisGuard pelo WhatsApp.')

  return (
    <div className="j-card flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <MessageCircle className="w-5 h-5 text-indigo shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h2 className="j-h3">Use o TurisGuard pelo WhatsApp</h2>
          <p className="j-caption mt-1">
            Mande o caso por mensagem ou áudio e a análise volta na conversa. Salve o nosso número:{' '}
            <strong className="font-semibold text-ink whitespace-nowrap">{formatWhatsappNumber()}</strong>
          </p>
        </div>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-outline no-underline shrink-0 self-start sm:self-auto"
      >
        <MessageCircle className="w-4 h-4" />
        Abrir conversa
      </a>
    </div>
  )
}
