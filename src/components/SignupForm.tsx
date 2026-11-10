'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import OAuthButtons from '@/components/OAuthButtons'
import AceiteContrato from '@/components/AceiteContrato'
import { createClient } from '@/lib/supabase/client'
import { isValidBrazilianMobile } from '@/lib/phone'

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 13)
  if (digits.length <= 2)  return `+${digits}`
  if (digits.length <= 4)  return `+${digits.slice(0,2)} (${digits.slice(2)}`
  if (digits.length <= 9)  return `+${digits.slice(0,2)} (${digits.slice(2,4)}) ${digits.slice(4)}`
  return `+${digits.slice(0,2)} (${digits.slice(2,4)}) ${digits.slice(4,9)}-${digits.slice(9)}`
}

interface Props {
  /** Para onde levar após o cadastro. O onboarding assume daí em diante. */
  redirectTo?: string
  /** Rótulo do botão principal. */
  submitLabel?: string
  /** Canal de aquisição a registrar na agência (ex.: 'evento'). */
  origem?: string
  /**
   * Campanha a usar quando a URL não traz `utm_campaign` — caso de quem digita
   * o endereço à mão em vez de escanear o QR code. Um utm_campaign na URL
   * sempre tem prioridade sobre este valor.
   */
  campanhaPadrao?: string
  /**
   * Slug do indicador que trouxe este cadastro (ex.: 'unav'). Quem manda é o
   * cookie gravado em /i/<slug>, lido no servidor; isto aqui só o repassa para
   * o retorno do OAuth, onde o cookie é o único caminho que sobrevive.
   */
  indicador?: string
}

export default function SignupForm({
  redirectTo  = '/bem-vindo',
  submitLabel = 'Criar conta grátis',
  origem,
  campanhaPadrao,
  indicador,
}: Props) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  // Aceite do contrato: obrigatório para criar a conta, por e-mail ou por Google.
  const [aceite, setAceite]         = useState(false)
  const [aceiteErro, setAceiteErro] = useState('')
  const router   = useRouter()
  const supabase = createClient()

  // utm_campaign identifica QUAL ação trouxe o cadastro (ex.: nome do evento).
  // Lido no cliente para a página poder continuar estática. Sem ele, vale o
  // padrão da página — quem digita o endereço à mão, em vez de escanear o QR,
  // não fica de fora da campanha.
  const [campanha, setCampanha] = useState<string | null>(campanhaPadrao ?? null)
  useEffect(() => {
    const utm = new URLSearchParams(window.location.search).get('utm_campaign')
    if (utm) setCampanha(utm.slice(0, 60))
  }, [])

  // O cadastro por Google não passa pelo /api/auth/register, então a origem e o
  // aceite do contrato viajam na URL de retorno e são gravados no /bem-vindo.
  const oauthNext = (() => {
    const params = new URLSearchParams()
    if (origem) {
      params.set('origem', origem)
      if (campanha) params.set('campanha', campanha)
    }
    if (aceite) params.set('aceite', '1')
    if (indicador) params.set('ind', indicador)
    const qs = params.toString()
    if (!qs) return redirectTo
    return `${redirectTo}${redirectTo.includes('?') ? '&' : '?'}${qs}`
  })()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: name === 'phone' ? formatPhone(value) : value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (!isValidBrazilianMobile(form.phone)) {
      setError('WhatsApp inválido. Informe com DDI e DDD. Ex: +55 (51) 99999-9999')
      return
    }
    if (!aceite) {
      setAceiteErro('É preciso aceitar o contrato para criar a conta.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:     form.name,
          email:    form.email,
          phone:    form.phone.replace(/\D/g, ''),
          password: form.password,
          origem:   origem ?? null,
          origemCampanha: campanha,
          indicador:      indicador ?? null,
          aceiteContrato: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erro ao cadastrar. Tente novamente.')
        setLoading(false)
        return
      }

      // Entra direto: sem essa etapa o usuário teria de digitar e-mail e senha
      // de novo logo após criar a conta.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email:    form.email,
        password: form.password,
      })
      if (signInError) {
        // Conta criada, mas a sessão falhou: manda para o login em vez de travar.
        router.push('/login?cadastro=ok')
        return
      }

      router.push(redirectTo)
      router.refresh()
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.')
      setLoading(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="j-label" htmlFor="name">Nome da agência</label>
          <input id="name" name="name" type="text" required value={form.name}
            onChange={handleChange} className="j-input"
            placeholder="Viagens Exemplo Turismo" />
        </div>

        <div>
          <label className="j-label" htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" autoComplete="email" required
            value={form.email} onChange={handleChange} className="j-input"
            placeholder="contato@agencia.com" />
        </div>

        <div>
          <label className="j-label" htmlFor="phone">WhatsApp</label>
          <input id="phone" name="phone" type="tel" required value={form.phone}
            onChange={handleChange} className="j-input"
            placeholder="+55 (51) 99999-9999" />
          <p className="j-hint">É por aqui que avisamos quando a análise ficar pronta</p>
        </div>

        <div>
          <label className="j-label" htmlFor="password">Senha</label>
          <div className="relative">
            <input
              id="password" name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password" required
              value={form.password} onChange={handleChange}
              className="j-input pr-10" placeholder="Mínimo 6 caracteres"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-40 hover:text-ink transition-colors"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <AceiteContrato
          checked={aceite}
          disabled={loading}
          erro={aceiteErro}
          onChange={v => { setAceite(v); if (v) setAceiteErro('') }}
        />

        {error && <div className="j-alert j-alert-danger text-[13px]">{error}</div>}

        <button type="submit" disabled={loading} className="btn btn-primary w-full mt-1 justify-center">
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando conta...</>
            : submitLabel}
        </button>

        <p className="j-caption text-center">
          7 dias grátis · sem cartão de crédito
        </p>
      </form>

      <div className="mt-4">
        <OAuthButtons
          next={oauthNext}
          bloqueado={!aceite}
          onBloqueado={() => setAceiteErro('É preciso aceitar o contrato para criar a conta.')}
        />
      </div>
    </>
  )
}
