'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Scale, LogOut, Menu, X, PlusCircle, UserCircle } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Meus Casos' },
  { href: '/perfil',    label: 'Perfil'      },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="j-nav" aria-label="Navegação principal">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-2 no-underline">
        <Scale className="w-5 h-5 text-amber" />
        <span className="font-display text-[18px] text-white leading-none">JurisTur</span>
      </Link>

      {/* Links desktop */}
      <ul className="hidden sm:flex gap-0 list-none m-0 p-0 h-14">
        {navItems.map(item => (
          <li key={item.href} className="h-14 flex">
            <Link
              href={item.href}
              className={`j-nav-link no-underline ${pathname === item.href ? 'j-nav-link-active' : ''}`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>

      {/* Ações desktop */}
      <div className="hidden sm:flex items-center gap-2">
        <Link href="/casos/novo" className="btn btn-warm btn-sm no-underline">
          <PlusCircle className="w-3.5 h-3.5" />
          Novo caso
        </Link>
        <Link
          href="/perfil"
          className="flex items-center gap-1.5 px-3 py-1.5 text-white/40 hover:text-white text-[13px] transition-colors rounded"
          title="Perfil"
        >
          <UserCircle className="w-4 h-4" />
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 text-white/40 hover:text-white text-[13px] transition-colors rounded"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile toggle */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="sm:hidden text-white/70 hover:text-white p-1"
      >
        {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden absolute top-14 left-0 right-0 bg-[#1A1040] border-t border-white/10 px-4 py-3 space-y-1 z-50">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`j-nav-link block no-underline h-auto py-2.5 border-b-0 ${pathname === item.href ? 'text-white' : ''}`}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/casos/novo" onClick={() => setMenuOpen(false)} className="j-nav-link block no-underline h-auto py-2.5 border-b-0">
            + Novo caso
          </Link>
          <button onClick={handleLogout} className="j-nav-link flex items-center gap-2 w-full text-left h-auto py-2.5 border-b-0">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      )}
    </nav>
  )
}
