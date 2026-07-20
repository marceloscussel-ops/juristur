'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Mail } from 'lucide-react'
import TGLogo from '@/components/TGLogo'

type Step = 'email' | 'sent'

export default function EsqueciSenhaPage() {
  const [step, setStep]   = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (window.location.search.includes('erro=1')) {
      setError('O link expirou ou já foi utilizado. Solicite um novo abaixo.')
    }
  }, [])

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const redirectTo = `${window.location.origin}/auth/callback?next=/resetar-senha`

    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    setLoading(false)

    if (error) {
      if (error.status === 429) {
        setError('Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.')
      } else {
        setError('Não foi possível enviar o e-mail. Verifique o endereço e tente novamente.')
      }
      return
    }

    setStep('sent')
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[400px]">

        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center no-underline">
            <TGLogo size={36} variant="color" withWordmark />
          </Link>
          <h1 className="j-h1 mt-5 mb-1">Recuperar senha</h1>
          <p className="j-caption">
            {step === 'sent'
              ? 'Verifique sua caixa de entrada'
              : 'Vamos enviar um link para redefinir sua senha'}
          </p>
        </div>

        <div className="j-card animate-fade-in">

          {step === 'email' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="j-label" htmlFor="email">E-mail da sua conta</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="j-input"
                  placeholder="agencia@exemplo.com"
                  autoFocus
                />
                <p className="j-caption mt-2">
                  Enviaremos um link seguro para redefinir sua senha.
                </p>
              </div>

              {error && (
                <div className="j-alert j-alert-danger text-[13px]">{error}</div>
              )}

              <button type="submit" disabled={loading} className="btn btn-primary w-full">
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </form>
          )}

          {step === 'sent' && (
            <div className="text-center space-y-4 py-2">
              <div className="w-14 h-14 rounded-full bg-indigo/10 flex items-center justify-center mx-auto">
                <Mail className="w-7 h-7 text-indigo" />
              </div>
              <div>
                <p className="j-body font-medium mb-1">Link enviado para</p>
                <p className="text-[13px] font-semibold text-indigo">{email}</p>
              </div>
              <p className="j-caption">
                Clique no link do e-mail para criar uma nova senha. Verifique também a pasta de spam.
              </p>
              <div className="j-divider" />
              <button
                type="button"
                onClick={() => { setStep('email'); setError('') }}
                className="j-caption text-indigo hover:underline"
              >
                Não recebeu? Tentar com outro e-mail
              </button>
            </div>
          )}

        </div>

        <p className="text-center j-caption mt-5">
          <Link
            href="/login"
            className="text-indigo hover:underline font-medium inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" /> Voltar para o login
          </Link>
        </p>

      </div>
    </div>
  )
}
