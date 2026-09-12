import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import TrialBanner from '@/components/TrialBanner'
import { getTrialInfo, type AgencyAccess } from '@/lib/plans'
import { AGENCY_COLS, ensureAgency } from '@/lib/agency'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('agencies')
    .select(AGENCY_COLS)
    .eq('id', user.id)
    .maybeSingle()

  let agency = data as AgencyAccess | null

  // Auto-reparo: usuário autenticado sem agência (ex.: cadastro via Google, ou
  // linha removida). Cria a agência com o período gratuito antes de seguir.
  const isLawyer = user.app_metadata?.role === 'lawyer'
  if (!agency && !isLawyer) {
    agency = await ensureAgency(user)
  }

  const trial = agency ? getTrialInfo(agency) : null

  return (
    <div className="min-h-screen bg-surface relative">
      <Navbar />
      {trial && <TrialBanner trial={trial} />}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  )
}
