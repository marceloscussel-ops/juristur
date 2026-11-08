'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Monitor, Moon, Sun, Check } from 'lucide-react'
import {
  DARK_QUERY,
  THEME_KEY,
  applyTheme,
  readThemePref,
  storeThemePref,
  type ResolvedTheme,
  type ThemePref,
} from '@/lib/theme'

const OPTIONS: { value: ThemePref; label: string; Icon: typeof Monitor }[] = [
  { value: 'system', label: 'Sistema', Icon: Monitor },
  { value: 'light',  label: 'Claro',   Icon: Sun     },
  { value: 'dark',   label: 'Escuro',  Icon: Moon    },
]

/**
 * Lê e grava a preferência de tema. O estado inicial é 'system' nos dois
 * lados (servidor e cliente) para não quebrar a hidratação: a preferência
 * real entra no primeiro efeito. O tema em si já foi pintado antes disso
 * pelo script do <head>.
 */
function useThemePref() {
  const [pref, setPref]         = useState<ThemePref>('system')
  const [resolved, setResolved] = useState<ResolvedTheme>('light')

  useEffect(() => {
    const initial = readThemePref()
    setPref(initial)
    setResolved(applyTheme(initial))

    const mq = window.matchMedia(DARK_QUERY)
    const onSystemChange = () => {
      // Só repinta enquanto a preferência for "seguir o sistema".
      if (readThemePref() === 'system') setResolved(applyTheme('system'))
    }

    // Outra aba trocou o tema.
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== THEME_KEY) return
      const next = readThemePref()
      setPref(next)
      setResolved(applyTheme(next))
    }

    mq.addEventListener('change', onSystemChange)
    window.addEventListener('storage', onStorage)
    return () => {
      mq.removeEventListener('change', onSystemChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const choose = useCallback((next: ThemePref) => {
    storeThemePref(next)
    setPref(next)
    setResolved(applyTheme(next))
  }, [])

  return { pref, resolved, choose }
}

const LABEL: Record<ThemePref, string> = {
  system: 'Tema: seguindo o sistema',
  light:  'Tema: claro',
  dark:   'Tema: escuro',
}

/* ═══════════════════════════════
   Variante da navbar — ícone + menu
═══════════════════════════════ */
function ThemeMenu({ onDark = true }: { onDark?: boolean }) {
  const { pref, choose } = useThemePref()
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocDown(event: MouseEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const Current = (OPTIONS.find(o => o.value === pref) ?? OPTIONS[0]).Icon

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={LABEL[pref]}
        title={LABEL[pref]}
        className={
          onDark
            ? 'flex items-center gap-1.5 px-3 py-1.5 text-white/40 hover:text-white text-[13px] transition-colors rounded'
            : 'flex items-center gap-1.5 px-2 py-1.5 text-ink-40 hover:text-ink text-[13px] transition-colors rounded'
        }
      >
        <Current className="w-4 h-4" />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Tema"
          className="absolute right-0 top-full mt-1.5 z-50 min-w-[160px] rounded-md border border-line
                     bg-card p-1 shadow-pop animate-fade-in"
        >
          {OPTIONS.map(({ value, label, Icon }) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={pref === value}
              onClick={() => { choose(value); setOpen(false) }}
              className={`flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-[13px]
                          transition-colors hover:bg-indigo-pale hover:text-indigo
                          ${pref === value ? 'text-indigo font-medium' : 'text-ink-80'}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {pref === value && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════
   Variante em linha — 3 opções visíveis
   (menu mobile, página de perfil)
═══════════════════════════════ */
function ThemeSegmented({ onDark = false }: { onDark?: boolean }) {
  const { pref, choose } = useThemePref()

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className={`inline-flex items-center gap-1 rounded-pill p-1 ${onDark ? 'bg-white/10' : 'bg-ink-15'}`}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = pref === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => choose(value)}
            title={label}
            className={`flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[12px] font-medium transition-colors
              ${active
                ? (onDark ? 'bg-white text-ink-900' : 'bg-card text-ink shadow-sm')
                : (onDark ? 'text-white/60 hover:text-white' : 'text-ink-40 hover:text-ink')}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        )
      })}
    </div>
  )
}

export default function ThemeToggle({
  variant = 'menu',
  onDark,
}: {
  variant?: 'menu' | 'segmented'
  /** true quando o controle fica sobre um fundo escuro (navbar). */
  onDark?: boolean
}) {
  return variant === 'segmented'
    ? <ThemeSegmented onDark={onDark ?? false} />
    : <ThemeMenu onDark={onDark ?? true} />
}
