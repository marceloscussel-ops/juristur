import type { Metadata } from 'next'
import Link from 'next/link'
import { Zap, ShieldCheck, Scale, Check, ArrowRight } from 'lucide-react'
import TGLogo from '@/components/TGLogo'
import SignupForm from '@/components/SignupForm'

export const metadata: Metadata = {
  title:       'TurisGuard — 7 dias grátis para sua agência',
  description: 'Orientação jurídica para agências de turismo em segundos. Crie sua conta e teste grátis por 7 dias, sem cartão.',
  robots:      { index: false, follow: false }, // página de campanha: fora do índice
}

const BENEFICIOS = [
  {
    icon:   Zap,
    titulo: 'Resposta em segundos',
    texto:  'Descreva em português comum. Recebe a orientação com a lei citada.',
  },
  {
    icon:   ShieldCheck,
    titulo: 'O risco medido',
    texto:  'Cada caso classificado de leve a elevadíssimo — você sabe o que é urgente.',
  },
  {
    icon:   Scale,
    titulo: 'Advogado quando precisar',
    texto:  'Caso delicado? Escale para atendimento humano na própria plataforma.',
  },
]

const PASSOS = [
  'Descreva o caso e anexe documentos, se tiver',
  'A IA analisa com base na legislação do turismo',
  'Você recebe o parecer e tira dúvidas ali mesmo',
]

export default function EventoPage() {
  return (
    <div className="min-h-screen bg-surface">

      {/*
        Navegadores restauram a posição de rolagem por URL (scrollRestoration
        'auto'). Quem já tinha aberto a página via QR code voltava a ela rolada,
        com o logo e a chamada principal fora da tela. Roda durante o parse do
        HTML — antes da restauração — para não haver salto visível.
        Uma âncora explícita (ex.: /evento#cadastro) continua sendo respeitada.
      */}
      <script
        dangerouslySetInnerHTML={{
          __html: "try{if('scrollRestoration' in history){history.scrollRestoration='manual'}if(!location.hash){window.scrollTo(0,0)}}catch(e){}",
        }}
      />

      {/* ===== DOBRA: proposta + CTA visível sem rolar ===== */}
      <section
        className="px-5 pt-7 pb-9 text-center"
        style={{ background: 'linear-gradient(160deg, #0B121C 0%, #1B2942 100%)' }}
      >
        <div className="max-w-[440px] mx-auto">
          {/* TGLogo é inline: precisa de um bloco próprio para não dividir a linha com o badge */}
          <div>
            <TGLogo size={34} variant="mono-light" withWordmark />
          </div>

          <div className="mt-6">
            <span
              className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-[12px] font-semibold"
              style={{ background: 'rgba(91,87,232,.22)', color: '#B9BCFF' }}
            >
              7 dias grátis · sem cartão
            </span>
          </div>

          <h1
            className="mt-3 text-white"
            style={{ fontFamily: 'Sora,sans-serif', fontSize: 30, lineHeight: 1.15, fontWeight: 700, letterSpacing: '-0.02em' }}
          >
            Cliente ameaçando<br />processar a agência?
          </h1>

          <p className="mt-3 text-[15px] leading-relaxed" style={{ color: 'rgba(255,255,255,.72)' }}>
            Saiba em segundos o que a lei diz, qual o tamanho do risco e o que
            fazer — sem juridiquês e sem esperar advogado.
          </p>

          <a href="#cadastro" className="btn btn-accent no-underline w-full mt-6 justify-center" style={{ height: 50 }}>
            Criar minha conta grátis
            <ArrowRight className="w-4 h-4" />
          </a>

          <p className="mt-2.5 text-[12.5px]" style={{ color: 'rgba(255,255,255,.55)' }}>
            Leva menos de um minuto · não pedimos cartão
          </p>
        </div>
      </section>

      <div className="px-5 py-8">
        <div className="max-w-[440px] mx-auto">

          {/* ===== O produto: mostrar o que a pessoa recebe ===== */}
          <p className="j-overline text-center mb-3">Veja o que você recebe</p>

          <div className="j-card p-0 overflow-hidden mb-3">
            <div className="px-4 py-3 flex items-center justify-between gap-2 border-b border-ink-15">
              <span className="j-caption font-semibold">Análise do caso</span>
              <span className="badge badge-amber">Risco elevado</span>
            </div>

            <div className="px-4 py-4 space-y-3.5">
              <div>
                <p className="text-[13px] font-bold text-ink mb-0.5">O que está acontecendo</p>
                <p className="text-[13.5px] leading-relaxed text-ink-80">
                  O cliente teve a bagagem extraviada por 5 dias em viagem vendida pela
                  agência e cobra de você o gasto com roupas e itens de higiene.
                </p>
              </div>
              <div>
                <p className="text-[13px] font-bold text-ink mb-0.5">O que a lei diz</p>
                <p className="text-[13.5px] leading-relaxed text-ink-80">
                  A responsabilidade pelo transporte é da companhia aérea, mas o CDC
                  prevê responsabilidade solidária na cadeia de fornecimento…
                </p>
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <span className="j-caption">+ O que fazer</span>
                <span className="j-caption">·</span>
                <span className="j-caption">+ Os caminhos possíveis</span>
              </div>
            </div>
          </div>

          <p className="j-caption text-center mb-8">
            Exemplo ilustrativo. Cada análise cita a base legal do seu caso.
          </p>

          {/* ===== Benefícios ===== */}
          <div className="space-y-2.5 mb-8">
            {BENEFICIOS.map(b => {
              const Icon = b.icon
              return (
                <div key={b.titulo} className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-md bg-indigo-pale text-indigo flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-[15px] font-bold text-ink">{b.titulo}</p>
                    <p className="text-[13.5px] leading-relaxed text-ink-80">{b.texto}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ===== Credibilidade: as fontes são reais e verificáveis ===== */}
          <div className="j-card mb-8 text-center">
            <p className="j-overline mb-2">Baseado na legislação aplicável</p>
            <p className="j-body text-ink-80">
              Lei 11.771/08 (Política Nacional de Turismo) · Código de Defesa do
              Consumidor · Resoluções da ANAC · Código Civil
            </p>
          </div>

          {/* ===== Como funciona ===== */}
          <p className="j-overline text-center mb-3">Como funciona</p>
          <ol className="space-y-2.5 mb-8 list-none p-0 m-0">
            {PASSOS.map((p, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo text-white flex items-center justify-center text-[12px] font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <span className="j-body text-ink-80">{p}</span>
              </li>
            ))}
          </ol>

          {/* ===== Cadastro ===== */}
          <div id="cadastro" className="j-card animate-fade-in scroll-mt-4">
            <div className="text-center mb-5">
              <p className="j-h3 mb-1">Comece agora, é grátis</p>
              <p className="j-caption">7 dias para testar · sem cartão de crédito</p>
            </div>
            <SignupForm submitLabel="Começar teste grátis" origem="evento" />
          </div>

          {/* Reforço final */}
          <ul className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1.5 list-none p-0">
            {['Sem cartão de crédito', 'Sem instalação', 'Cancele quando quiser'].map(t => (
              <li key={t} className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-teal shrink-0" />
                <span className="j-caption">{t}</span>
              </li>
            ))}
          </ul>

          <p className="text-center j-caption mt-6">
            Já tem conta?{' '}
            <Link href="/login" className="text-indigo hover:underline font-medium">Entrar</Link>
          </p>

          <p className="text-center j-caption mt-5 text-ink-40">
            As orientações são informativas e não substituem parecer jurídico.
          </p>
        </div>
      </div>
    </div>
  )
}
