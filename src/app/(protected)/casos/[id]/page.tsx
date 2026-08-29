import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/StatusBadge'
import PrintButton from '@/components/PrintButton'
import LegalResponse from '@/components/LegalResponse'
import CaseRefresh from '@/components/CaseRefresh'
import CaseFollowUp from '@/components/CaseFollowUp'
import CaseEscalate from '@/components/CaseEscalate'
import { getTrialInfo, getEscalationInfo } from '@/lib/plans'
import { formatDateTimeLong } from '@/lib/datetime'
import { Case } from '@/types'
import { ArrowLeft, Paperclip, Clock } from 'lucide-react'

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

  // Só exibe análises aprovadas pelo advogado
  const analysis = (caseData.case_analyses ?? []).find(a => a.review_status === 'approved') ?? null
  const files = caseData.case_files ?? []

  const whatsappMessage = encodeURIComponent(
    `Olá! Preciso de assistência jurídica. Tenho um caso sobre: ${caseData.title} (categoria: ${caseData.category})`
  )
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`

  // Cota de escaladas gratuitas (período de teste)
  const { data: agency } = await supabase
    .from('agencies')
    .select('subscription_status, trial_ends_at, created_at')
    .eq('id', user!.id)
    .single()

  const { count: escalationsUsed } = await supabase
    .from('cases')
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', user!.id)
    .not('escalated_at', 'is', null)

  const escalationInfo = getEscalationInfo(getTrialInfo(agency ?? {}), escalationsUsed ?? 0)
  const alreadyEscalated = !!caseData.escalated_at

  return (
    <div className={`max-w-3xl mx-auto animate-fade-in ${analysis ? 'pb-40 print:pb-0' : ''}`}>
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
          Aberto em {formatDateTimeLong(caseData.created_at)}
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

      {/* Análise */}
      {analysis ? (
        <>
          <div className="mt-4">
            <LegalResponse
              content={analysis.ai_response}
              severity={analysis.severity}
              generatedAt={analysis.created_at}
            />
          </div>

          {/* Perguntas de acompanhamento logo abaixo da análise —
              antes o campo ficava no fim da página e passava despercebido. */}
          <CaseFollowUp caseId={caseData.id} />

          <CaseEscalate
            caseId={caseData.id}
            whatsappUrl={whatsappUrl}
            alreadyEscalated={alreadyEscalated}
            info={escalationInfo}
            severity={analysis.severity}
            variant="primary"
          />
        </>
      ) : (
        <div className="j-card mt-4 text-center py-10">
          <Clock className="w-8 h-8 text-amber mx-auto mb-3" />
          <p className="j-h3 mb-1">Análise em processamento</p>
          <p className="j-caption">A análise será entregue assim que aprovada pelo advogado.</p>
          <div className="flex justify-center">
            <CaseRefresh awaiting={true} />
          </div>
          <div className="mt-6 pt-5 border-t border-[rgba(13,13,26,0.07)]">
            <p className="j-caption mb-1">Precisa de resposta agora?</p>
            <div className="flex justify-center">
              <CaseEscalate
                caseId={caseData.id}
                whatsappUrl={whatsappUrl}
                alreadyEscalated={alreadyEscalated}
                info={escalationInfo}
                variant="outline"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
