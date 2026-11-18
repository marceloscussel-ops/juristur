import Image from 'next/image'

/**
 * "em parceria com [logo CFleck]" — a defesa com advogado é prestada pela
 * CFleck, parceira da plataforma. O logo tem fundo branco e texto azul-marinho,
 * então vai sempre numa pílula branca: fica legível no modo escuro e sobre o
 * botão vermelho.
 */
export default function ParceriaCfleck({ size = 'sm', className = '' }: { size?: 'sm' | 'md'; className?: string }) {
  const h = size === 'md' ? 18 : 14
  const w = Math.round(h * (569 / 199))
  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: size === 'md' ? 12.5 : 11.5, fontWeight: 400, lineHeight: 1 }}
    >
      em parceria com
      <span style={{ display: 'inline-flex', background: '#FFFFFF', borderRadius: 6, padding: '3px 6px', boxShadow: '0 0 0 1px rgba(11,18,28,.08)' }}>
        <Image src="/cfleck-logo.webp" alt="CFleck" width={w} height={h} style={{ display: 'block', width: w, height: h }} />
      </span>
    </span>
  )
}
