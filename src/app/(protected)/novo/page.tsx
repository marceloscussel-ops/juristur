import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import ActionCards from '@/components/ActionCards'

/**
 * Tela dedicada de ações — a mesma lista que aparece no topo do painel, aqui
 * com a descrição inteira. É o destino do "Nova ação" das telas internas
 * (dentro de um caso, por exemplo), onde os cards do painel não estão à vista.
 */
export default function NovaAcaoPage() {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 j-caption text-indigo hover:text-ink transition-colors no-underline mb-5"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar para o painel
      </Link>

      <div className="mb-6">
        <p className="j-overline">O que você precisa agora?</p>
        <h1 className="j-h1 mt-0.5">Escolha uma ação</h1>
        <p className="j-caption mt-1">
          Tudo que você gerar aqui fica no seu painel, junto com os casos.
        </p>
      </div>

      <ActionCards variant="full" />
    </div>
  )
}
