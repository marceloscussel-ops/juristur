import { notFound } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { ArrowLeft, Clock, RefreshCw, MessageSquare } from 'lucide-react'
import MarkdownRenderer from '@/components/MarkdownRenderer'
import SeverityBadge from '@/components/SeverityBadge'
import ReviewActions from '@/components/lawyer/ReviewActions'
import { env } from '@/lib/env'
import { formatDateTimeLong, formatDayMonthTime } from '@/lib/datetime'

function getServiceClient() {
  return createServiceClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
}

export default async function LawyerCasoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = getServiceClient()

  const [{ data: caseData }, { data: analysis }, { data: followUps }] = await Promise.all([
    db.from('cases')
      .select('*, agencies(name), case_files(*)')
      .eq('id', id)
      .single(),
    db.from('case_analyses')
      .select('*')
      .eq('case_id', id)
      .single(),
    db.from('case_messages')
      .select('id, role, content, created_at')
      .eq('case_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (!caseData || !analysis) notFound()

  const agency  = caseData.agencies as { name: string } | null
  const isPending = analysis.review_status === 'pending'
  const isRevision = analysis.review_status === 'revision_requested'

  return (
    <div className="max-w-3xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <Link href="/lawyer/dashboard" className="inline-flex items-center gap-1.5 j-caption text-indigo hover:text-ink transition-colors no-underline">
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para revisões
        </Link>
        <span className="j-caption text-ink-40">Código: {id.slice(0, 6).toUpperCase()}</span>
      </div>

      {/* Dados do caso */}
      <div className="j-card mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <p className="j-overline mb-1">{caseData.category}</p>
            <h1 className="j-h1">{caseData.title ?? caseData.category}</h1>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="badge badge-muted">{agency?.name ?? 'Agência'}</span>
            <span className="badge badge-muted capitalize">{caseData.origin}</span>
          </div>
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
      </div>

      {/* Análise da IA */}
      <div className="j-card j-card-gradient mb-4">
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2.5">
            <p className="j-overline">Análise da IA</p>
            {analysis.severity && <SeverityBadge severity={analysis.severity} compact />}
          </div>
          {isRevision && (
            <span className="badge badge-amber flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Revisão em curso
            </span>
          )}
        </div>

        {analysis.lawyer_notes && (
          <div className="bg-amber-pale border border-amber/30 rounded-md p-3 mb-4">
            <p className="j-label mb-1 text-amber">Comentários anteriores</p>
            <p className="j-body text-ink-40 text-sm">{analysis.lawyer_notes}</p>
          </div>
        )}

        <MarkdownRenderer content={analysis.ai_response} />
        <p className="j-caption mt-6 pt-4 border-t border-[rgba(13,13,26,0.07)]">
          Gerada em {formatDateTimeLong(analysis.created_at)}
        </p>
      </div>

      {/* Perguntas de acompanhamento */}
      {followUps && followUps.length > 0 && (
        <div className="j-card mb-4">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-indigo" />
            <p className="j-overline">Perguntas de acompanhamento</p>
            <span className="badge badge-muted">
              {followUps.filter(m => m.role === 'user').length}
            </span>
          </div>
          <div className="space-y-3">
            {followUps.map(msg => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`rounded-xl px-4 py-3 max-w-[85%] ${
                  msg.role === 'user'
                    ? 'bg-indigo text-white'
                    : 'bg-surface border border-[rgba(13,13,26,0.07)]'
                }`}>
                  <p className={`text-[11px] font-semibold uppercase tracking-wide mb-1 ${
                    msg.role === 'user' ? 'text-white/70' : 'text-ink-40'
                  }`}>
                    {msg.role === 'user' ? 'Agência' : 'Resposta IA'}
                  </p>
                  <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user' ? 'text-white' : 'text-ink'
                  }`}>
                    {msg.content}
                  </p>
                  <p className={`text-xs mt-1.5 ${msg.role === 'user' ? 'text-white/60' : 'text-ink-40'}`}>
                    {formatDayMonthTime(msg.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ações de revisão */}
      {isPending && (
        <div className="j-card">
          <p className="j-label mb-1">Sua decisão</p>
          <p className="j-caption mb-4">Aprove para entregar ao cliente, ou solicite ajustes à IA antes da entrega.</p>
          <ReviewActions caseId={id} />
        </div>
      )}

      {!isPending && !isRevision && (
        <div className="j-alert j-alert-success">
          Análise aprovada e entregue à agência.
        </div>
      )}
    </div>
  )
}
