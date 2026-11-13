import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/StatusBadge'
import DownloadPdfButton from '@/components/DownloadPdfButton'
import LegalResponse from '@/components/LegalResponse'
import CaseRefresh from '@/components/CaseRefresh'
import CaseFollowUp from '@/components/CaseFollowUp'
import CaseComplement from '@/components/CaseComplement'
import CaseEscalate from '@/components/CaseEscalate'
import { loadDefenseInfo } from '@/lib/defesas'
import { formatDateTimeLong } from '@/lib/datetime'
import { Case } from '@/types'
import { ArrowLeft, Paperclip, Clock, Plus } from 'lucide-react'
import { lawyerWhatsappLink } from '@/lib/whatsapp/public-number'
import { getAgencyId, getNomesDaEquipe } from '@/lib/agencia-do-usuario'

export default async function CasoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Todo usuário ativo da agência abre qualquer caso dela: é o histórico
  // jurídico da empresa, não o de uma pessoa.
  const agencyId = await getAgencyId(user!.id)

  const { data } = await supabase
    .from('cases')
    .select('*, case_analyses(*), case_files(*)')
    .eq('id', id).eq('agency_id', agencyId).single()

  if (!data) notFound()

  const caseData = data as Case

  // Só exibe análises aprovadas pelo advogado
  const analysis = (caseData.case_analyses ?? []).find(a => a.review_status === 'approved') ?? null
  const files = caseData.case_files ?? []

  const whatsappUrl = lawyerWhatsappLink(
    `Olá! Preciso de assistência jurídica. Tenho um caso sobre: ${caseData.title} (categoria: ${caseData.category})`
  )

  // Cota de defesa: período gratuito (contado por solicitação) ou defesas
  // inclusas no plano (contadas pelo que o advogado marcou como utilizado).
  // A cota é da agência, não do usuário — daí `agencyId` e não `user.id`.
  const [defenseInfo, autores] = await Promise.all([
    loadDefenseInfo(supabase, agencyId),
    getNomesDaEquipe(agencyId),
  ])

  // Autoria: só aparece quando a agência tem mais de um usuário — com um só,
  // "registrado por" em todo caso é ruído.
  const autor = Object.keys(autores).length > 1 && caseData.created_by
    ? autores[caseData.created_by] ?? null
    : null
  const alreadyEscalated = !!caseData.escalated_at


  return (
    <div className={`max-w-3xl mx-auto animate-fade-in ${analysis ? 'pb-40 print:pb-0' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 print:hidden">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 j-caption text-indigo hover:text-ink transition-colors no-underline">
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para meus casos
        </Link>
        {/* Atalho para registrar outra situação sem passar pela lista de casos */}
        <div className="flex items-center gap-2">
          {analysis && <DownloadPdfButton caseId={caseData.id} />}
          <Link href="/novo" className="btn btn-outline no-underline">
            <Plus className="w-4 h-4" />
            Nova ação
          </Link>
        </div>
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
          {autor && <span>· registrado por {autor}</span>}
        </p>

        <div className="j-divider" />

        <div>
          <p className="j-label mb-2">
            {caseData.complement ? 'Relato original' : 'Descrição do caso'}
          </p>
          <p className="j-body whitespace-pre-wrap bg-surface rounded-md p-4">{caseData.description}</p>
        </div>

        {/* Complemento (ressalva) — o relato original acima é preservado */}
        {caseData.complement && (
          <div className="mt-4">
            <p className="j-label mb-2 flex items-center gap-1.5">
              <span className="badge badge-muted">Complemento</span>
              {caseData.complemented_at && (
                <span className="j-caption font-normal">adicionado em {formatDateTimeLong(caseData.complemented_at)}</span>
              )}
            </p>
            <p className="j-body whitespace-pre-wrap bg-indigo-50/60 border border-indigo/20 rounded-md p-4">
              {caseData.complement}
            </p>
          </div>
        )}

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

        {/* Complementar: disponível só após aprovação e enquanto não houver complemento */}
        {analysis && !caseData.complement && (
          <CaseComplement caseId={caseData.id} />
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
            info={defenseInfo}
            severity={analysis.severity}
            variant="primary"
          />
        </>
      ) : (
        <div className="j-card mt-4 text-center py-10">
          <Clock className="w-8 h-8 text-amber mx-auto mb-3" />
          <p className="j-h3 mb-1">
            {caseData.complement ? 'Reanalisando com o seu complemento' : 'Análise em processamento'}
          </p>
          <p className="j-caption">
            {caseData.complement
              ? 'A nova análise, com o complemento, será entregue assim que aprovada pelo advogado.'
              : 'A análise será entregue assim que aprovada pelo advogado.'}
          </p>
          <div className="flex justify-center">
            <CaseRefresh awaiting={true} />
          </div>
          <div className="mt-6 pt-5 border-t border-line">
            <p className="j-caption mb-1">Precisa de resposta agora?</p>
            <div className="flex justify-center">
              <CaseEscalate
                caseId={caseData.id}
                whatsappUrl={whatsappUrl}
                alreadyEscalated={alreadyEscalated}
                info={defenseInfo}
                variant="outline"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
