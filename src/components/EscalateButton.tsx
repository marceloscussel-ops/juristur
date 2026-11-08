'use client'

import { Shield } from 'lucide-react'

export type EscalateVariant = 'primary' | 'compact' | 'outline'

interface Props {
  href?: string
  /**
   * Legenda do botão grande. O prazo de 2h úteis é compromisso do plano
   * Enterprise (ver plans.ts), logo quem chama decide se pode prometê-lo.
   */
  hint?: string
  onClick?: () => void
  variant?: EscalateVariant
  className?: string
}

const BASE: React.CSSProperties = {
  fontFamily: 'Inter,sans-serif', fontWeight: 600, fontSize: 15,
  border: 'none', cursor: 'pointer', textDecoration: 'none',
  transition: 'background 150ms ease, color 150ms ease',
}

const VARIANTS: Record<EscalateVariant, React.CSSProperties> = {
  primary: { ...BASE, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', gap: 4, padding: '15px 22px', borderRadius: 13, background: 'var(--j-coral-solid)', color: '#FFFFFF', boxShadow: '0 8px 20px -8px rgba(211,52,32,.55)' },
  compact: { ...BASE, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 20px', borderRadius: 13, background: 'var(--j-coral-solid)', color: '#FFFFFF', boxShadow: '0 8px 20px -8px rgba(211,52,32,.55)' },
  outline: { ...BASE, display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 20px', borderRadius: 13, background: 'var(--j-card)', color: 'var(--j-tone-coral-text)', border: '1.5px solid var(--j-tone-coral-border)' },
}

const HOVER_BG: Record<EscalateVariant, string> = {
  primary: 'var(--j-tone-crit-dot)',
  compact: 'var(--j-tone-crit-dot)',
  outline: 'var(--j-tone-coral-bg)',
}

export default function EscalateButton({ href, onClick, variant = 'primary', className = '', hint = 'Um advogado assume o caso e responde por aqui' }: Props) {
  const style = VARIANTS[variant]

  const label = 'Solicitar defesa'

  const inner = variant === 'primary' ? (
    <>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Shield size={18} strokeWidth={2} />
        {label}
      </span>
      <span style={{ fontSize: 11.5, opacity: 0.85, fontWeight: 400 }}>{hint}</span>
    </>
  ) : (
    <>
      <Shield size={18} strokeWidth={2} />
      {label}
    </>
  )

  const handlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => { (e.currentTarget as HTMLElement).style.background = HOVER_BG[variant] },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => { (e.currentTarget as HTMLElement).style.background = (style.background as string) },
  }

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        style={style}
        className={className}
        {...handlers}
      >
        {inner}
      </a>
    )
  }
  return <button onClick={onClick} style={style} className={className} {...handlers}>{inner}</button>
}
