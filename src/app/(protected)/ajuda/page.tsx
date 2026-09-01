import { Suspense } from 'react'
import { LifeBuoy } from 'lucide-react'
import HelpTabs from '@/components/HelpTabs'

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '5511999999999'

export default function AjudaPage() {
  const supportMessage = encodeURIComponent('Olá! Preciso de ajuda com o TurisGuard.')
  const supportUrl     = `https://wa.me/${WHATSAPP_NUMBER}?text=${supportMessage}`

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
