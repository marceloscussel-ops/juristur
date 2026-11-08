import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/StatusBadge'
import KindBadge from '@/components/KindBadge'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import DocumentActions from '@/components/DocumentActions'
import { formatDateTimeLong } from '@/lib/datetime'
import { LACUNA } from '@/lib/templates/contrato-turismo'
import type { AgencyDocument } from '@/types'
import { ArrowLeft, Clock, Paperclip, Plus, AlertTriangle } from 'lucide-react'
import { getAgencyId, getNomesDaEquipe } from '@/lib/agencia-do-usuario'

export default async function DocumentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Mesma regra dos casos: o documento é da agência, e todo usuário ativo vê.
  const agencyId = await getAgencyId(user!.id)

  const { data } = await supabase
    .from('documents')
    .select('*, document_files(*)')
    .eq('id', id)
    .eq('agency_id', agencyId)
    .maybeSingle()

  if (!data) notFound()

  const doc   = data as AgencyDocument
  const files = doc.document_files ?? []

  const autores = await getNomesDaEquipe(agencyId)
  const autor   = Object.keys(autores).length > 1 && doc.created_by
    ? autores[doc.created_by] ?? null
    : null
  const isContract = doc.kind === 'contrato'

  // Conta as lacunas para avisar antes de a agência mandar o arquivo ao cliente.
  const gaps = doc.content ? (doc.content.match(new RegExp(LACUNA, 'g')) ?? []).length : 0

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 j-caption text-indigo hover:text-ink transition-colors no-underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para o painel
        </Link>
        <Link href="/novo" className="btn btn-outline no-underline">
          <Plus className="w-4 h-4" />
          Nova ação
        </Link>
      </div>

      {/* Cabeçalho */}
      <div className="j-card mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <KindBadge kind={isContract ? 'contrato' : 'documento'} />
              <span className="j-caption">{doc.doc_type}</span>
            </div>
            <h1 className="j-h1">{doc.title ?? 'Documento'}</h1>
          </div>
          <StatusBadge status={doc.status} />
        </div>

        <p className="j-caption flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          Gerado em {formatDateTimeLong(doc.created_at)}
          {autor && <span>· gerado por {autor}</span>}
        </p>

        {doc.prompt && (
          <>
            <div className="j-divider" />
            <p className="j-label mb-2">Dados que você informou</p>
            <p className="j-body whitespace-pre-wrap bg-surface rounded-md p-4">{doc.prompt}</p>
          </>
        )}

        {files.length > 0 && (
          <div className="mt-4">
            <p className="j-label mb-2 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" /> Documentos enviados ({files.length})
            </p>
            <ul className="space-y-1.5 list-none m-0 p-0">
              {files.map(file => (
                <li key={file.id}>
                  <a
                    href={file.file_url} target="_blank" rel="noopener noreferrer"
                    className="j-mono text-teal hover:underline flex items-center gap-1.5"
                  >
                    <Paperclip className="w-3 h-3" /> {file.file_name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Aviso de lacunas */}
      {gaps > 0 && (
        <div className="j-alert j-alert-warning mb-4">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
          <div>
            <span className="font-semibold">
              {gaps} {gaps === 1 ? 'lacuna' : 'lacunas'} para preencher.
            </span>{' '}
            Os dados que não informamos saíram como <code className="j-mono">{LACUNA}</code>.
            Complete no Word depois de baixar, ou gere de novo com os dados que faltam.
          </div>
        </div>
      )}

      {/* O documento */}
      {doc.content ? (
        <div className="j-card">
          <MarkdownRenderer content={doc.content} />
        </div>
      ) : (
        <div className="j-card text-center py-10">
          <Clock className="w-8 h-8 text-amber mx-auto mb-3" />
          <p className="j-h3 mb-1">Documento ainda não gerado</p>
          <p className="j-caption">A geração não chegou ao fim — use o botão abaixo.</p>
        </div>
      )}

      <DocumentActions
        documentId={doc.id}
        confirmed={doc.status === 'confirmado'}
        hasContent={!!doc.content}
      />
    </div>
  )
}
