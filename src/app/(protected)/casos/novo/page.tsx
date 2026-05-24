'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CASE_CATEGORIES } from '@/types'
import { Upload, X, FileText, Loader2, AlertCircle } from 'lucide-react'

const MAX_FILES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
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
      if (!ALLOWED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: tipo não suportado`)
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: arquivo maior que 10MB`)
        continue
      }
      valid.push(file)
    }

    if (errors.length > 0) {
      setError(errors.join('; '))
    }

    setFiles(prev => {
      const combined = [...prev, ...valid]
      return combined.slice(0, MAX_FILES)
    })

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!category) {
      setError('Selecione a categoria do caso.')
      return
    }

    setLoading(true)

    const formData = new FormData()
    formData.append('title', title)
    formData.append('description', description)
    formData.append('category', category)
    files.forEach(f => formData.append('files', f))

    try {
      const res = await fetch('/api/cases', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao abrir caso. Tente novamente.')
        setLoading(false)
        return
      }

      router.push(`/casos/${data.caseId}`)
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Abrir novo caso</h1>
        <p className="text-gray-500 mt-1">Descreva a situação jurídica para receber análise da IA</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-5">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Título do caso <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="input-field"
              placeholder="Ex: Cliente solicita reembolso de pacote cancelado"
              maxLength={150}
            />
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Categoria <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="input-field bg-white"
            >
              <option value="">Selecione a categoria...</option>
              {CASE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Descrição do problema <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={7}
              className="input-field resize-none"
              placeholder="Descreva detalhadamente a situação: o que aconteceu, quando, quem está envolvido, qual o valor em disputa, e qualquer informação relevante..."
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{description.length} caracteres</p>
          </div>
        </div>

        <div className="card">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Documentos anexos <span className="text-gray-400 font-normal">(opcional — até {MAX_FILES} arquivos, 10MB cada)</span>
          </label>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={files.length >= MAX_FILES}
            className="w-full border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-xl p-6 text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Clique para selecionar arquivos</p>
            <p className="text-xs text-gray-400 mt-1">PDF, Word, imagens (JPG, PNG, WEBP)</p>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {files.length > 0 && (
            <ul className="mt-3 space-y-2">
              {files.map((file, i) => (
                <li key={i} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                  <FileText className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate flex-1">{file.name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {loading && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg px-4 py-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
            <div>
              <p className="font-medium">Analisando seu caso...</p>
              <p className="text-blue-600 text-xs mt-0.5">Isso pode levar alguns segundos. Por favor, aguarde.</p>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading}
            className="btn-secondary flex-1"
          >
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analisando...
              </>
            ) : (
              'Enviar para análise'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
