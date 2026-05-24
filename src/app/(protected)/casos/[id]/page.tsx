import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/StatusBadge'
import Disclaimer from '@/components/Disclaimer'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import { Case } from '@/types'
import { ArrowLeft, MessageCircle, Paperclip, Clock } from 'lucide-react'

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? '5511999999999'

export default async function CasoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('cases')
    .select('*, case_analyses(*), case_files(*)')
    .eq('id', id)
    .eq('agency_id', user!.id)
    .single()

  if (!data) notFound()

  const caseData = data as Case
  const analysis = caseData.case_analyses?.[0]
  const files = caseData.case_files ?? []

  const whatsappMessage = encodeURIComponent(
    `Olá! Preciso de assistência jurídica. Tenho um caso sobre: ${caseData.title} (categoria: ${caseData.category})`
  )
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-500 hover:text-blue-700 text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Voltar para meus casos
      </Link>

      <div className="card mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">{caseData.title}</h1>
            <p className="text-gray-500 text-sm mt-1">{caseData.category}</p>
          </div>
          <StatusBadge status={caseData.status} />
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Aberto em {new Date(caseData.created_at).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Descrição do caso</p>
          <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-4">
            {caseData.description}
          </p>
        </div>

        {files.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
              <Paperclip className="w-4 h-4" />
              Arquivos anexados ({files.length})
            </p>
            <ul className="space-y-1.5">
              {files.map(file => (
                <li key={file.id}>
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1.5"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    {file.file_name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <Disclaimer />

      {analysis ? (
        <div className="card mt-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Análise jurídica</h2>
          <MarkdownRenderer content={analysis.ai_response} />
          <p className="text-xs text-gray-400 mt-6 pt-4 border-t border-gray-100">
            Análise gerada em {new Date(analysis.created_at).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      ) : (
        <div className="card mt-6 text-center py-10">
          <Clock className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
          <p className="font-semibold text-gray-700">Análise em processamento</p>
          <p className="text-sm text-gray-400 mt-1">A IA está analisando seu caso. Recarregue a página em alguns instantes.</p>
        </div>
      )}

      <div className="card mt-6 bg-green-50 border-green-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Precisa de atendimento humano?</h3>
            <p className="text-gray-600 text-sm mt-1">
              Fale diretamente com um advogado especializado em direito do turismo.
            </p>
          </div>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
          >
            <MessageCircle className="w-4 h-4" />
            Falar com advogado
          </a>
        </div>
      </div>
    </div>
  )
}
