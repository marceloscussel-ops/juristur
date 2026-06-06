'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Scale, Eye, EyeOff } from 'lucide-react'

function formatCNPJ(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 14)
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 13)
  if (digits.length <= 2)  return `+${digits}`
  if (digits.length <= 4)  return `+${digits.slice(0,2)} (${digits.slice(2)}`
  if (digits.length <= 9)  return `+${digits.slice(0,2)} (${digits.slice(2,4)}) ${digits.slice(4)}`
  return `+${digits.slice(0,2)} (${digits.slice(2,4)}) ${digits.slice(4,9)}-${digits.slice(9)}`
}

export default function CadastroPage() {
  const [form, setForm] = useState({ name: '', cnpj: '', email: '', phone: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm(prev => ({
      ...prev,
      [name]: name === 'cnpj'  ? formatCNPJ(value)
             : name === 'phone' ? formatPhone(value)
             : value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    const phoneDigits = form.phone.replace(/\D/g, '')
    if (phoneDigits.length < 12) {
      setError('Informe o WhatsApp com DDI e DDD. Ex: +55 (51) 99999-9999')
      return
    }
    setLoading(true)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:     form.name,
        cnpj:     form.cnpj.replace(/\D/g, ''),
        email:    form.email,
        phone:    phoneDigits,
        password: form.password,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Erro ao cadastrar. Tente novamente.')
      setLoading(false)
      return
    }
    router.push('/login?cadastro=ok')
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 no-underline">
            <Scale className="w-5 h-5 text-amber" />
            <span className="font-display text-[22px] text-ink">JurisTur</span>
          </Link>
          <h1 className="j-h1 mt-5 mb-1">Cadastro da agência</h1>
          <p className="j-caption">Crie sua conta e comece a usar</p>
        </div>

        <div className="j-card animate-fade-in">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="j-label" htmlFor="name">Nome da agência</label>
              <input id="name" name="name" type="text" required value={form.name}
                onChange={handleChange} className="j-input"
                placeholder="Viagens Exemplo Turismo Ltda" />
            </div>

            <div>
              <label className="j-label" htmlFor="cnpj">CNPJ</label>
              <input id="cnpj" name="cnpj" type="text" required value={form.cnpj}
                onChange={handleChange} className="j-input font-mono"
                placeholder="00.000.000/0001-00" />
            </div>

            <div>
              <label className="j-label" htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" autoComplete="email" required
                value={form.email} onChange={handleChange} className="j-input"
                placeholder="contato@agencia.com" />
            </div>

            <div>
              <label className="j-label" htmlFor="phone">
                WhatsApp <span className="text-danger">*</span>
              </label>
              <input id="phone" name="phone" type="tel" required value={form.phone}
                onChange={handleChange} className="j-input"
                placeholder="+55 (51) 99999-9999" />
              <p className="j-hint">Mesmo número usado no WhatsApp, com DDI e DDD</p>
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-40 hover:text-ink transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && <div className="j-alert j-alert-danger text-[13px]">{error}</div>}

            <button type="submit" disabled={loading} className="btn btn-primary w-full mt-1">
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>
        </div>

        <p className="text-center j-caption mt-5">
          Já tem conta?{' '}
          <Link href="/login" className="text-indigo hover:underline font-medium">Entrar</Link>
        </p>
      </div>
    </div>
  )
}
