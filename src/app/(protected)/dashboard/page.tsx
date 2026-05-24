import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/StatusBadge'
import { Case } from '@/types'
import { ChevronRight, FolderOpen, PlusCircle } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: agency } = await supabase
    .from('agencies').select('name').eq('id', user!.id).single()

  const { data: cases } = await supabase
    .from('cases').select('*').eq('agency_id', user!.id).order('created_at', { ascending: false })

  const typedCases = (cases ?? []) as Case[]

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="j-section-header mb-6">
        <div>
          <p className="j-overline">Painel</p>
          <h1 className="j-h1 mt-0.5">{agency?.name ?? 'Agência'}</h1>
          <p className="j-caption mt-1">
            {typedCases.length === 0 ? 'Nenhum caso aberto ainda' : `${typedCases.length} caso${typedCases.length !== 1 ? 's' : ''} no total`}
          </p>
        </div>
        <Link href="/casos/novo" className="btn btn-gold no-underline">
          <PlusCircle className="w-4 h-4" />
          Novo caso
        </Link>
      </div>

      {/* Lista */}
      {typedCases.length === 0 ? (
        <div className="j-card text-center py-16">
          <FolderOpen className="w-10 h-10 text-slate-light mx-auto mb-4" />
          <h2 className="j-h3 mb-1">Nenhum caso ainda</h2>
          <p className="j-caption mb-6">Abra seu primeiro caso para receber orientação jurídica</p>
          <Link href="/casos/novo" className="btn btn-gold no-underline inline-flex">
            <PlusCircle className="w-4 h-4" />
            Abrir primeiro caso
          </Link>
        </div>
      ) : (
        <div className="j-card p-0 overflow-hidden">
          <table className="j-table">
            <thead>
              <tr>
                <th>Caso</th>
                <th>Categoria</th>
                <th>Data</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {typedCases.map(c => (
                <tr key={c.id}>
                  <td className="font-medium text-navy">
                    <Link href={`/casos/${c.id}`} className="no-underline text-navy hover:text-teal transition-colors block">
                      {c.title}
                    </Link>
                  </td>
                  <td className="text-slate-light">{c.category}</td>
                  <td className="text-slate-light whitespace-nowrap">
                    {new Date(c.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td><StatusBadge status={c.status} /></td>
                  <td className="text-right">
                    <Link href={`/casos/${c.id}`} className="no-underline">
                      <ChevronRight className="w-4 h-4 text-slate-light inline hover:text-teal transition-colors" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
