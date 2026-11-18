import Link from 'next/link'
import { feedbackDb, type FeedbackRow, type FeedbackTarget } from '@/lib/feedback'
import { StatTile, HBars } from '@/components/admin/Charts'
import { ThumbsUp, ThumbsDown } from 'lucide-react'

export const dynamic = 'force-dynamic'

type FiltroVoto = 'todos' | 'positivos' | 'negativos'
type FiltroTipo = 'todos' | FeedbackTarget

interface Props {
  searchParams: Promise<{ voto?: string; tipo?: string }>
}

const TIPO_LABEL: Record<FeedbackTarget, string> = { case: 'Análise', document: 'Documento' }

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })

function contarMotivos(rows: FeedbackRow[]) {
  const mapa = new Map<string, number>()
  for (const r of rows) for (const m of r.reasons ?? []) mapa.set(m, (mapa.get(m) ?? 0) + 1)
  return Array.from(mapa.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value }))
}

export default async function FeedbackPage({ searchParams }: Props) {
  const sp = await searchParams
  const voto: FiltroVoto = sp.voto === 'positivos' || sp.voto === 'negativos' ? sp.voto : 'todos'
  const tipo: FiltroTipo = sp.tipo === 'case' || sp.tipo === 'document' ? sp.tipo : 'todos'

  const supabase = feedbackDb()
  const [{ data: fbData, error }, { data: agencias }] = await Promise.all([
    supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(1000),
    supabase.from('agencies').select('id, name, origem'),
  ])

  // Contas demo não são clientes — mesma regra da visão geral.
  const demoIds   = new Set((agencias ?? []).filter(a => a.origem === 'demo').map(a => a.id))
  const nomeAgencia = new Map((agencias ?? []).map(a => [a.id as string, a.name as string]))
  const todos = ((fbData ?? []) as FeedbackRow[]).filter(f => !demoIds.has(f.agency_id))

  // Os números do topo respeitam o filtro de tipo, mas não o de voto: senão
  // "% positivo" viraria 0% ou 100% ao filtrar.
  const doTipo     = tipo === 'todos' ? todos : todos.filter(f => f.target_type === tipo)
  const positivos  = doTipo.filter(f => f.rating === 1)
  const negativos  = doTipo.filter(f => f.rating === -1)
  const pctPositivo = doTipo.length ? Math.round((positivos.length / doTipo.length) * 100) : 0
  const comComentario = doTipo.filter(f => f.comment).length

  const lista = voto === 'positivos' ? positivos : voto === 'negativos' ? negativos : doTipo

  // Títulos dos itens e nomes de quem votou, numa consulta por tabela.
  const caseIds = Array.from(new Set(lista.filter(f => f.target_type === 'case').map(f => f.target_id)))
  const docIds  = Array.from(new Set(lista.filter(f => f.target_type === 'document').map(f => f.target_id)))
  const userIds = Array.from(new Set(lista.map(f => f.user_id)))
  const [{ data: cases }, { data: docs }, { data: membros }] = await Promise.all([
    caseIds.length
      ? supabase.from('cases').select('id, title, category').in('id', caseIds)
      : Promise.resolve({ data: [] as { id: string; title: string | null; category: string }[] }),
    docIds.length
      ? supabase.from('documents').select('id, title, doc_type').in('id', docIds)
      : Promise.resolve({ data: [] as { id: string; title: string | null; doc_type: string | null }[] }),
    userIds.length
      ? supabase.from('agency_members').select('user_id, nome, email').in('user_id', userIds)
      : Promise.resolve({ data: [] as { user_id: string; nome: string | null; email: string | null }[] }),
  ])
  const tituloCaso = new Map((cases ?? []).map(c => [c.id, c.title || c.category]))
  const tituloDoc  = new Map((docs ?? []).map(d => [d.id, d.title || d.doc_type || 'Documento']))
  const nomeUsuario = new Map((membros ?? []).map(m => [m.user_id, m.nome || m.email || '']))

  const href = (v: FiltroVoto, t: FiltroTipo) => {
    const q = new URLSearchParams()
    if (v !== 'todos') q.set('voto', v)
    if (t !== 'todos') q.set('tipo', t)
    const s = q.toString()
    return s ? `/admin/feedback?${s}` : '/admin/feedback'
  }

  const tabelaAusente = error?.code === '42P01'

  return (
    <div className="animate-fade-in space-y-5">
      <div>
        <h1 className="j-h1">Feedback</h1>
        <p className="j-caption mt-1">
          Avaliações 👍/👎 que as agências deram às análises e aos documentos
          {demoIds.size > 0 && ' · contas demo fora das contagens'}
        </p>
      </div>

      {(tabelaAusente || (error && !tabelaAusente)) && (
        <div className="j-alert j-alert-warning">
          {tabelaAusente
            ? <>A tabela ainda não existe: rode a migração <code>2026-11-18-feedback.sql</code> no Supabase.</>
            : <>Não foi possível ler os feedbacks: {error?.message}</>}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile label="Avaliações" value={doTipo.length.toLocaleString('pt-BR')}
                  sub={`${comComentario} com comentário`} accent="var(--j-ink)" />
        <StatTile label="Satisfação" value={doTipo.length ? `${pctPositivo}%` : '—'}
                  sub="das avaliações são 👍" accent="var(--j-indigo)" />
        <StatTile label="Positivas" value={positivos.length.toLocaleString('pt-BR')}
                  sub="👍 ajudou" accent="var(--j-teal)" />
        <StatTile label="Negativas" value={negativos.length.toLocaleString('pt-BR')}
                  sub="👎 não ajudou" accent="var(--j-coral)" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="j-card">
          <p className="j-h3 mb-3 flex items-center gap-1.5">
            <ThumbsUp className="w-4 h-4 text-teal" /> O que agradou
          </p>
          <HBars data={contarMotivos(positivos)} color="var(--j-teal)" />
        </div>
        <div className="j-card">
          <p className="j-h3 mb-3 flex items-center gap-1.5">
            <ThumbsDown className="w-4 h-4 text-coral" /> O que não funcionou
          </p>
          <HBars data={contarMotivos(negativos)} color="var(--j-coral)" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(['todos', 'positivos', 'negativos'] as FiltroVoto[]).map(v => (
          <Link key={v} href={href(v, tipo)}
                className={`j-chip no-underline ${voto === v ? 'j-chip-active' : ''}`}>
            {v === 'todos' ? 'Todos' : v === 'positivos' ? '👍 Positivos' : '👎 Negativos'}
          </Link>
        ))}
        <span className="j-caption mx-1">·</span>
        {(['todos', 'case', 'document'] as FiltroTipo[]).map(t => (
          <Link key={t} href={href(voto, t)}
                className={`j-chip no-underline ${tipo === t ? 'j-chip-active' : ''}`}>
            {t === 'todos' ? 'Análises e documentos' : t === 'case' ? 'Análises' : 'Documentos'}
          </Link>
        ))}
      </div>

      <div className="j-card !p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="j-table">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Voto</th>
                <th>Agência</th>
                <th>Item</th>
                <th>Motivos</th>
                <th>Comentário</th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-ink-40">
                    Nenhuma avaliação com esse filtro ainda.
                  </td>
                </tr>
              ) : lista.map(f => {
                const quem = nomeUsuario.get(f.user_id)
                const titulo = f.target_type === 'case'
                  ? tituloCaso.get(f.target_id) ?? 'Caso removido'
                  : tituloDoc.get(f.target_id) ?? 'Documento removido'
                return (
                  <tr key={f.id}>
                    <td className="whitespace-nowrap">{dataHora(f.updated_at ?? f.created_at)}</td>
                    <td>
                      {f.rating === 1
                        ? <span className="flex items-center gap-1 text-teal"><ThumbsUp className="w-4 h-4" /> Sim</span>
                        : <span className="flex items-center gap-1 text-coral"><ThumbsDown className="w-4 h-4" /> Não</span>}
                    </td>
                    <td>
                      <span className="font-medium">{nomeAgencia.get(f.agency_id) ?? '—'}</span>
                      {quem && <span className="j-caption block">{quem}</span>}
                    </td>
                    <td>
                      <span className="j-caption block">{TIPO_LABEL[f.target_type]}</span>
                      {f.target_type === 'case'
                        ? <Link href={`/lawyer/casos/${f.target_id}`} className="text-teal hover:underline">{titulo}</Link>
                        : titulo}
                    </td>
                    <td>
                      {f.reasons?.length
                        ? <div className="flex flex-wrap gap-1">
                            {f.reasons.map(m => <span key={m} className="j-chip !py-0.5 !text-xs">{m}</span>)}
                          </div>
                        : <span className="text-ink-40">—</span>}
                    </td>
                    <td className="max-w-sm whitespace-pre-wrap">
                      {f.comment ?? <span className="text-ink-40">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
