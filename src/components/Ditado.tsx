'use client'

/**
 * Ditado.tsx — Ditado por voz nos campos descritivos.
 *
 * Grava com MediaRecorder, manda o áudio para `/api/transcribe` (Whisper) e
 * insere o texto no cursor do campo. O texto entra editável e nada é enviado
 * automaticamente: quem ditou revisa antes de salvar.
 *
 * Três peças, para os dois formatos de campo que a solução tem:
 *   · `useDitado`       — a mecânica (microfone, cronômetro, transcrição);
 *   · `BotaoDitado`     — o botão, para quem já tem seu próprio <textarea>;
 *   · `DitadoTextarea`  — textarea + botão flutuante, troca direta do <textarea>.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Square, Loader2, X } from 'lucide-react'

/**
 * Teto de 3 min por gravação. Não é limite de quanto se pode ditar — ao parar,
 * o texto é inserido e o botão volta a ficar disponível, então ditados longos
 * saem em trechos. O teto existe porque o corpo de uma function na Vercel para
 * em 4,5 MB e porque trecho curto erra menos e é mais fácil de refazer.
 */
const MAX_SEGUNDOS = 180
const MAX_BYTES    = 4 * 1024 * 1024
const MIN_BYTES    = 1200   // menos que isto é clique sem fala

type EstadoDitado = 'parado' | 'gravando' | 'transcrevendo'

export interface Ditado {
  estado:    EstadoDitado
  segundos:  number
  erro:      string | null
  suportado: boolean
  iniciar:   () => void
  parar:     () => void
  cancelar:  () => void
  limpaErro: () => void
}

/** O Chrome e o Firefox gravam webm/opus; o Safari (iPhone) só mp4/aac. */
function escolheMime(): string {
  const candidatos = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  for (const c of candidatos) {
    if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(c)) return c
  }
  return ''
}

function extensaoDe(mime: string): string {
  if (mime.includes('mp4')) return 'mp4'
  if (mime.includes('ogg')) return 'ogg'
  return 'webm'
}

