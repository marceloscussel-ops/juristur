import Link from 'next/link'
import { Scale, FileSearch, MessageSquare, Shield, BookOpen, CheckCircle } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen j-hero flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 sm:px-10 py-5">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-amber" />
          <span className="font-display text-[20px] text-white">JurisTur</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="j-nav-link h-auto py-1.5 border-b-0 no-underline">
            Entrar
          </Link>
          <Link href="/cadastro" className="btn btn-warm no-underline">
            Cadastrar agência
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-6 py-20">

        {/* Hero */}
        <div className="text-center max-w-3xl">
          <p className="j-overline mb-4 !text-amber/80">Plataforma jurídica para turismo</p>
          <h1 className="font-display text-[42px] sm:text-[54px] font-bold text-white leading-tight tracking-[-0.02em] mb-6">
            Análise jurídica baseada em casos reais — em segundos
          </h1>
          <p className="text-white/50 text-[16px] max-w-xl mx-auto leading-relaxed mb-10">
            IA especializada em direito do turismo combinada com um banco de processos judiciais reais do setor.
            Orientação precisa, fundamentada em como a justiça brasileira decide casos como o seu.
          </p>
          <Link href="/cadastro" className="btn btn-warm btn-lg no-underline">
            Começar gratuitamente
          </Link>
        </div>

        {/* Diferencial — banner destaque */}
        <div className="mt-16 w-full max-w-4xl bg-white/[0.06] border border-amber/20 rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start">
          <div className="shrink-0">
            <BookOpen className="w-10 h-10 text-amber" />
          </div>
          <div>
            <h2 className="font-display text-[20px] text-white mb-2">
              Não é só IA — é IA treinada com processos reais do setor
            </h2>
            <p className="text-white/50 text-[14px] leading-relaxed mb-4">
              Nossa base inclui processos judiciais reais envolvendo agências de viagem, operadoras e companhias aéreas.
              Cada análise consulta automaticamente casos similares — incluindo como o juiz decidiu, quais leis foram aplicadas
              e qual foi a condenação.
            </p>
            <ul className="flex flex-col gap-2">
              {[
                'Casos reais de cancelamento, overbooking, extravio de bagagem e mais',
                'Jurisprudência aplicada: CDC, Convenção de Montreal, Lei do Turismo',
                'Decisões judiciais como referência — sabe o que esperar antes de agir',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2 text-white/60 text-[13px]">
                  <CheckCircle className="w-4 h-4 text-amber shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Cards de features */}
        <div className="grid sm:grid-cols-3 gap-4 mt-8 w-full max-w-4xl">
          {[
            {
              icon: FileSearch,
              title: 'Análise em segundos',
              desc: 'Descreva o caso e receba orientação jurídica especializada — via plataforma ou WhatsApp',
            },
            {
              icon: MessageSquare,
              title: 'Fundamentos práticos',
              desc: 'Riscos reais, leis aplicáveis e próximos passos claros para cada situação',
            },
            {
              icon: Shield,
              title: 'Histórico organizado',
              desc: 'Todos os casos da agência registrados, com análise e documentos em um só lugar',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/[0.06] border border-white/10 rounded-lg p-6 text-left">
              <Icon className="w-6 h-6 text-amber mb-3" />
              <h3 className="font-body text-[15px] font-semibold text-white mb-1.5">{title}</h3>
              <p className="text-white/50 text-[13px] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* CTA final */}
        <div className="mt-16 text-center">
          <p className="text-white/30 text-[13px] mb-4">
            Sem custo para começar. Sem cartão de crédito.
          </p>
          <Link href="/cadastro" className="btn btn-warm no-underline">
            Cadastrar minha agência
          </Link>
        </div>

      </main>
    </div>
  )
}
