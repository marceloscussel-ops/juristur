import Link from 'next/link'
import { Scale, FileSearch, MessageSquare, Shield } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-navy flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 sm:px-10 py-5">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-gold" />
          <span className="font-display text-[20px] text-white">JurisTur</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="j-nav-link no-underline">
            Entrar
          </Link>
          <Link href="/cadastro" className="btn btn-gold no-underline">
            Cadastrar agência
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center">
        <p className="j-overline mb-4 text-gold">Plataforma jurídica para turismo</p>
        <h1 className="font-display text-[42px] sm:text-[54px] font-medium text-white leading-tight max-w-3xl mb-6">
          Assessoria jurídica inteligente para agências de turismo
        </h1>
        <p className="text-white/60 text-[16px] max-w-xl leading-relaxed mb-10">
          Analise situações jurídicas do seu negócio com o apoio de inteligência artificial especializada em direito do turismo brasileiro.
        </p>
        <Link href="/cadastro" className="btn btn-gold btn-lg no-underline">
          Começar gratuitamente
        </Link>

        {/* Cards de features */}
        <div className="grid sm:grid-cols-3 gap-4 mt-20 w-full max-w-4xl">
          {[
            {
              icon: FileSearch,
              title: 'Análise especializada',
              desc: 'IA com conhecimento em CDC, Lei Geral do Turismo e regulamentações ANAC',
            },
            {
              icon: MessageSquare,
              title: 'Orientação prática',
              desc: 'Riscos, fundamentos legais e próximos passos claros para cada situação',
            },
            {
              icon: Shield,
              title: 'Histórico organizado',
              desc: 'Todos os seus casos registrados e acessíveis a qualquer momento',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/[0.06] border border-white/10 rounded-lg p-6 text-left">
              <Icon className="w-6 h-6 text-gold mb-3" />
              <h3 className="font-body text-[15px] font-semibold text-white mb-1.5">{title}</h3>
              <p className="text-white/50 text-[13px] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
