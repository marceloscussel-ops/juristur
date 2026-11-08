'use client'

import { FileText } from 'lucide-react'
import { CONTRATO_VERSAO } from '@/lib/contrato/termos'

/**
 * Caixa de aceite do contrato. Usada no cadastro e no modal de assinatura —
 * o mesmo componente nos dois lugares para a redação do aceite ser idêntica
 * à que vai registrada no banco.
 *
 * A leitura é opcional e nunca bloqueante: o link abre o contrato em outra aba
 * para o usuário não perder o que já preencheu no formulário.
 */
export default function AceiteContrato({
  checked, onChange, disabled = false, erro = '', contexto = 'cadastro',
}: {
  checked:   boolean
  onChange:  (value: boolean) => void
  disabled?: boolean
  erro?:     string
  contexto?: 'cadastro' | 'assinatura'
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        erro ? 'border-coral bg-[var(--j-alert-danger-bg)]' : 'border-line-strong bg-surface'
      }`}
    >
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={e => onChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 shrink-0 accent-indigo cursor-pointer"
          aria-describedby="aceite-contrato-hint"
        />
        <span className="text-[13px] leading-relaxed text-ink-80">
          {contexto === 'assinatura' ? (
            <>
              Li e aceito o{' '}
              <ContratoLink />, com o <strong>Anexo I</strong> formado pelos dados da minha
              agência e do plano acima.
            </>
          ) : (
            <>
              Li e aceito o{' '}
              <ContratoLink /> da plataforma TurisGuard e seu <strong>Anexo I</strong>.
            </>
          )}
        </span>
      </label>

      <p
        id="aceite-contrato-hint"
        className={`mt-2 pl-[26px] text-[12px] ${erro ? 'text-coral' : 'text-ink-40'}`}
      >
        {erro || `Versão ${CONTRATO_VERSAO}. O aceite fica registrado com data, hora e IP, e você pode baixá-lo em PDF no seu perfil.`}
      </p>
    </div>
  )
}

function ContratoLink() {
  return (
    <a
      href="/contrato"
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo underline font-medium inline-flex items-center gap-1"
      onClick={e => e.stopPropagation()}
    >
      <FileText className="w-3.5 h-3.5" />
      Contrato de Licença de Uso
    </a>
  )
}
