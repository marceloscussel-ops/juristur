import Link from 'next/link'
import { Scale, FileSearch, MessageSquare, Shield } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white font-bold text-xl">
          <Scale className="w-7 h-7" />
          JurisTur
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="text-blue-100 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Entrar
          </Link>
          <Link href="/cadastro" className="bg-white text-blue-800 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
            Cadastrar agência
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight mb-6">
          Assessoria jurídica inteligente<br />
          <span className="text-blue-200">para agências de turismo</span>
        </h1>
        <p className="text-blue-100 text-lg mb-10 max-w-2xl mx-auto">
          Analise situações jurídicas do seu negócio com o apoio de inteligência artificial especializada em direito do turismo brasileiro.
        </p>
        <Link href="/cadastro" className="inline-block bg-white text-blue-800 hover:bg-blue-50 font-semibold px-8 py-3.5 rounded-xl text-lg transition-colors shadow-lg">
          Começar gratuitamente
        </Link>

        <div className="grid sm:grid-cols-3 gap-6 mt-20 text-left">
          {[
            {
              icon: FileSearch,
              title: 'Análise especializada',
              desc: 'IA treinada em legislação de turismo: CDC, Lei Geral do Turismo, regulamentações ANAC',
            },
            {
              icon: MessageSquare,
              title: 'Orientação prática',
              desc: 'Receba orientações claras sobre riscos, fundamentos legais e próximos passos',
            },
            {
              icon: Shield,
              title: 'Histórico organizado',
              desc: 'Todos os seus casos registrados e acessíveis a qualquer momento',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/10 backdrop-blur rounded-xl p-6 text-white">
              <Icon className="w-8 h-8 text-blue-200 mb-3" />
              <h3 className="font-semibold text-lg mb-2">{title}</h3>
              <p className="text-blue-100 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