export function mmss(total: number): string {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/**
 * Insere o texto ditado na posição do cursor, cuidando dos espaços em volta
 * para não colar palavras. Devolve o valor novo e onde o cursor deve ficar.
 */
export function insereNoCursor(valor: string, texto: string, inicio: number, fim: number) {
  const antes  = valor.slice(0, inicio)
  const depois = valor.slice(fim)
  const sepIni = antes  && !/\s$/.test(antes)  ? ' ' : ''
  const sepFim = depois && !/^\s/.test(depois) ? ' ' : ''
  return {
    valor:  antes + sepIni + texto + sepFim + depois,
    cursor: (antes + sepIni + texto).length,
  }
}

/** A mecânica do ditado. `onTexto` recebe a transcrição pronta. */
export function useDitado(onTexto: (texto: string) => void): Ditado {
  const [estado,    setEstado]    = useState<EstadoDitado>('parado')
  const [segundos,  setSegundos]  = useState(0)
  const [erro,      setErro]      = useState<string | null>(null)
  const [suportado, setSuportado] = useState(false)

  const recorderRef  = useRef<MediaRecorder | null>(null)
  const chunksRef    = useRef<Blob[]>([])
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const canceladoRef = useRef(false)
  const onTextoRef   = useRef(onTexto)
  onTextoRef.current = onTexto

  // Precisa do navegador de verdade: no servidor nada disto existe.
  useEffect(() => {
    setSuportado(
      typeof window !== 'undefined' &&
      typeof window.MediaRecorder !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia,
    )
  }, [])

  const encerraStream = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    recorderRef.current?.stream.getTracks().forEach(t => t.stop())
    recorderRef.current = null
    setSegundos(0)
  }, [])

  // Sair da tela no meio da gravação não pode deixar o microfone aberto.
  useEffect(() => encerraStream, [encerraStream])

  const envia = useCallback(async (blob: Blob) => {
    if (blob.size < MIN_BYTES) {
      setEstado('parado')
      setErro('Gravação muito curta. Toque no microfone e fale alguns segundos.')
      return
    }
    if (blob.size > MAX_BYTES) {
      setEstado('parado')
      setErro('Gravação muito longa. Grave em trechos menores.')
      return
    }

    setEstado('transcrevendo')
    try {
      const fd = new FormData()
      fd.append('audio', blob, `ditado.${extensaoDe(blob.type)}`)

      const res  = await fetch('/api/transcribe', { method: 'POST', body: fd })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'Não foi possível transcrever o áudio.')

      const texto = String(data?.text ?? '').trim()
      if (!texto) throw new Error('Não consegui entender o áudio. Tente de novo.')

      onTextoRef.current(texto)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível transcrever o áudio.')
    } finally {
      setEstado('parado')
    }
  }, [])

  const iniciar = useCallback(async () => {
    setErro(null)

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
    } catch (e) {
      const nome = (e as DOMException)?.name
      setErro(
        nome === 'NotAllowedError' || nome === 'SecurityError'
          ? 'Permita o acesso ao microfone no navegador para ditar.'
          : nome === 'NotFoundError'
            ? 'Nenhum microfone encontrado neste dispositivo.'
            : 'Não foi possível abrir o microfone.',
      )
      return
    }

    const mime = escolheMime()
    let rec: MediaRecorder
    try {
      rec = new MediaRecorder(stream, {
        ...(mime ? { mimeType: mime } : {}),
        audioBitsPerSecond: 32000,
      })
    } catch {
      stream.getTracks().forEach(t => t.stop())
      setErro('Este navegador não consegue gravar áudio.')
      return
    }

    chunksRef.current    = []
    canceladoRef.current = false

    rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: rec.mimeType || mime || 'audio/webm' })
      encerraStream()
      if (canceladoRef.current) { setEstado('parado'); return }
      void envia(blob)
    }

    recorderRef.current = rec
    rec.start()
    setEstado('gravando')
    setSegundos(0)
    timerRef.current = setInterval(() => setSegundos(s => s + 1), 1000)
  }, [encerraStream, envia])

  const parar = useCallback(() => {
    const rec = recorderRef.current
    if (!rec || rec.state === 'inactive') return
    rec.stop()   // o resto acontece no onstop
  }, [])

  const cancelar = useCallback(() => {
    canceladoRef.current = true
    const rec = recorderRef.current
    if (!rec || rec.state === 'inactive') { encerraStream(); setEstado('parado'); return }
    rec.stop()
  }, [encerraStream])

  // Chegou no teto: para sozinho e transcreve o que já tem.
  useEffect(() => {
    if (estado === 'gravando' && segundos >= MAX_SEGUNDOS) parar()
  }, [estado, segundos, parar])

  const limpaErro = useCallback(() => setErro(null), [])

  return { estado, segundos, erro, suportado, iniciar: () => void iniciar(), parar, cancelar, limpaErro }
}


/* ═══════════════════════════════
   BOTÃO
═══════════════════════════════ */

interface BotaoDitadoProps {
  ditado:    Ditado
  disabled?: boolean
  /** `icone` só o microfone (campos de uma linha); `rotulo` com a palavra "Ditar". */
  variante?: 'icone' | 'rotulo'
  /** `sm` para o botão flutuante dentro do campo; `md` para ficar ao lado de um botão de 42px. */
  tamanho?:  'sm' | 'md'
  className?: string
}

const BASE_BOTAO =
  'inline-flex items-center justify-center gap-1.5 rounded-md border font-medium ' +
  'transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

/**
 * O botão do ditado. Quem já tem o próprio <textarea> usa este direto; quem
 * quer a troca pronta usa `DitadoTextarea`, que o posiciona dentro do campo.
 */
