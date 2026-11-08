import Link from 'next/link'
import { CheckCircle2, Clock3, ShieldCheck, Tag } from 'lucide-react'
import { CARENCIA_DEFESA_DIAS, type DefenseInfo } from '@/lib/plans'
import { formatDate } from '@/lib/datetime'

/**
 * Saldo de defesas da agência, em dois formatos:
 *   · `card` — bloco completo da tela "Solicitar defesa" (inclusas / utilizadas)
 *   · `line` — uma linha de legenda, usada embaixo do botão dentro do caso
 *
 * O texto é o mesmo nos dois lugares de propósito: a agência não pode ler
 * "defesa inclusa" numa tela e "sob orçamento" na outra. Fonte única da regra:
 * getDefenseInfo() em plans.ts.
 */

/** Frase curta sobre a situação da defesa — a mesma em todas as telas. */
export function defesaResumo(info: DefenseInfo): string {
  switch (info.state) {
    case 'trial':
      return `${info.remaining} de ${info.total} solicitações de defesa gratuitas restantes`
    case 'expirada':
      return 'Período gratuito encerrado'
    case 'incluida':
      return info.total === 1
        ? `Defesa inclusa no plano ${info.planLabel} — disponível`
        : `${info.remaining} de ${info.total} defesas inclusas disponíveis neste ano`
    case 'carencia':
      return `Defesa inclusa disponível a partir de ${info.carenciaUntil ? formatDate(info.carenciaUntil) : '—'}`
    case 'esgotada':
      return info.total === 1
        ? 'Você já usou a defesa inclusa deste ano — esta será orçada com o advogado'
        : `Você já usou as ${info.total} defesas inclusas deste ano — esta será orçada com o advogado`
    case 'nao_incluida':
      return `O plano ${info.planLabel} não inclui defesa — o advogado envia um orçamento`
  }
}

export function DefesaQuotaLine({ info }: { info: DefenseInfo }) {
  return <p className="j-caption mt-2 text-center">{defesaResumo(info)}</p>
}

/** Bloco com os números: inclusas no ano, utilizadas e em andamento. */
export default function DefesaQuota({ info }: { info: DefenseInfo }) {
  const assinante = info.state !== 'trial' && info.state !== 'expirada'
  const semCota   = info.state === 'nao_incluida'

  return (
    <div className="j-card mb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="j-overline">
            {assinante ? `Plano ${info.planLabel}` : 'Período gratuito'}
          </p>
          <p className="j-body font-medium mt-0.5">
            {semCota
              ? 'Defesa sob orçamento'
              : assinante
                ? info.total === 1
                  ? '1 defesa inclusa por ano'
                  : `${info.total} defesas inclusas por ano`
                : `${info.total} solicitações de defesa incluídas`}
          </p>
          {assinante && !semCota && info.periodStart && info.periodEnd && (
            <p className="j-caption mt-0.5">
              Ano de assinatura: {formatDate(info.periodStart)} a {formatDate(info.periodEnd)}
            </p>
          )}
        </div>

        {!semCota && (
          <div className="flex items-center gap-4 shrink-0">
            <Numero valor={info.used}      rotulo="utilizadas" />
            <Numero valor={info.remaining} rotulo="disponíveis" destaque />
          </div>
        )}
      </div>

      {/* Situação atual, com a mesma frase usada dentro do caso */}
      <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-surface px-3.5 py-3">
        <Icone info={info} />
        <div className="min-w-0">
          <p className="text-[13px] text-ink-80">{defesaResumo(info)}</p>

          {info.state === 'carencia' && (
            <p className="j-caption mt-0.5">
              O contrato prevê carência de {CARENCIA_DEFESA_DIAS} dias para o escalonamento
              sem custo. Antes disso, você pode falar com o advogado e receber um orçamento.
            </p>
          )}
          {semCota && (
            <p className="j-caption mt-0.5">
              Os planos Professional (1 por ano) e Enterprise (3 por ano) incluem defesa
              com advogado.{' '}
              <Link href="/assinar" className="underline text-indigo">Ver planos</Link>
            </p>
          )}
          {info.pending > 0 && (
            <p className="j-caption mt-0.5">
              {info.pending === 1
                ? '1 solicitação aguardando o advogado confirmar o atendimento.'
                : `${info.pending} solicitações aguardando o advogado confirmar o atendimento.`}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Numero({ valor, rotulo, destaque = false }: { valor: number; rotulo: string; destaque?: boolean }) {
  return (
    <div className="text-center">
      <p className={`font-display font-extrabold text-[26px] leading-none ${destaque ? 'text-indigo' : 'text-ink-40'}`}>
        {valor}
      </p>
      <p className="j-caption mt-0.5">{rotulo}</p>
    </div>
  )
}

function Icone({ info }: { info: DefenseInfo }) {
  const cls = 'w-4 h-4 shrink-0 mt-0.5'
  if (info.state === 'incluida' || info.state === 'trial') {
    return <ShieldCheck className={`${cls} text-teal`} strokeWidth={1.9} />
  }
  if (info.state === 'carencia') return <Clock3 className={`${cls} text-amber-700`} strokeWidth={1.9} />
  if (info.state === 'nao_incluida' || info.state === 'esgotada') {
    return <Tag className={`${cls} text-ink-40`} strokeWidth={1.9} />
  }
  return <CheckCircle2 className={`${cls} text-ink-40`} strokeWidth={1.9} />
}
