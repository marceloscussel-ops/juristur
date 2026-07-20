export type LogoVariant = 'color' | 'mono-light' | 'mono-dark' | 'outline'

const SHIELD = 'M16 15 L80 15 C84 15 86 18 86 22 L86 50 C86 72 70 86 48 92 C26 86 10 72 10 50 L10 22 C10 18 12 15 16 15 Z'

interface Props {
  size?: number
  variant?: LogoVariant
  withWordmark?: boolean
  className?: string
}

export default function TGLogo({ size = 40, variant = 'color', withWordmark = false, className = '' }: Props) {
  const tg = (fill: string, textFill: string, extra?: React.ReactNode) => (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d={SHIELD} fill={fill} />
      {extra}
      <text x="48" y="52" textAnchor="middle" dominantBaseline="central"
        fontFamily="Sora,sans-serif" fontWeight="800" fontSize="33" letterSpacing="-1.5" fill={textFill}>
        TG
      </text>
    </svg>
  )

  const mark = (() => {
    switch (variant) {
      case 'outline':
        return (
          <svg width={size} height={size} viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d={SHIELD} fill="none" stroke="#16202F" strokeWidth="4.5" />
            <text x="48" y="52" textAnchor="middle" dominantBaseline="central"
              fontFamily="Sora,sans-serif" fontWeight="800" fontSize="33" letterSpacing="-1.5" fill="#16202F">TG</text>
          </svg>
        )
      case 'mono-light':
        return tg('#FFFFFF', '#0B121C')
      case 'mono-dark':
        return tg('#16202F', '#FFFFFF')
      default:
        return tg('#16202F', '#FFFFFF', (
          <>
            <defs>
              <clipPath id="tg-shield-clip">
                <path d={SHIELD} />
              </clipPath>
            </defs>
            <polygon points="58,0 96,0 96,96 38,96" fill="#5B57E8" clipPath="url(#tg-shield-clip)" />
          </>
        ))
    }
  })()

  if (!withWordmark) return <span className={className}>{mark}</span>

  const wordmarkColor = variant === 'mono-light' ? '#FFFFFF' : '#16202F'

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {mark}
      {variant === 'color' ? (
        <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 17, letterSpacing: '-0.8px' }}>
          <span style={{ color: '#16202F' }}>Turis</span>
          <span style={{ color: '#5B57E8' }}>Guard</span>
        </span>
      ) : (
        <span style={{ fontFamily: 'Sora,sans-serif', fontWeight: 700, fontSize: 17, letterSpacing: '-0.8px', color: wordmarkColor }}>
          TurisGuard
        </span>
      )}
    </span>
  )
}
