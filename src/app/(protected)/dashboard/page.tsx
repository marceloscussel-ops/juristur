import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatusBadge from '@/components/StatusBadge'
import { PlusCircle, FolderOpen, ChevronRight } from 'lucide-react'
import { Case } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: agency } = await supabase
    .from('agencies')
    .select('name')
    .eq('id', user!.id)
    .single()

  const { data: cases } = await supabase
    .from('cases')
    .select('*')
    .eq('agency_id', user!.id)
    .order('created_at', { ascending: false })

  const typedCases = (cases ?? []) as Case[]

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Olá, {agency?.name ?? 'Agência'}
          </h1>
          <p className="text-gray-500 mt-1">
            {typedCases.length === 0
              ? 'Nenhum caso aberto ainda'
              : `${typedCases.length} caso${typedCases.length !== 1 ? 's' : ''} no total`}
          </p>
        </div>
        <Link href="/casos/novo" className="btn-primary flex items-center gap-2 self-start sm:self-auto">
          <PlusCircle className="w-4 h-4" />
          Novo caso
        </Link>
      </div>

      {typedCases.length === 0 ? (
        <div className="card text-center py-16">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-600 mb-2">Nenhum caso ainda</h2>
          <p className="text-gray-400 mb-6">Abra seu primeiro caso para receber orientação jurídica</p>
          <Link href="/casos/novo" className="btn-primary inline-flex items-center gap-2">
            <PlusCircle className="w-4 h-4" />
            Abrir primeiro caso
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {typedCases.map(c => (
            <Link
              key={c.id}
              href={`/casos/${c.id}`}
              className="card flex items-center gap-4 hover:shadow-md transition-shadow group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                    {c.title}
                  </h3>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-sm text-gray-500 truncate">{c.category}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(c.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 group-hover:text-blue-600 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
