'use client'

/**
 * LogoAgencia — envio, troca e remoção da logomarca no Perfil da agência.
 *
 * A logo sai no cabeçalho dos contratos e documentos gerados (PDF e Word).
 * O titular edita; o membro só vê (mesma regra dos demais dados cadastrais).
 *
 * PDF e Word só embutem PNG e JPEG. WebP e SVG são aceitos aqui e convertidos
 * para PNG no próprio navegador antes do envio — o servidor recebe sempre um
 * formato que os geradores entendem.
 */
import { useRef, useState } from 'react'
import { AlertCircle, CheckCircle, ImageIcon, Loader2, Trash2, Upload } from 'lucide-react'

const MAX_BYTES = 2 * 1024 * 1024
const ACEITOS = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
/** Maior lado da imagem convertida. Suficiente para impressão no tamanho do cabeçalho. */
const MAX_LADO = 1200

function carregarImagem(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('imagem'))
    img.src = url
  })
}

/** Proporção do SVG pelo viewBox, para quando ele não declara largura e altura. */
async function proporcaoDoSvg(file: File): Promise<number | null> {
  const texto = await file.text()
  const m = texto.match(/viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i)
  if (!m) return null
  const w = parseFloat(m[1]), h = parseFloat(m[2])
  return w > 0 && h > 0 ? w / h : null
}

/**
 * Deixa o arquivo pronto para o servidor: PNG e JPEG passam como estão; WebP
 * e SVG viram PNG via canvas (fundo transparente preservado).
 */
async function prepararLogo(file: File): Promise<Blob> {
  if (file.type === 'image/png' || file.type === 'image/jpeg') return file

  const url = URL.createObjectURL(file)
  try {
    const img = await carregarImagem(url)
    let w = img.naturalWidth
    let h = img.naturalHeight

    if (file.type === 'image/svg+xml') {
      // SVG é vetor: desenha grande para sair nítido no PDF.
      const ratio = (w && h ? w / h : null) ?? await proporcaoDoSvg(file) ?? 3
      if (ratio >= 1) { w = MAX_LADO; h = Math.round(MAX_LADO / ratio) }
      else            { h = MAX_LADO; w = Math.round(MAX_LADO * ratio) }
    } else {
      const escala = Math.min(1, MAX_LADO / Math.max(w, h))
      w = Math.round(w * escala); h = Math.round(h * escala)
    }
    if (!w || !h) throw new Error('dimensao')

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('canvas')
    ctx.drawImage(img, 0, 0, w, h)

    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/png'))
    if (!blob) throw new Error('png')
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}

export default function LogoAgencia({
  logoPath, podeEditar, onChange,
}: {
  logoPath:   string | null | undefined
  podeEditar: boolean
  onChange:   (path: string | null) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [enviando, setEnviando]   = useState(false)
  const [removendo, setRemovendo] = useState(false)
  const [erro, setErro]           = useState('')
  const [ok, setOk]               = useState('')
  const [falhouPreview, setFalhouPreview] = useState(false)

  const ocupado = enviando || removendo

  async function enviar(file: File) {
    setErro(''); setOk('')

    if (!ACEITOS.includes(file.type)) {
      setErro('Formato não aceito. Envie a logomarca em PNG, JPG, WebP ou SVG.')
      return
    }
    if (file.size > MAX_BYTES) {
      setErro('A imagem passa de 2 MB. Envie um arquivo menor.')
      return
    }

    setEnviando(true)
    try {
      let pronto: Blob
      try {
        pronto = await prepararLogo(file)
      } catch {
        setErro('Não foi possível ler esta imagem. Tente outro arquivo ou envie em PNG.')
        return
      }
      if (pronto.size > MAX_BYTES) {
        setErro('A imagem convertida passou de 2 MB. Envie uma versão menor em PNG ou JPG.')
        return
      }

      const form = new FormData()
      const nome = pronto === file ? file.name : 'logo.png'
      form.append('file', pronto, nome)

      const res  = await fetch('/api/profile/logo', { method: 'POST', body: form })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErro(data.error || 'Não foi possível enviar a logomarca.')
        return
      }
      setFalhouPreview(false)
      onChange(data.logo_path ?? null)
      setOk('Logomarca salva. Ela já sai nos próximos downloads de contratos e documentos.')
    } finally {
      setEnviando(false)
      if (input.current) input.current.value = ''
    }
  }

  async function remover() {
    setErro(''); setOk('')
    setRemovendo(true)
    const res  = await fetch('/api/profile/logo', { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    setRemovendo(false)
    if (!res.ok) {
      setErro(data.error || 'Não foi possível remover a logomarca.')
      return
    }
    onChange(null)
    setOk('Logomarca removida. Os documentos voltam a sair sem logo.')
  }

  const temLogo = !!logoPath && !falhouPreview

  return (
    <div className="j-card mb-4">
      <p className="j-label mb-1">Logomarca</p>
      <p className="j-caption mb-4">
        Sai no cabeçalho dos contratos e documentos gerados, em PDF e Word.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center justify-center w-48 h-24 rounded-lg border border-line bg-surface overflow-hidden shrink-0">
          {temLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/profile/logo?v=${encodeURIComponent(logoPath!)}`}
              alt="Logomarca da agência"
              className="max-w-full max-h-full object-contain p-2"
              onError={() => setFalhouPreview(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-1 text-ink-40">
              <ImageIcon className="w-6 h-6" />
              <span className="text-[12px]">Sem logomarca</span>
            </div>
          )}
        </div>

        {podeEditar ? (
          <div className="flex flex-col gap-2">
            <input
              ref={input}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) enviar(f) }}
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button" className="btn btn-outline" disabled={ocupado}
                onClick={() => input.current?.click()}
              >
                {enviando
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando…</>
                  : <><Upload className="w-4 h-4" /> {logoPath ? 'Trocar logomarca' : 'Enviar logomarca'}</>}
              </button>
              {logoPath && (
                <button type="button" className="btn btn-outline" disabled={ocupado} onClick={remover}>
                  {removendo
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Removendo…</>
                    : <><Trash2 className="w-4 h-4" /> Remover</>}
                </button>
              )}
            </div>
            <p className="j-hint">PNG, JPG, WebP ou SVG, até 2 MB. Prefira fundo transparente.</p>
          </div>
        ) : (
          <p className="j-caption flex-1 min-w-[12rem]">
            Só o titular da conta pode enviar ou trocar a logomarca.
          </p>
        )}
      </div>

      {erro && (
        <div className="j-alert j-alert-danger mt-4">
          <AlertCircle className="w-4 h-4 shrink-0" /> {erro}
        </div>
      )}
      {ok && (
        <div className="j-alert j-alert-success mt-4">
          <CheckCircle className="w-4 h-4 shrink-0" /> {ok}
        </div>
      )}
    </div>
  )
}
