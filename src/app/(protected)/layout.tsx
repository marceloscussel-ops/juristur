import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import Navbar from '@/components/Navbar'
import TrialBanner from '@/components/TrialBanner'
import { getTrialInfo, TRIAL_DAYS } from '@/lib/plans'
import { env } from '@/lib/env'

const AGENCY_COLS = 'subscription_status, trial_ends_at, created_at'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let { data: agency } = await supabase
    .from('agencies')
    .select(AGENCY_COLS)
    .eq('id', user.id)
    .maybeSingle()

  // Auto-reparo: usuário autenticado sem agência (ex.: cadastro via Google, ou
  // linha removida). Cria a agência com o período gratuito antes de seguir.
  const isLawyer = user.app_metadata?.role === 'lawyer'
  if (!agency && !isLawyer) {
    const admin = createServiceClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'))
    const meta = user.user_metadata ?? {}
    await admin.from('agencies').upsert({
      id:                  user.id,
      name:                meta.name ?? meta.full_name ?? 'Minha agência',
      cnpj:                meta.cnpj ?? '00.000.000/0000-00',
      email:               user.email,
      phone:               meta.phone ?? null,
      subscription_status: 'trial',
      trial_ends_at:       new Date(Date.now() + TRIAL_DAYS * 86_400_000).toISOString(),
    }, { onConflict: 'id' })

    const reload = await admin.from('agencies').select(AGENCY_COLS).eq('id', user.id).maybeSingle()
    agency = reload.data
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
