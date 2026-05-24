import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0F1E38',
          light:   '#1A2F52',
          mid:     '#243D6B',
        },
        gold: {
          DEFAULT: '#B8922A',
          light:   '#D4AF5A',
          muted:   '#F5EDD8',
        },
        teal: {
          DEFAULT: '#1B7B8A',
          light:   '#2DABB9',
          muted:   '#E0F4F6',
        },
        slate: {
          DEFAULT: '#4A5568',
          light:   '#718096',
        },
        surface: '#F7F8FA',
        danger:  '#C0392B',
        success: '#1A7A4A',
        warning: '#B8922A',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body:    ['var(--font-body)', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
        sans:    ['var(--font-body)', 'sans-serif'],
      },
      fontSize: {
        'overline': ['11px', { lineHeight: '1.4', letterSpacing: '0.12em', fontWeight: '600' }],
        'caption':  ['12px', { lineHeight: '1.5' }],
        'body':     ['14px', { lineHeight: '1.7' }],
        'body-lg':  ['15px', { lineHeight: '1.7' }],
        'h3':       ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        'h2':       ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        'h1':       ['28px', { lineHeight: '1.2', fontWeight: '500' }],
        'display':  ['36px', { lineHeight: '1.15', fontWeight: '500' }],
      },
      borderRadius: {
        'sm':   '4px',
        'md':   '8px',
        'lg':   '12px',
        'xl':   '16px',
        'pill': '9999px',
      },
      boxShadow: {
        'focus-teal': '0 0 0 3px rgba(27, 123, 138, 0.18)',
        'focus-navy': '0 0 0 3px rgba(15, 30, 56, 0.15)',
        'card':       '0 1px 3px rgba(15, 30, 56, 0.06)',
        'dropdown':   '0 4px 16px rgba(15, 30, 56, 0.12)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in':  'fade-in 0.2s ease-out',
        'slide-in': 'slide-in 0.2s ease-out',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
export default config
