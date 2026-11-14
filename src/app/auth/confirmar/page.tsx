'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { KeyRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import TGLogo from '@/components/TGLogo'

/**
 * Porta de entrada do link de "esqueci minha senha".
 *
 * O template de e-mail (supabase/email-templates/recuperar-senha.html) aponta
 * para cá com `?token_hash=...&type=recovery`, em vez do {{ .ConfirmationURL }}
 * padrão. Dois problemas do link padrão que isto resolve:
 *
 * 1. Antivírus de e-mail (Outlook Safe Links, Gmail, Defender) abrem o link
 *    antes da pessoa para checar se é seguro. O link do Supabase é de uso
 *    único: o robô gastava o token e a pessoa via "link expirado" segundos
 *    depois de pedir. Aqui a verificação só acontece no clique do botão —
 *    robô não clica em botão.
 * 2. O fluxo PKCE exige abrir o link no MESMO navegador que pediu (o
 *    verificador fica num cookie dele). Pedir no computador e abrir no
 *    celular, ou no navegador embutido do app de e-mail, falhava. O
 *    verifyOtp com token_hash não depende desse cookie.
 */
function Confirmar() {
  const router = useRouter()
  const params = useSearchParams()
  const tokenHash = params.get('token_hash')
  const type = params.get('type')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const valido = !!tokenHash && type === 'recovery'

  async function continuar() {
    if (!tokenHash) return
    setError('')
    setLoading(true)

    const { error } = await createClient().auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    })

    if (error) {
      setLoading(false)
      setError('Este link expirou ou já foi utilizado. Solicite um novo.')
      return
    }

    // Tira o token da barra de endereços/histórico antes de seguir.
    router.replace('/resetar-senha')
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[400px]">

        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center no-underline">
            <TGLogo size={36} variant="color" withWordmark />
          </Link>
          <h1 className="j-h1 mt-5 mb-1">Redefinir senha</h1>
          <p className="j-caption">Confirme para continuar</p>
        </div>

        <div className="j-card animate-fade-in text-center space-y-4 py-2">
          <div className="w-14 h-14 rounded-full bg-indigo/10 flex items-center justify-center mx-auto">
            <KeyRound className="w-7 h-7 text-indigo" />
          </div>

          {valido ? (
            <>
              <p className="j-caption">
                Clique no botão abaixo para criar uma nova senha para a sua conta.
              </p>

              {error && (
                <div className="j-alert j-alert-danger text-[13px] text-left">{error}</div>
              )}

              {error ? (
                <Link href="/esqueci-senha" className="btn btn-primary w-full no-underline">
                  Solicitar novo link
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={continuar}
                  disabled={loading}
                  className="btn btn-primary w-full"
                >
                  {loading ? 'Verificando...' : 'Continuar para nova senha'}
                </button>
              )}
            </>
          ) : (
            <>
              <div className="j-alert j-alert-danger text-[13px] text-left">
                Link incompleto ou inválido. Solicite um novo link de recuperação.
              </div>
              <Link href="/esqueci-senha" className="btn btn-primary w-full no-underline">
                Solicitar novo link
              </Link>
            </>
          )}
        </div>

      </div>
    </div>
  )
}

export default function ConfirmarPage() {
  return (
    <Suspense>
      <Confirmar />
    </Suspense>
  )
}
