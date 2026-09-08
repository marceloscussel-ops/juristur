'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Trash2, AlertTriangle, Loader2, X, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const CONFIRMACAO = 'EXCLUIR'

/**
 * Seção de privacidade do perfil (LGPD): exportar os próprios dados e excluir a
 * conta. A exportação vem antes de propósito — quem exclui perde todo o
 * histórico de casos, e é justo oferecer uma cópia primeiro.
 */
export default function PrivacySection() {
  const [modalAberto, setModalAberto] = useState(false)
  const [baixando, setBaixando]       = useState(false)

  async function baixarDados() {
    setBaixando(true)
    try {
      const res = await fetch('/api/profile/export')
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `turisguard-meus-dados-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      alert('Não foi possível baixar os dados agora. Tente novamente em instantes.')
    } finally {
      setBaixando(false)
    }
  }

  return (
    <>
      <div className="j-card mt-4">
        <p className="j-label mb-1 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo" />
          Meus dados e privacidade
        </p>
        <p className="j-caption mb-4">
          A LGPD garante a você acesso, portabilidade e eliminação dos seus dados.
        </p>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="j-body font-medium">Baixar meus dados</p>
              <p className="j-caption">Cadastro, casos, análises e mensagens, em um arquivo JSON.</p>
            </div>
            <button
              type="button"
              onClick={baixarDados}
              disabled={baixando}
              className="btn btn-outline btn-sm shrink-0"
            >
              {baixando
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparando…</>
                : <><Download className="w-3.5 h-3.5" /> Baixar</>}
            </button>
          </div>

          <div className="j-divider" />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="j-body font-medium">Excluir minha conta</p>
              <p className="j-caption">Apaga a conta e todos os dados. Não há como desfazer.</p>
            </div>
            <button
              type="button"
              onClick={() => setModalAberto(true)}
              className="btn btn-danger btn-sm shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </button>
          </div>
        </div>
      </div>

      {modalAberto && <DeleteModal onClose={() => setModalAberto(false)} />}
    </>
  )
}

function DeleteModal({ onClose }: { onClose: () => void }) {
  const [texto, setTexto]     = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro]       = useState('')
  const [pronto, setPronto]   = useState(false)
  const router   = useRouter()
  const supabase = createClient()

  const podeExcluir = texto.trim().toUpperCase() === CONFIRMACAO

  async function excluir() {
    if (!podeExcluir || loading) return
    setErro('')
    setLoading(true)
    try {
      const res  = await fetch('/api/profile/delete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ confirmacao: texto.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErro(data.error || 'Não foi possível excluir a conta.')
        setLoading(false)
        return
      }

      // Conta apagada: a sessão já não vale nada. Encerra e sai da área logada.
      setPronto(true)
      await supabase.auth.signOut().catch(() => {})
      setTimeout(() => { router.push('/'); router.refresh() }, 1800)
    } catch {
      setErro('Erro de conexão. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4 animate-fade-in"
      onClick={pronto ? undefined : onClose}
    >
      <div className="j-card max-w-[440px] w-full relative animate-fade-up" onClick={e => e.stopPropagation()}>
        {pronto ? (
          <div className="text-center py-6">
            <ShieldCheck className="w-10 h-10 text-teal mx-auto mb-3" />
            <p className="j-h3 mb-1">Conta excluída</p>
            <p className="j-caption">Seus dados foram apagados. Obrigado por ter usado o TurisGuard.</p>
          </div>
        ) : (
          <>
            {!loading && (
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 text-ink-40 hover:text-ink transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            <div className="w-12 h-12 rounded-full bg-coral-50 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 text-coral" />
            </div>

            <h3 className="j-h2">Excluir sua conta</h3>
            <p className="j-body text-ink-80 mt-2">
              Esta ação é <strong>permanente</strong> e apaga:
            </p>
            <ul className="mt-2 space-y-1 list-disc pl-5 j-body text-ink-80">
              <li>o cadastro da agência e o acesso à plataforma;</li>
              <li>todos os casos, análises e mensagens;</li>
              <li>os documentos anexados aos casos.</li>
            </ul>

            <p className="j-caption mt-3">
              Por obrigação legal, os registros fiscais de pagamentos são mantidos sem
              vínculo com a sua agência. Se houver assinatura ativa, ela é cancelada — o
              tempo restante já pago não é reembolsado.
            </p>

            <div className="j-alert j-alert-warning mt-4 text-[13px]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
              <span>Quer guardar seu histórico? Feche esta janela e use <strong>Baixar meus dados</strong> antes.</span>
            </div>

            <label className="j-label mt-4 block" htmlFor="confirmacao">
              Digite <span className="font-mono font-bold">{CONFIRMACAO}</span> para confirmar
            </label>
            <input
              id="confirmacao"
              type="text"
              value={texto}
              onChange={e => setTexto(e.target.value)}
              disabled={loading}
              className="j-input font-mono"
              placeholder={CONFIRMACAO}
              autoComplete="off"
            />

            {erro && <p className="text-xs text-coral mt-2">{erro}</p>}

            <button
              type="button"
              onClick={excluir}
              disabled={!podeExcluir || loading}
              className="btn btn-danger w-full mt-4 justify-center"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Excluindo…</>
                : 'Excluir minha conta permanentemente'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
