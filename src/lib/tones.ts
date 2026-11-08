/**
 * Tonalidades de status (severidade, complexidade, situação do caso).
 *
 * Cada tonalidade é um conjunto de quatro tokens declarados nos dois temas
 * em src/styles/juristur.css. Componentes com style inline usam estas
 * funções em vez de hex fixo — assim um chip de risco não fica com pastel
 * claro no tema escuro.
 */

export type Tone = 'teal' | 'amber' | 'coral' | 'crit' | 'indigo' | 'neutral'

export interface ToneColors {
  /** fundo do chip */
  bg: string
  /** borda do chip, e também o traço "apagado" de medidores */
  border: string
  /** texto sobre o fundo do chip */
  text: string
  /** ponto/traço de destaque */
  dot: string
}

export function toneColors(tone: Tone): ToneColors {
  if (tone === 'neutral') {
    return {
      bg:     'var(--j-surface)',
      border: 'var(--j-border-strong)',
      text:   'var(--j-ink-80)',
      dot:    'var(--j-ink-40)',
    }
  }
  return {
    bg:     `var(--j-tone-${tone}-bg)`,
    border: `var(--j-tone-${tone}-border)`,
    text:   `var(--j-tone-${tone}-text)`,
    dot:    `var(--j-tone-${tone}-dot)`,
  }
}

/** Classes Tailwind equivalentes, para quem usa className em vez de style. */
export const TONE_CLASSES: Record<Exclude<Tone, 'crit' | 'neutral'>, string> = {
  teal:   'bg-teal-pale text-teal-700 border-teal-100',
  amber:  'bg-amber-pale text-amber-800 border-amber-200',
  coral:  'bg-coral-pale text-coral-700 border-coral-200',
  indigo: 'bg-indigo-pale text-indigo-700 border-indigo-100',
}
