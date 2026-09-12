'use client'

import { useRouter } from 'next/navigation'
import type { MouseEvent, ReactNode } from 'react'

interface Props {
  href:      string
  children:  ReactNode
  className?: string
}

/**
 * Linha de tabela em que qualquer clique navega para `href`.
 * O link "de verdade" continua dentro da linha (título / chevron), então
 * teclado, abrir em nova aba e clique do meio seguem funcionando.
 */
export default function ClickableRow({ href, children, className }: Props) {
  const router = useRouter()

  function handleClick(e: MouseEvent<HTMLTableRowElement>) {
    // Deixa links, botões e afins tratarem o próprio clique.
    if ((e.target as HTMLElement).closest('a, button, input, select, textarea, label')) return
    // Não navega quando o usuário só estava selecionando texto.
    if (window.getSelection()?.toString()) return

    if (e.metaKey || e.ctrlKey || e.shiftKey) {
      window.open(href, '_blank', 'noopener')
      return
    }
    router.push(href)
  }

  return (
    <tr
      onClick={handleClick}
      onMouseEnter={() => router.prefetch(href)}
      className={`cursor-pointer${className ? ` ${className}` : ''}`}
    >
      {children}
    </tr>
  )
}
