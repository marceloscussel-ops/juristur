'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Scale, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 no-underline">
            <Scale className="w-5 h-5 text-gold" />
            <span className="font-display text-[22px] text-navy">JurisTur</span>
          </Link>
          <h1 className="j-h1 mt-5 mb-1">Bem-vindo de volta</h1>
          <p className="j-caption">Entre com os dados da sua agência</p>
        </div>

        <div className="j-card animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="j-label" htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="j-input"
                placeholder="agencia@exemplo.com"
              />
            </div>

            <div>
              <label className="j-label" htmlFor="password">Senha</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="j-input pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-light hover:text-navy transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="j-alert j-alert-danger text-[13px]">{error}</div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary w-full mt-1">
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center j-caption mt-5">
          Não tem conta?{' '}
          <Link href="/cadastro" className="text-teal hover:underline font-medium">
            Cadastre sua agência
          </Link>
        </p>
      </div>
    </div>
  )
}
