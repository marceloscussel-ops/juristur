'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff } from 'lucide-react'
import TGLogo from '@/components/TGLogo'
import OAuthButtons from '@/components/OAuthButtons'

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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }
    const isLawyer = data.user?.app_metadata?.role === 'lawyer'
    router.push(isLawyer ? '/lawyer/dashboard' : '/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center no-underline">
            <TGLogo size={36} variant="color" withWordmark />
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
              <div className="flex items-center justify-between mb-1">
                <label className="j-label" htmlFor="password">Senha</label>
                <Link href="/esqueci-senha" className="j-caption text-indigo hover:underline">
                  Esqueci minha senha
                </Link>
              </div>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-40 hover:text-ink transition-colors"
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

          <OAuthButtons />
        </div>

        <p className="text-center j-caption mt-5">
          Não tem conta?{' '}
          <Link href="/cadastro" className="text-indigo hover:underline font-medium">
            Cadastre sua agência
          </Link>
        </p>
      </div>
    </div>
  )
}
