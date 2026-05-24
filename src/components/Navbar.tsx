'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Scale, LogOut, FolderOpen, PlusCircle, Menu, X } from 'lucide-react'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard" className="flex items-center gap-2 text-blue-700 font-bold text-lg">
            <Scale className="w-6 h-6" />
            <span>JurisTur</span>
          </Link>

          <div className="hidden sm:flex items-center gap-2">
            <Link href="/dashboard" className="flex items-center gap-1.5 text-gray-600 hover:text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium">
              <FolderOpen className="w-4 h-4" />
              Meus Casos
            </Link>
            <Link href="/casos/novo" className="flex items-center gap-1.5 text-gray-600 hover:text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium">
              <PlusCircle className="w-4 h-4" />
              Novo Caso
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-gray-500 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium ml-2"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="sm:hidden pb-3 border-t border-gray-100 pt-2 space-y-1">
            <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm">
              <FolderOpen className="w-4 h-4" /> Meus Casos
            </Link>
            <Link href="/casos/novo" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg text-sm">
              <PlusCircle className="w-4 h-4" /> Novo Caso
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm w-full">
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
