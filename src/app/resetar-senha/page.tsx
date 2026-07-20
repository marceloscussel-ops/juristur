'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react'
import TGLogo from '@/components/TGLogo'

type Step = 'password' | 'success'

export default function ResetarSenhaPage() {
  const [step, setStep]                       = useState<Step>('password')
  const [password, setPassword]               = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword]       = useState(false)
  const [error, setError]                     = useState('')
  const [loading, setLoading]                 = useState(false)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError('Não foi possível atualizar a senha. O link pode ter expirado — solicite um novo.')
      setLoading(false)
      return
    }

    await supabase.auth.signOut()
    setStep('success')
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[400px]">

        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center no-underline">
            <TGLogo size={36} variant="color" withWordmark />
          </Link>
          <h1 className="j-h1 mt-5 mb-1">
            {step === 'success' ? 'Senha redefinida!' : 'Criar nova senha'}
          </h1>
          <p className="j-caption">
            {step === 'success'
              ? 'Sua senha foi atualizada com sucesso.'
              : 'Escolha uma senha segura para sua conta.'}
          </p>
        </div>

        <div className="j-card animate-fade-in">
          {step === 'password' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="j-label" htmlFor="new-password">Nova senha</label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="j-input pr-10"
                    placeholder="Mínimo 6 caracteres"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-40 hover:text-ink transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="j-label" htmlFor="confirm-password">Confirmar senha</label>
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="j-input"
                  placeholder="Repita a senha"
                />
              </div>

              {error && (
                <div className="j-alert j-alert-danger text-[13px]">{error}</div>
              )}

              <button type="submit" disabled={loading} className="btn btn-primary w-full">
                {loading ? 'Salvando...' : 'Salvar nova senha'}
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center py-4 space-y-4">
              <CheckCircle className="w-12 h-12 text-teal mx-auto" />
              <div>
                <p className="j-body font-medium mb-1">Tudo certo!</p>
                <p className="j-caption">Entre com sua nova senha para acessar a plataforma.</p>
              </div>
              <Link href="/login" className="btn btn-primary w-full no-underline">
                Ir para o login
              </Link>
            </div>
          )}
        </div>

        {step === 'password' && (
          <p className="text-center j-caption mt-5">
            <Link
              href="/esqueci-senha"
              className="text-indigo hover:underline font-medium inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Solicitar novo link
            </Link>
          </p>
        )}

      </div>
    </div>
  )
}
