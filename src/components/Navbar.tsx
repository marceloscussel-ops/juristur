'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut, Menu, X, Plus, UserCircle } from 'lucide-react'
import TGLogo from '@/components/TGLogo'
import ThemeToggle from '@/components/ThemeToggle'

const baseNavItems = [
  { href: '/dashboard', label: 'Painel'     },
  { href: '/assinar',   label: 'Planos'     },
  { href: '/perfil',    label: 'Perfil'      },
  { href: '/ajuda',     label: 'Ajuda'       },
]

/**
 * `isTitular` controla o link da equipe: gestão de usuários é só do titular
 * (quem assina e paga). O membro não vê a entrada — e as rotas de /api/equipe
 * recusam quem não é titular, então esconder aqui é conveniência, não a trava.
 */
export default function Navbar({ isTitular = true }: { isTitular?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const navItems = isTitular
    ? [
        ...baseNavItems.slice(0, 3),
        { href: '/equipe', label: 'Equipe' },
        ...baseNavItems.slice(3),
      ]
    : baseNavItems

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="j-nav" aria-label="Navegação principal">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center no-underline">
        <TGLogo size={34} variant="mono-light" withWordmark />
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
        <ThemeToggle />
        <Link href="/novo" className="btn btn-accent btn-sm no-underline">
          <Plus className="w-3.5 h-3.5" />
          Nova ação
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
        <div className="sm:hidden absolute top-14 left-0 right-0 bg-[#0B121C] border-t border-white/10 px-4 py-3 space-y-1 z-50">
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
          <Link href="/novo" onClick={() => setMenuOpen(false)} className="j-nav-link block no-underline h-auto py-2.5 border-b-0">
            + Nova ação
          </Link>
          <button onClick={handleLogout} className="j-nav-link flex items-center gap-2 w-full text-left h-auto py-2.5 border-b-0">
            <LogOut className="w-4 h-4" /> Sair
          </button>
          <div className="mt-1 pt-3 border-t border-white/10">
            <span className="block px-3.5 mb-2 text-white/40 text-[11px] font-semibold uppercase tracking-[0.12em]">
              Tema
            </span>
            <div className="px-3.5 pb-1">
              <ThemeToggle variant="segmented" onDark />
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
