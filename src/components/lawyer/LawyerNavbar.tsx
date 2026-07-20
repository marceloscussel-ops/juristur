'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, Menu, X, Settings } from 'lucide-react'
import TGLogo from '@/components/TGLogo'

const baseNavItems = [
  { href: '/lawyer/dashboard',      label: 'Revisões'       },
  { href: '/lawyer/configuracoes',  label: 'Configurações'  },
]

export default function LawyerNavbar({ isAdmin = false }: { isAdmin?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const navItems = isAdmin
    ? [...baseNavItems, { href: '/admin', label: 'Painel gerencial' }]
    : baseNavItems

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="j-nav" aria-label="Navegação do advogado">
      <Link href="/lawyer/dashboard" className="flex items-center gap-2 no-underline">
        <TGLogo size={34} variant="mono-light" withWordmark />
        <span className="text-white/40 text-xs font-body ml-1">Advogado</span>
      </Link>

      <ul className="hidden sm:flex gap-0 list-none m-0 p-0 h-14">
        {navItems.map(item => (
          <li key={item.href} className="h-14 flex">
            <Link
              href={item.href}
              className={`j-nav-link no-underline ${pathname.startsWith(item.href) ? 'j-nav-link-active' : ''}`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden sm:flex items-center gap-2">
        <Link href="/lawyer/configuracoes" className="flex items-center gap-1.5 px-3 py-1.5 text-white/40 hover:text-white text-[13px] transition-colors rounded" title="Configurações">
          <Settings className="w-4 h-4" />
        </Link>
        <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 text-white/40 hover:text-white text-[13px] transition-colors rounded" title="Sair">
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden text-white/70 hover:text-white p-1">
        {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {menuOpen && (
        <div className="sm:hidden absolute top-14 left-0 right-0 bg-[#0B121C] border-t border-white/10 px-4 py-3 space-y-1 z-50">
          {navItems.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
              className={`j-nav-link block no-underline h-auto py-2.5 border-b-0 ${pathname.startsWith(item.href) ? 'text-white' : ''}`}>
              {item.label}
            </Link>
          ))}
          <button onClick={handleLogout} className="j-nav-link flex items-center gap-2 w-full text-left h-auto py-2.5 border-b-0">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      )}
    </nav>
  )
}
