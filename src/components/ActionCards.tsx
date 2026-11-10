import Link from 'next/link'
import { ArrowRight, FileSignature, FilePlus2, MessageCircleQuestion, Shield } from 'lucide-react'

/**
 * As ações que a agência pode disparar: gerar contrato, gerar outros
 * documentos, tirar uma dúvida jurídica e solicitar defesa.
 *
 * Aparece em dois lugares, pela mesma lista:
 *  - `compact` no topo do painel, onde é a primeira coisa que o usuário vê;
 *  - `full` na tela /novo, com a descrição inteira.
 *
 * Para acrescentar uma quinta ação, basta um item em ACTIONS.
 */

interface Action {
  href:  string
  title: string
  /** Descrição completa (variante `full`). */
  desc:  string
  /** Uma linha, para a variante `compact`. */
  short: string
  cta:   string
  icon:  typeof FileSignature
  /** Cores do ícone: fundo e traço. */
  bg:    string
  fg:    string
  /** Card visível mas inativo, enquanto o fluxo não está implementado. */
  soon?: boolean
}

export const ACTIONS: Action[] = [
  {
    href:  '/documentos/contrato/novo',
    title: 'Gerar contrato',
    desc:  'Contrato de prestação de serviço entre a agência e o consumidor, a partir do modelo padrão de turismo. Envie os documentos do cliente ou descreva os dados.',
    short: 'Prestação de serviço, a partir do modelo padrão de turismo.',
    cta:   'Gerar contrato',
    icon:  FileSignature,
    bg:    'bg-indigo-50',
    fg:    'text-indigo',
  },
  {
    href:  '/documentos/novo',
    title: 'Gerar documento',
    desc:  'E-mail ao cliente ou fornecedor, termo de ciência, formalização financeira, notificação, termo de renúncia — escolha o tipo, descreva o caso e a IA redige.',
    short: 'E-mail, termo de ciência, formalização financeira.',
    cta:   'Criar documento',
    icon:  FilePlus2,
    bg:    'bg-teal-50',
    fg:    'text-teal',
  },
  {
    href:  '/casos/novo',
    title: 'Dúvida jurídica',
    desc:  'Descreva a situação e receba a orientação com a base legal citada, a severidade do caso e os caminhos possíveis.',
    short: 'Orientação com base legal citada e risco medido.',
    cta:   'Abrir caso',
    icon:  MessageCircleQuestion,
    bg:    'bg-amber-50',
    fg:    'text-amber-700',
  },
  {
    href:  '/defesa',
    title: 'Solicitar defesa',
    desc:  'Atendimento humano: um advogado especializado em turismo assume o caso. A conversa segue pelo WhatsApp.',
    short: 'Um advogado assume o caso, pelo WhatsApp.',
    cta:   'Solicitar defesa',
    icon:  Shield,
    bg:    'bg-coral-50',
    fg:    'text-coral',
  },
]

interface Props {
  /** `compact`: fileira no topo do painel. `full`: tela dedicada. */
  variant?: 'compact' | 'full'
}

export default function ActionCards({ variant = 'full' }: Props) {
  const compact = variant === 'compact'

  return (
    <div className={compact ? 'grid gap-3 grid-cols-2 lg:grid-cols-4' : 'grid gap-4 sm:grid-cols-2'}>
      {ACTIONS.map(action => {
        const Icon = action.icon

        const body = (
          <>
            <div className="flex items-start justify-between gap-2 mb-2.5">
              <span
                className={`rounded-xl flex items-center justify-center shrink-0 ${action.bg} ${
                  compact ? 'w-8 h-8' : 'w-10 h-10'
                }`}
              >
                <Icon className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} ${action.fg}`} strokeWidth={1.9} />
              </span>
              {action.soon ? (
                <span className="badge badge-muted shrink-0 text-[10.5px]">Em breve</span>
              ) : compact ? (
                // Na versão compacta não há linha de CTA: a seta é o sinal de
                // que o card inteiro é clicável.
                <ArrowRight className="w-4 h-4 text-ink-40 shrink-0 transition-all group-hover:text-indigo group-hover:translate-x-0.5" />
              ) : null}
            </div>

            <h3 className={`text-ink font-semibold leading-snug ${compact ? 'text-[14px] mb-1' : 'j-h3 mb-1.5'}`}>
              {action.title}
            </h3>
            <p className={`j-caption leading-relaxed flex-1 ${compact ? 'line-clamp-2' : ''}`}>
              {compact ? action.short : action.desc}
            </p>

            {!compact && (
              <span
                className={`mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold ${
                  action.soon ? 'text-ink-40' : 'text-indigo'
                }`}
              >
                {action.soon ? 'Disponível em breve' : action.cta}
                {!action.soon && (
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                )}
              </span>
            )}
          </>
        )

        const base = `j-card flex flex-col ${compact ? 'p-4' : ''}`

        if (action.soon) {
          return (
            <div key={action.href} aria-disabled="true" className={`${base} opacity-60 cursor-default`}>
              {body}
            </div>
          )
        }

        return (
          <Link
            key={action.href}
            href={action.href}
            className={`${base} no-underline group transition-shadow hover:shadow-lg hover:border-indigo/30`}
          >
            {body}
          </Link>
        )
      })}
    </div>
  )
}
