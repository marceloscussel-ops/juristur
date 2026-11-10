'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Upload, X, FileText, Loader2, AlertCircle, ArrowLeft, FilePlus2, Info, ChevronDown,
} from 'lucide-react'
import {
  DOCUMENT_GROUPS,
  FEATURED_DOCUMENT_TYPES,
  OTHER_DOCUMENT_TYPE_ID,
  MAX_FREE_TYPE_LENGTH,
  documentTypesByGroup,
  getDocumentType,
} from '@/lib/templates/documentos'

const MAX_FILES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const PLACEHOLDER_GENERICO =
  'Descreva o documento que você precisa, com os dados das partes, os valores e as datas.\n\n' +
  'Quanto mais detalhe, menos lacuna sobra para preencher à mão.'

/**
 * Gerar documento (kind='outro'): o irmão do ContratoForm, sem modelo base.
 *
 * O tipo escolhido no combo não é só um rótulo — ele carrega o guia de redação
 * do catálogo (ver lib/templates/documentos.ts), que a API injeta no prompt. A
 * tela só manda o id; o rótulo e o guia saem do catálogo no servidor.
 */
export default function DocumentoForm() {
  const [typeId, setTypeId]     = useState('')
  const [freeType, setFreeType] = useState('')
  const [prompt, setPrompt]     = useState('')
  const [files, setFiles]       = useState<File[]>([])
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const selected = getDocumentType(typeId)
  const isOther  = typeId === OTHER_DOCUMENT_TYPE_ID

  /** Troca de tipo: o exemplo do tipo anterior não serve para o novo. */
  function pickType(id: string) {
    const anterior = getDocumentType(typeId)
    setTypeId(id)
    setError('')
    // Só limpa o texto se ele ainda for o exemplo que nós preenchemos.
    if (anterior && prompt.trim() === anterior.exemplo.trim()) setPrompt('')
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selecionados = Array.from(e.target.files ?? [])
    const valid: File[] = []
    const errors: string[] = []
    for (const file of selecionados) {
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

    if (!typeId) { setError('Escolha o tipo de documento.'); return }
    if (isOther && !freeType.trim()) { setError('Diga qual documento você precisa.'); return }
    if (!prompt.trim()) { setError('Descreva o documento: quem são as partes, os valores e as datas.'); return }

    setLoading(true)
    const formData = new FormData()
    formData.append('kind', 'outro')
    formData.append('prompt', prompt)
    if (isOther) formData.append('doc_type', freeType.trim())
    else formData.append('doc_type_id', typeId)
    files.forEach(f => formData.append('files', f))

    try {
      const res = await fetch('/api/documents', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao gerar o documento.'); setLoading(false); return }
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
        <p className="j-overline">Gerar documento</p>
        <h1 className="j-h1 mt-0.5">Documento avulso</h1>
        <p className="j-caption mt-1">
          E-mail, termo de ciência, formalização financeira, notificação. Aqui não
          partimos de um modelo: escolha o tipo e descreva o caso. Os dados da sua
          agência vêm do cadastro.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipo */}
        <div className="j-card">
          <label className="j-label mb-1 block" htmlFor="doc-type">
            Tipo de documento <span className="text-danger">*</span>
          </label>
          <p className="j-caption mb-3">
            Cada tipo tem uma estrutura e uma base legal própria — é isso que
            escolhemos aqui. Não achou o seu? Use <strong>Outro</strong>.
          </p>

          {/* Atalhos dos mais usados */}
          <div className="flex flex-wrap gap-2 mb-3">
            {FEATURED_DOCUMENT_TYPES.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => pickType(t.id)}
                disabled={loading}
                className={`rounded-pill border px-3 py-1.5 text-[12.5px] font-medium transition-colors disabled:opacity-50 ${
                  typeId === t.id
                    ? 'border-indigo bg-indigo-50 text-indigo'
                    : 'border-line-strong text-ink-80 hover:border-indigo/50 hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <select
              id="doc-type"
              value={typeId}
              onChange={e => pickType(e.target.value)}
              disabled={loading}
              className="j-input appearance-none cursor-pointer pr-10"
            >
              <option value="">Selecione o tipo...</option>
              {DOCUMENT_GROUPS.map(g => (
                <optgroup key={g.id} label={g.label}>
                  {documentTypesByGroup(g.id).map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </optgroup>
              ))}
              <optgroup label="Outro">
                <option value={OTHER_DOCUMENT_TYPE_ID}>Outro — eu digito qual</option>
              </optgroup>
            </select>
            <ChevronDown className="w-4 h-4 text-ink-40 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {selected && <p className="j-hint">{selected.ajuda}</p>}

          {isOther && (
            <div className="mt-3">
              <label className="j-label mb-1 block" htmlFor="free-type">
                Qual documento? <span className="text-danger">*</span>
              </label>
              <input
                id="free-type" type="text" value={freeType}
                onChange={e => setFreeType(e.target.value)}
                maxLength={MAX_FREE_TYPE_LENGTH} disabled={loading}
                className="j-input"
                placeholder="Ex.: Declaração de comparecimento para o consulado"
              />
              <p className="j-hint">
                Este nome identifica o documento no seu painel. Explique o resto no
                campo abaixo.
              </p>
            </div>
          )}
        </div>

        {/* Pedido */}
        <div className="j-card">
          <div className="flex items-start justify-between gap-3 mb-1">
            <label className="j-label" htmlFor="prompt">
              O que o documento precisa dizer <span className="text-danger">*</span>
            </label>
            {selected && !prompt && (
              <button
                type="button"
                onClick={() => setPrompt(selected.exemplo)}
                className="j-caption text-indigo hover:underline shrink-0"
              >
                Preencher com um exemplo
              </button>
            )}
          </div>
          <p className="j-caption mb-3">
            Escreva do jeito que for mais fácil — nomes, documentos, valores, datas e
            o que você quer que fique registrado.
          </p>
          <textarea
            id="prompt" value={prompt} onChange={e => setPrompt(e.target.value)}
            rows={10} className="j-input j-textarea" disabled={loading}
            placeholder={selected?.placeholder ?? PLACEHOLDER_GENERICO}
          />
          <p className="j-hint text-right">{prompt.length} caracteres</p>
        </div>

        {/* Anexos */}
        <div className="j-card">
          <label className="j-label mb-1 block">
            Documentos de apoio{' '}
            <span className="text-ink-40 font-normal">(opcional — até {MAX_FILES} arquivos, 10MB cada)</span>
          </label>
          <p className="j-caption mb-3">
            Contrato original, voucher, print da conversa com o cliente, regra
            tarifária do fornecedor, e-mail do cancelamento. Lemos o texto e usamos
            como fonte dos dados.
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
              <div className="font-semibold mb-0.5">Redigindo o documento...</div>
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
              : <><FilePlus2 className="w-4 h-4" /> Gerar documento</>}
          </button>
        </div>
      </form>
    </div>
  )
}
