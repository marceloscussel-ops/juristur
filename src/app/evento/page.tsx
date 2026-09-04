import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck, Zap, Scale } from 'lucide-react'
import TGLogo from '@/components/TGLogo'
import SignupForm from '@/components/SignupForm'

export const metadata: Metadata = {
  title:       'TurisGuard — 7 dias grátis para sua agência',
  description: 'Orientação jurídica para agências de turismo em segundos. Crie sua conta e teste grátis por 7 dias, sem cartão.',
  robots:      { index: false, follow: false }, // página de campanha: fora do índice
}

const BULLETS = [
  {
    icon:  Zap,
    titulo: 'Resposta em segundos',
    texto:  'Descreva o problema em português comum e receba a orientação com a base legal citada.',
  },
  {
    icon:  ShieldCheck,
    titulo: 'Saiba o tamanho do risco',
    texto:  'Cada caso vem classificado por risco — do leve ao elevadíssimo — para você priorizar.',
  },
  {
    icon:  Scale,
    titulo: 'Advogado quando precisar',
    texto:  'Caso delicado? Escale para atendimento humano direto na plataforma.',
  },
]

export default function EventoPage() {
  return (
    <div className="min-h-screen bg-surface px-4 py-8">
      <div className="w-full max-w-[440px] mx-auto">

        {/* Marca */}
        <div className="text-center mb-7">
          <TGLogo size={38} variant="color" withWordmark />
        </div>

        {/* Proposta */}
        <div className="text-center mb-7">
          <span className="badge badge-indigo mb-3 inline-flex">7 dias grátis · sem cartão</span>
          <h1 className="j-h1 mb-2">
            Dúvida jurídica na agência? Resolva em segundos.
          </h1>
          <p className="j-body text-ink-80">
            Cancelamento, overbooking, extravio de bagagem, reclamação de cliente.
            O TurisGuard responde com base na lei do turismo — sem juridiquês.
          </p>
        </div>

        {/* Diferenciais */}
        <div className="space-y-2.5 mb-7">
          {BULLETS.map(b => {
            const Icon = b.icon
            return (
              <div key={b.titulo} className="j-card flex items-start gap-3 py-3.5">
                <span className="w-8 h-8 rounded-md bg-indigo-pale text-indigo flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4" />
                </span>
                <div>
                  <p className="text-[15px] font-bold text-ink mb-0.5">{b.titulo}</p>
                  <p className="j-body text-ink-80">{b.texto}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Cadastro */}
        <div className="j-card animate-fade-in">
          <div className="text-center mb-5">
            <p className="j-h3 mb-1">Crie sua conta agora</p>
            <p className="j-caption">Leva menos de um minuto — e já dá para testar aqui mesmo.</p>
          </div>
          <SignupForm submitLabel="Começar teste grátis" origem="evento" />
        </div>

        <p className="text-center j-caption mt-5">
          Já tem conta?{' '}
          <Link href="/login" className="text-indigo hover:underline font-medium">Entrar</Link>
        </p>

        <p className="text-center j-caption mt-6 text-ink-40">
          As orientações são informativas e não substituem parecer jurídico.
        </p>
      </div>
    </div>
  )
}
