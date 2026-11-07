'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, Download, Loader2, RefreshCw, AlertCircle, FileText, FileType2, Trash2,
} from 'lucide-react'

type Formato = 'pdf' | 'docx'

interface Props {
  documentId: string
  /** `true` quando o documento já foi confirmado — libera os downloads. */
  confirmed:  boolean
  /** `false` quando a geração falhou: só resta tentar de novo. */
  hasContent: boolean
}

/**
 * Barra de ações do documento: confirmar o rascunho, gerar de novo e baixar.
 *
 * O download só aparece depois do "confirmar" de propósito — é o passo em que
 * a agência declara que conferiu as lacunas e os valores antes de mandar o
 * arquivo para o cliente assinar.
 */
export default function DocumentActions({ documentId, confirmed, hasContent }: Props) {
  const [isConfirmed, setIsConfirmed] = useState(confirmed)
  const [busy, setBusy]   = useState<'confirmar' | 'regenerar' | 'excluir' | Formato | null>(null)
  const [error, setError] = useState('')
  // Exclusão em dois cliques: o segundo confirma. Evita apagar sem querer um
  // documento que levou uma geração inteira para sair.
  const [askDelete, setAskDelete] = useState(false)
  const router = useRouter()

  async function remove() {
    setBusy('excluir')
    setError('')
    try {
      const res = await fetch(`/api/documents/${documentId}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? 'Não foi possível excluir.')
      }
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível excluir.')
      setBusy(null)
    }
  }

  async function patch(action: 'confirmar' | 'regenerar') {
    setBusy(action)
    setError('')
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Não foi possível concluir a ação.')

      if (action === 'confirmar') setIsConfirmed(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir a ação.')
    } finally {
      setBusy(null)
    }
  }

  async function download(formato: Formato) {
    setBusy(formato)
    setError('')
    try {
      const res = await fetch(`/api/documents/${documentId}/download?formato=${formato}`)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? 'Não foi possível gerar o arquivo.')
      }

      const blob = await res.blob()
      const filename = res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1]
        ?? `documento.${formato}`

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível gerar o arquivo.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="j-card mt-4">
      {!hasContent ? (
        <>
          <p className="j-h3 mb-1">A geração não terminou</p>
          <p className="j-caption mb-4">
            O rascunho foi salvo com os seus dados e anexos. Tente gerar de novo.
          </p>
          <button
            onClick={() => patch('regenerar')}
            disabled={busy !== null}
            className="btn btn-primary"
          >
            {busy === 'regenerar'
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
              : <><RefreshCw className="w-4 h-4" /> Gerar novamente</>}
          </button>
        </>
      ) : isConfirmed ? (
        <>
          <p className="j-label mb-1 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-teal" />
            Documento confirmado
          </p>
          <p className="j-caption mb-4">
            Baixe no formato que preferir. O Word serve para ajustar as lacunas
            antes de imprimir; o PDF, para enviar pronto.
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => download('docx')} disabled={busy !== null} className="btn btn-primary">
              {busy === 'docx'
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                : <><FileType2 className="w-4 h-4" /> Baixar Word (.docx)</>}
            </button>
            <button onClick={() => download('pdf')} disabled={busy !== null} className="btn btn-outline">
              {busy === 'pdf'
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                : <><FileText className="w-4 h-4" /> Baixar PDF</>}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="j-h3 mb-1">Confira antes de baixar</p>
          <p className="j-caption mb-4">
            Leia o texto acima e verifique as lacunas, os valores e as datas. Ao
            confirmar, liberamos o download em Word e PDF.
          </p>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => patch('confirmar')} disabled={busy !== null} className="btn btn-primary">
              {busy === 'confirmar'
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Confirmando...</>
                : <><CheckCircle2 className="w-4 h-4" /> Confirmar documento</>}
            </button>
            <button onClick={() => patch('regenerar')} disabled={busy !== null} className="btn btn-outline">
              {busy === 'regenerar'
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                : <><RefreshCw className="w-4 h-4" /> Gerar novamente</>}
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="j-alert j-alert-danger mt-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
          {error}
        </div>
      )}

      {/* Dica discreta: o download também fica disponível na volta ao painel. */}
      {isConfirmed && (
        <p className="j-caption mt-3 flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5" />
          Este documento fica no seu painel — dá para baixar de novo quando quiser.
        </p>
      )}

      {/* Descartar. Fica separado do resto para não competir com a ação principal. */}
      <div className="j-divider" />
      {askDelete ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="j-caption">
            Excluir este documento{isConfirmed ? ' confirmado' : ''}? Não dá para desfazer.
          </span>
          <button onClick={remove} disabled={busy !== null} className="btn btn-danger btn-sm">
            {busy === 'excluir'
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Excluindo...</>
              : 'Sim, excluir'}
          </button>
          <button
            onClick={() => setAskDelete(false)} disabled={busy !== null}
            className="btn btn-ghost btn-sm"
          >
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAskDelete(true)} disabled={busy !== null}
          className="inline-flex items-center gap-1.5 j-caption text-ink-40 hover:text-danger transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Excluir documento
        </button>
      )}
    </div>
  )
}
