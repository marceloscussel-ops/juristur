'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CASE_CATEGORIES } from '@/types'
import { Upload, X, FileText, Loader2, AlertCircle } from 'lucide-react'

const MAX_FILES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export default function NovoCasoPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState('')
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
    if (errors.length) setError(errors.join('; '))
    setFiles(prev => [...prev, ...valid].slice(0, MAX_FILES))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!category) { setError('Selecione a categoria do caso.'); return }
    setLoading(true)
    const formData = new FormData()
    formData.append('title', title)
    formData.append('description', description)
    formData.append('category', category)
    files.forEach(f => formData.append('files', f))
    try {
      const res = await fetch('/api/cases', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao abrir caso.'); setLoading(false); return }
      router.push(`/casos/${data.caseId}`)
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <p className="j-overline">Assessoria jurídica</p>
        <h1 className="j-h1 mt-0.5">Abrir novo caso</h1>
        <p className="j-caption mt-1">Descreva a situação para receber análise da IA</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="j-card space-y-5">
          {/* Título */}
          <div>
            <label className="j-label" htmlFor="title">Título do caso <span className="text-danger">*</span></label>
            <input id="title" type="text" required value={title} onChange={e => setTitle(e.target.value)} className="j-input" placeholder="Ex: Cliente solicita reembolso de pacote cancelado" maxLength={150} />
          </div>

          {/* Categoria */}
          <div>
            <label className="j-label" htmlFor="category">Categoria <span className="text-danger">*</span></label>
            <select id="category" value={category} onChange={e => setCategory(e.target.value)}
              className="j-input appearance-none bg-no-repeat bg-white"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234A5568' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundPosition: 'right 12px center',
                paddingRight: '36px',
              }}
            >
              <option value="">Selecione a categoria...</option>
              {CASE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          {/* Descrição */}
          <div>
            <label className="j-label" htmlFor="description">Descrição do problema <span className="text-danger">*</span></label>
            <textarea id="description" required value={description} onChange={e => setDescription(e.target.value)} rows={7} className="j-input j-textarea"
              placeholder="Descreva detalhadamente a situação: o que aconteceu, quando, quem está envolvido, qual o valor em disputa..." />
            <p className="j-hint text-right">{description.length} caracteres</p>
          </div>
        </div>

        {/* Arquivos */}
        <div className="j-card">
          <label className="j-label mb-3 block">
            Documentos anexos <span className="text-slate-light font-normal">(opcional — até {MAX_FILES} arquivos, 10MB cada)</span>
          </label>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={files.length >= MAX_FILES}
            className="w-full border-2 border-dashed border-[rgba(15,30,56,0.18)] hover:border-teal rounded-lg p-6 text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-7 h-7 text-slate-light mx-auto mb-2" />
            <p className="j-body">Clique para selecionar arquivos</p>
            <p className="j-caption mt-0.5">PDF, Word, imagens (JPG, PNG, WEBP)</p>
          </button>
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" onChange={handleFileChange} className="hidden" />
          {files.length > 0 && (
            <ul className="mt-3 space-y-2">
              {files.map((file, i) => (
                <li key={i} className="flex items-center gap-3 bg-surface rounded-md px-3 py-2">
                  <FileText className="w-4 h-4 text-teal flex-shrink-0" />
                  <span className="j-body truncate flex-1">{file.name}</span>
                  <span className="j-caption flex-shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                  <button type="button" onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-slate-light hover:text-danger transition-colors flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Erro */}
        {error && (
          <div className="j-alert j-alert-danger">
            <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="j-alert j-alert-info">
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            <div>
              <div className="font-semibold mb-0.5">Analisando seu caso...</div>
              Isso pode levar alguns segundos. Por favor, aguarde.
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()} disabled={loading} className="btn btn-outline flex-1">Cancelar</button>
          <button type="submit" disabled={loading} className="btn btn-primary flex-1 justify-center">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando...</> : 'Enviar para análise'}
          </button>
        </div>
      </form>
    </div>
  )
}
