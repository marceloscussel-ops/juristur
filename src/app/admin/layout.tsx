import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'
import TGLogo from '@/components/TGLogo'
import { LayoutDashboard } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isAdmin(user.email)) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-[#0B121C] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <TGLogo size={26} variant="mono-light" />
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-white/90">
              <LayoutDashboard className="w-4 h-4" /> Painel gerencial
            </span>
          </div>
          <Link href="/lawyer/dashboard" className="text-[13px] text-white/60 hover:text-white transition-colors no-underline">
            Voltar
          </Link>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  )
}
