'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

/**
 * Baixa o PDF pronto do caso.
 *
 * Antes isto chamava window.print() e dependia da "impressora PDF" do sistema —
 * confuso para quem não conhece o diálogo de impressão. Agora o arquivo vem
 * montado do servidor e é salvo direto.
 */
export default function DownloadPdfButton({ caseId }: { caseId: string }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function download() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/cases/${caseId}/pdf`)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error ?? 'Não foi possível gerar o PDF.')
      }

      const blob = await res.blob()
      const filename = res.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1]
        ?? 'caso.pdf'

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível gerar o PDF.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={download}
        disabled={loading}
        className="btn btn-outline print:hidden"
        title="Baixar a orientação em PDF"
      >
        {loading
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Download className="w-4 h-4" />}
        {loading ? 'Gerando PDF…' : 'Baixar PDF'}
      </button>
      {error && <span className="j-caption text-red-600">{error}</span>}
    </div>
  )
}
