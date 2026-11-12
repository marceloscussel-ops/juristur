import type { Metadata } from 'next'
import TGLogo from '@/components/TGLogo'
import OfflineRetry from '@/components/OfflineRetry'
import { WifiOff } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Sem conexão — TurisGuard',
  robots: { index: false, follow: false },
}

/**
 * Tela servida pelo service worker quando a navegação falha por falta de rede.
 *
 * Precisa ser estática: é pré-cacheada no build e renderizada com o aparelho
 * offline, então não pode depender de sessão, de Supabase nem de nada que
 * precise de servidor.
 */
export const dynamic = 'force-static'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[400px]">

        <div className="text-center mb-8">
          <TGLogo size={36} variant="color" withWordmark />
        </div>

        <div className="j-card text-center space-y-4 animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-indigo/10 flex items-center justify-center mx-auto">
            <WifiOff className="w-7 h-7 text-indigo" />
          </div>

          <div>
            <h1 className="j-h1 mb-1">Sem conexão</h1>
            <p className="j-caption">
              O TurisGuard precisa de internet para abrir seus casos e documentos.
              Assim que a conexão voltar, é só tentar de novo.
            </p>
          </div>

          <OfflineRetry />

          <div className="j-divider" />

          <p className="j-caption">
            Nada do que você escreveu foi perdido: os textos só são enviados
            quando a conexão volta.
          </p>
        </div>

      </div>
    </div>
  )
}
