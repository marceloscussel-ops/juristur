import { Suspense } from 'react'
import { LifeBuoy } from 'lucide-react'
import HelpTabs from '@/components/HelpTabs'
import { whatsappLink } from '@/lib/whatsapp/public-number'

export default function AjudaPage() {
  const supportUrl = whatsappLink('Olá! Preciso de ajuda com o TurisGuard.')

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="j-section-header mb-6">
        <div>
          <p className="j-overline flex items-center gap-1.5">
            <LifeBuoy className="w-3.5 h-3.5" /> Central de Ajuda
          </p>
          <h1 className="j-h1 mt-0.5">Como podemos ajudar?</h1>
          <p className="j-caption mt-1">Passo a passo, funcionalidades e respostas rápidas para as dúvidas mais comuns.</p>
        </div>
      </div>

      <Suspense fallback={null}>
        <HelpTabs supportUrl={supportUrl} />
      </Suspense>
    </div>
  )
}
