import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import TGLogo from '@/components/TGLogo'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import { CONTRATO_CORPO, CONTRATO_VERSAO, CONTRATO_VIGENTE_DESDE } from '@/lib/contrato/termos'
import { formatDateLong } from '@/lib/datetime'

export const metadata = {
  title: 'Contrato de licença de uso — TurisGuard',
  description:
    'Contrato de licença de uso da plataforma TurisGuard e prestação de serviços de tecnologia e assessoria para agências de turismo.',
}

/**
 * Página pública do contrato. É o link que o usuário abre quando quer ler antes
 * de aceitar — no cadastro, na assinatura e no rodapé do site. Mostra só o
 * corpo genérico: o Anexo I (dados da agência e do plano) é individual e fica
 * no /perfil, dentro de cada aceite registrado.
 */
export default function ContratoPage() {
  return (
    <div className="min-h-screen bg-surface py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6 print:hidden">
          <Link href="/" className="inline-flex items-center no-underline">
            <TGLogo size={30} variant="color" withWordmark />
          </Link>
          <Link href="/" className="inline-flex items-center gap-1.5 j-caption no-underline hover:text-ink">
            <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao site
          </Link>
        </div>

        <div className="j-card">
          <div className="flex items-start gap-3 pb-5 mb-5 border-b border-[rgba(13,13,26,0.07)]">
            <FileText className="w-5 h-5 text-indigo shrink-0 mt-0.5" />
            <div>
              <p className="j-overline">Documento contratual</p>
              <h1 className="j-h2 mt-0.5">Contrato de licença de uso</h1>
              <p className="j-caption mt-1">
                {/* Meio-dia de Brasília: a data pura seria lida como UTC e voltaria um dia. */}
                Versão {CONTRATO_VERSAO} · em vigor desde{' '}
                {formatDateLong(`${CONTRATO_VIGENTE_DESDE}T12:00:00-03:00`)}
              </p>
            </div>
          </div>

          <div className="j-alert j-alert-info mb-6">
            <span>
              Este é o texto geral, igual para todas as agências. Os seus dados, o plano
              contratado, o valor e a forma de pagamento constam do <strong>Anexo I</strong>,
              que é parte deste contrato e fica registrado no seu aceite — você encontra o
              contrato completo, com o anexo, em <strong>Perfil → Contrato</strong>.
            </span>
          </div>

          <MarkdownRenderer content={CONTRATO_CORPO} />
        </div>

        <p className="text-center j-caption mt-6 print:hidden">
          FIDEMARC TECNOLOGIA LTDA · CNPJ 68.390.480/0001-88 · Garibaldi/RS
        </p>
      </div>
    </div>
  )
}
