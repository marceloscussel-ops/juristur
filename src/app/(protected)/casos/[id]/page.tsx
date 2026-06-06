import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/StatusBadge'
import Disclaimer from '@/components/Disclaimer'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import PrintButton from '@/components/PrintButton'
import { Case } from '@/types'
import { ArrowLeft, MessageCircle, Paperclip, Clock } from 'lucide-react'

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '5511999999999'

export default async function CasoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('cases')
    .select('*, case_analyses(*), case_files(*)')
    .eq('id', id).eq('agency_id', user!.id).single()

  if (!data) notFound()

  const caseData = data as Case
  const analysis = caseData.case_analyses?.[0]
  const files = caseData.case_files ?? []

  const whatsappMessage = encodeURIComponent(
    `Olá! Preciso de assistência jurídica. Tenho um caso sobre: ${caseData.title} (categoria: ${caseData.category})`
  )
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 j-caption text-indigo hover:text-ink transition-colors no-underline">
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para meus casos
        </Link>
        {analysis && <PrintButton />}
      </div>

      {/* Card do caso */}
      <div className="j-card mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <p className="j-overline mb-1">{caseData.category}</p>
            <h1 className="j-h1">{caseData.title}</h1>
          </div>
          <StatusBadge status={caseData.status} />
        </div>

        <p className="j-caption flex items-center gap-1.5 mb-4">
          <Clock className="w-3.5 h-3.5" />
          Aberto em {new Date(caseData.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </p>

        <div className="j-divider" />

        <div>
          <p className="j-label mb-2">Descrição do caso</p>
          <p className="j-body whitespace-pre-wrap bg-surface rounded-md p-4">{caseData.description}</p>
        </div>

        {files.length > 0 && (
          <div className="mt-4">
            <p className="j-label mb-2 flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5" /> Arquivos ({files.length})
            </p>
            <ul className="space-y-1.5">
              {files.map(file => (
                <li key={file.id}>
                  <a href={file.file_url} target="_blank" rel="noopener noreferrer"
                    className="j-mono text-teal hover:underline flex items-center gap-1.5">
                    <Paperclip className="w-3 h-3" /> {file.file_name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <Disclaimer />

      {/* Análise */}
      {analysis ? (
        <div className="j-card j-card-gradient mt-4">
          <p className="j-overline mb-3">Análise jurídica</p>
          <MarkdownRenderer content={analysis.ai_response} />
          <p className="j-caption mt-6 pt-4 border-t border-[rgba(13,13,26,0.07)]">
            Gerada em {new Date(analysis.created_at).toLocaleDateString('pt-BR', {
              day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
      ) : (
        <div className="j-card mt-4 text-center py-10">
          <Clock className="w-8 h-8 text-amber mx-auto mb-3" />
          <p className="j-h3 mb-1">Análise em processamento</p>
          <p className="j-caption">Recarregue a página em alguns instantes.</p>
        </div>
      )}

      {/* WhatsApp */}
      <div className="j-card mt-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1">
          <p className="j-h3 mb-0.5">Precisa de atendimento humano?</p>
          <p className="j-body">Fale diretamente com um advogado especializado em direito do turismo.</p>
        </div>
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
          className="btn btn-warm no-underline whitespace-nowrap">
          <MessageCircle className="w-4 h-4" />
          Falar com advogado
        </a>
      </div>
    </div>
  )
}
