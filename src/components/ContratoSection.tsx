'use client'

import { useEffect, useState } from 'react'
import { Download, FileText, Loader2, ScrollText } from 'lucide-react'
import { formatDateTime } from '@/lib/datetime'
import { ACEITE_EVENTO_LABEL, type AceiteEvento, type AnexoI } from '@/lib/contrato/termos'

interface AceiteRow {
  id:          string
  version:     string
  event:       AceiteEvento
  anexo:       Partial<AnexoI> | null
  accepted_at: string
}

/**
 * Bloco "Contrato" do perfil: histórico dos aceites, cada um com o Anexo I
 * daquele momento e o PDF do contrato individualizado.
 *
 * Conta separada do contrato em si: aqui mostramos o que ESTA agência aceitou,
 * enquanto /contrato mostra o texto geral, igual para todas.
 */
export default function ContratoSection() {
  const [aceites, setAceites] = useState<AceiteRow[] | null>(null)

  useEffect(() => {
    fetch('/api/contrato/aceites', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setAceites(d.aceites ?? []))
      .catch(() => setAceites([]))
  }, [])

  return (
    <div className="j-card mt-4">
      <p className="j-label mb-4">Contrato</p>

      <a
        href="/contrato"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-xl border border-[rgba(13,13,26,0.1)] px-4 py-3 no-underline hover:border-indigo/50 transition-colors"
      >
        <ScrollText className="w-4 h-4 text-indigo shrink-0" />
        <span className="flex-1">
          <span className="block j-body font-medium">Contrato de licença de uso</span>
          <span className="block j-caption">Texto geral da plataforma — abre em outra aba</span>
        </span>
      </a>

      <div className="mt-4">
        <p className="j-caption mb-2">Aceites registrados</p>

        {aceites === null ? (
          <div className="flex items-center gap-2 j-caption py-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Carregando…
          </div>
        ) : aceites.length === 0 ? (
          <p className="j-caption">
            Nenhum aceite registrado nesta conta. O contrato, com o Anexo I da sua agência
            e do plano, é aceito ao assinar.
          </p>
        ) : (
          <ul className="list-none p-0 m-0 space-y-2">
            {aceites.map(a => (
              <li
                key={a.id}
                className="flex items-start gap-3 rounded-xl border border-[rgba(13,13,26,0.07)] bg-surface px-4 py-3"
              >
                <FileText className="w-4 h-4 text-ink-40 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="j-body font-medium">{ACEITE_EVENTO_LABEL[a.event]}</p>
                  <p className="j-caption mt-0.5">
                    {formatDateTime(a.accepted_at)} · versão {a.version}
                    {a.anexo?.plano?.nome ? ` · ${a.anexo.plano.nome}` : ''}
                    {a.anexo?.plano?.modalidade ? ` · ${a.anexo.plano.modalidade}` : ''}
                  </p>
                </div>
                <a
                  href={`/api/contrato/${a.id}/pdf`}
                  className="btn btn-outline btn-sm no-underline shrink-0"
                  title="Baixar o contrato aceito em PDF"
                >
                  <Download className="w-3.5 h-3.5" /> PDF
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
