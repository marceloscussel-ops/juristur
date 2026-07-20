import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import LawyerNavbar from '@/components/lawyer/LawyerNavbar'

export default async function LawyerLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Papel verificado via app_metadata do JWT (definido no Supabase Auth)
  if (user.app_metadata?.role !== 'lawyer') redirect('/dashboard')

  return (
    <div className="min-h-screen bg-surface relative">
      <LawyerNavbar isAdmin={isAdmin(user.email)} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  )
}
