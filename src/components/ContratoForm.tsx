'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Upload, X, FileText, Loader2, AlertCircle, ArrowLeft, FileSignature, Info,
} from 'lucide-react'

const MAX_FILES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

/** Atalhos que preenchem o prompt — tirar o usuário da tela em branco. */
const EXEMPLO = `Cliente: Maria Souza, brasileira, CPF 123.456.789-00, Rua das Flores 120, Porto Alegre/RS, maria@email.com, (51) 99999-0000.

Viagem: pacote para Buenos Aires, 5 a 12 de março de 2027, 2 pessoas.
Inclui: passagens aéreas GRU-EZE ida e volta em classe econômica, 7 noites no Hotel Madero com café da manhã, traslados aeroporto-hotel e plantão 24h.
Valor total: R$ 12.400,00, em 10x no cartão de crédito.
Passagens aéreas não são reembolsáveis. O hotel permite cancelamento até 15 dias antes.`

export default function ContratoForm() {
  const [prompt, setPrompt] = useState('')
  const [files, setFiles]   = useState<File[]>([])
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    const valid: File[] = []
    const errors: string[] = []
    for (const file of selected) {
      if (!ALLOWED_TYPES.includes(file.type)) { errors.push(`${file.name}: tipo não suportado`); continue }
      if (file.size > MAX_FILE_SIZE) { errors.push(`${file.name}: arquivo maior que 10MB`); continue }
      valid.push(file)
    }
    setError(errors.join('; '))
    setFiles(prev => [...prev, ...valid].slice(0, MAX_FILES))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!prompt.trim() && files.length === 0) {
      setError('Envie os documentos do cliente ou preencha os dados no campo de texto.')
      return
    }

    setLoading(true)
    const formData = new FormData()
    formData.append('kind', 'contrato')
    formData.append('prompt', prompt)
    files.forEach(f => formData.append('files', f))

    try {
      const res = await fetch('/api/documents', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao gerar o contrato.'); setLoading(false); return }
      router.push(`/documentos/${data.documentId}`)
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 j-caption text-indigo hover:text-ink transition-colors no-underline mb-5"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar para o painel
      </Link>

      <div className="mb-6">
        <p className="j-overline">Gerar contrato</p>
        <h1 className="j-h1 mt-0.5">Contrato de prestação de serviço</h1>
        <p className="j-caption mt-1">
          Partimos do modelo padrão de intermediação de turismo. Os dados da sua
          agência vêm do cadastro; os do cliente, do que você enviar aqui.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Documentos do cliente */}
        <div className="j-card">
          <label className="j-label mb-1 block">
            Documentos do cliente{' '}
            <span className="text-ink-40 font-normal">(opcional — até {MAX_FILES} arquivos, 10MB cada)</span>
          </label>
          <p className="j-caption mb-3">
            RG, CNH, comprovante de endereço, voucher da reserva, orçamento aprovado.
            Lemos o texto e usamos para preencher a qualificação do contratante.
          </p>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={files.length >= MAX_FILES || loading}
            className="w-full border-2 border-dashed border-line-strong hover:border-indigo rounded-lg p-6 text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-7 h-7 text-ink-40 mx-auto mb-2" />
            <p className="j-body">Clique para selecionar arquivos</p>
            <p className="j-caption mt-0.5">PDF, Word, imagens (JPG, PNG, WEBP)</p>
          </button>
          <input
            ref={fileInputRef} type="file" multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
            onChange={handleFileChange} className="hidden"
          />

          {files.length > 0 && (
            <ul className="mt-3 space-y-2 list-none m-0 p-0">
              {files.map((file, i) => (
                <li key={i} className="flex items-center gap-3 bg-surface rounded-md px-3 py-2">
                  <FileText className="w-4 h-4 text-teal flex-shrink-0" />
                  <span className="j-body truncate flex-1">{file.name}</span>
                  <span className="j-caption flex-shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                  <button
                    type="button"
                    onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-ink-40 hover:text-danger transition-colors flex-shrink-0"
                    aria-label={`Remover ${file.name}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Prompt */}
        <div className="j-card">
          <div className="flex items-start justify-between gap-3 mb-1">
            <label className="j-label" htmlFor="prompt">Dados da viagem e do cliente</label>
            {!prompt && (
              <button
                type="button"
                onClick={() => setPrompt(EXEMPLO)}
                className="j-caption text-indigo hover:underline shrink-0"
              >
                Preencher com um exemplo
              </button>
            )}
          </div>
          <p className="j-caption mb-3">
            Escreva do jeito que for mais fácil. Quanto mais detalhe, menos lacuna
            sobra no contrato — e aqui você também pede ajustes de cláusula.
          </p>
          <textarea
            id="prompt" value={prompt} onChange={e => setPrompt(e.target.value)}
            rows={10} className="j-input j-textarea" disabled={loading}
            placeholder={'Dados do cliente, destino, datas, o que está incluso, valor e forma de pagamento, política de cancelamento...\n\nEx.: "acrescente uma cláusula de multa de 10% por desistência depois de emitida a passagem".'}
          />
          <p className="j-hint text-right">{prompt.length} caracteres</p>
        </div>

        <div className="j-alert j-alert-info">
          <Info className="w-4 h-4 shrink-0 mt-px" />
          <div>
            <span className="font-semibold">O que faltar vira lacuna.</span>{' '}
            Não inventamos dado: o que você não informar sai como{' '}
            <code className="j-mono">__________</code> para preencher à mão.
          </div>
        </div>

        {error && (
          <div className="j-alert j-alert-danger">
            <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
            {error}
          </div>
        )}

        {loading && (
          <div className="j-alert j-alert-info">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <div>
              <div className="font-semibold mb-0.5">Redigindo o contrato...</div>
              Leva alguns segundos. Você confere tudo na tela antes de baixar.
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button" onClick={() => router.back()} disabled={loading}
            className="btn btn-outline flex-1"
          >
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="btn btn-primary flex-1 justify-center">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
              : <><FileSignature className="w-4 h-4" /> Gerar contrato</>}
          </button>
        </div>
      </form>
    </div>
  )
}