export function BotaoDitado({
  ditado,
  disabled,
  variante = 'rotulo',
  tamanho  = 'sm',
  className = '',
}: BotaoDitadoProps) {
  const { estado, segundos, suportado, iniciar, parar, cancelar } = ditado

  // Sem suporte do navegador, nem anuncia o recurso.
  if (!suportado) return null

  const md    = tamanho === 'md'
  const base  = `${BASE_BOTAO} ${md ? 'h-[42px] text-[12px]' : 'h-7 text-[11px]'}`
  const quad  = md ? 'w-[42px]' : 'w-7'
  const icone = md ? 'w-4 h-4' : 'w-3.5 h-3.5'

  if (estado === 'transcrevendo') {
    return (
      <span
        className={`${base} ${variante === 'rotulo' ? 'px-2' : quad} border-transparent text-ink-40 ${className}`}
        aria-live="polite"
      >
        <Loader2 className={`${icone} animate-spin`} />
        {variante === 'rotulo' && 'Transcrevendo…'}
      </span>
    )
  }

  if (estado === 'gravando') {
    const noFim = segundos >= MAX_SEGUNDOS - 15
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <button
          type="button"
          onClick={parar}
          className={`${base} px-2 border-coral bg-coral-pale text-coral`}
          title="Parar e transcrever"
          aria-label="Parar a gravação e transcrever"
        >
          <Square className={md ? 'w-3 h-3 fill-current' : 'w-2.5 h-2.5 fill-current'} />
          <span className={`tabular-nums ${noFim ? 'animate-pulse' : ''}`}>{mmss(segundos)}</span>
        </button>
        <button
          type="button"
          onClick={cancelar}
          className={`${base} ${quad} px-0 border-transparent text-ink-40 hover:text-coral`}
          title="Descartar a gravação"
          aria-label="Descartar a gravação"
        >
          <X className={icone} />
        </button>
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={iniciar}
      disabled={disabled}
      className={`${base} ${variante === 'rotulo' ? 'px-2' : quad} border-line-strong bg-card text-ink-40 hover:text-indigo hover:border-indigo ${className}`}
      title="Ditar por voz"
      aria-label="Ditar por voz"
    >
      <Mic className={icone} />
      {variante === 'rotulo' && 'Ditar'}
    </button>
  )
}


/* ═══════════════════════════════
   TEXTAREA COM DITADO
═══════════════════════════════ */

interface DitadoTextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  value:         string
  onValueChange: (valor: string) => void
  /** Ref do próprio <textarea>, para quem precisa dele (foco, auto-altura). */
  innerRef?:     React.RefObject<HTMLTextAreaElement>
  /** Classe do wrapper; o `className` continua indo para o <textarea>. */
  wrapperClassName?: string
}

/**
 * Troca direta do `<textarea>`: mesmo campo, com o botão de ditado flutuando
 * no canto de baixo. Fica à esquerda porque a direita é da alça de resize.
 */
export function DitadoTextarea({
  value,
  onValueChange,
  innerRef,
  wrapperClassName = '',
  className = '',
  disabled,
  ...props
}: DitadoTextareaProps) {
  const proprioRef = useRef<HTMLTextAreaElement>(null)
  const ref = innerRef ?? proprioRef

  const aplica = useCallback((texto: string) => {
    const el     = ref.current
    const inicio = el?.selectionStart ?? value.length
    const fim    = el?.selectionEnd   ?? value.length
    const r = insereNoCursor(value, texto, inicio, fim)
    onValueChange(r.valor)

    // O valor só chega ao DOM no próximo paint; o cursor espera por ele.
    requestAnimationFrame(() => {
      const atual = ref.current
      if (!atual) return
      atual.focus()
      atual.setSelectionRange(r.cursor, r.cursor)
    })
  }, [ref, value, onValueChange])

  const ditado = useDitado(aplica)

  return (
    <div className={`relative w-full ${wrapperClassName}`}>
      <textarea
        ref={ref}
        value={value}
        onChange={e => onValueChange(e.target.value)}
        disabled={disabled || ditado.estado !== 'parado'}
        className={`${className} ${ditado.suportado ? 'pb-10' : ''}`}
        {...props}
      />
      {ditado.suportado && (
        <div className="absolute bottom-2 left-2">
          <BotaoDitado ditado={ditado} disabled={disabled} />
        </div>
      )}
      {ditado.erro && <p className="j-hint j-hint-error">{ditado.erro}</p>}
    </div>
  )
}
