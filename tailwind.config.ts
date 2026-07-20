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
        // ─── Ink — Primária (BASE: 800) ───
        ink: {
          DEFAULT: '#16202F',
          900:     '#0B121C',
          80:      'rgba(22,32,47,0.80)',
          40:      'rgba(22,32,47,0.40)',
          15:      'rgba(22,32,47,0.07)',
        },
        // ─── Indigo — Interação/CTAs (BASE: 500) ───
        indigo: {
          DEFAULT: '#5B57E8',
          light:   '#4842D4',
          pale:    '#EEF0FF',
          50:      '#EEF0FF',
          100:     '#DEE2FF',
          300:     '#9DA1FB',
          700:     '#3A35AC',
        },
        // ─── Amber — Alerta/Atenção (BASE: 500) ───
        amber: {
          DEFAULT: '#E8900C',
          light:   '#FBC04D',
          pale:    '#FFF8EB',
          50:      '#FFF8EB',
          200:     '#FDD88A',
          700:     '#9A530A',
          800:     '#7C420E',
        },
        // ─── Teal — Sucesso/Resolvido (BASE: 500) ───
        teal: {
          DEFAULT: '#0E9E7A',
          pale:    '#EAFBF5',
          50:      '#EAFBF5',
          100:     '#C8F4E5',
          700:     '#086552',
        },
        // ─── Coral — Risco/Escalada (BASE: 500) ───
        coral: {
          DEFAULT: '#EE4A34',
          600:     '#D33420',
          700:     '#AF2719',
          pale:    '#FFF1EF',
          50:      '#FFF1EF',
          200:     '#FFC0B7',
        },
        // ─── Semânticas ───
        success: '#16A34A',
        danger:  '#DC2626',
        warning: '#E8900C',
        // ─── Superfícies ───
        surface: '#F7F9FB',
      },

      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
        sans:    ['Inter', 'sans-serif'],
      },

      fontSize: {
        'overline': ['11px', { lineHeight: '1.4', letterSpacing: '0.12em', fontWeight: '600' }],
        'caption':  ['12px', { lineHeight: '1.5' }],
        'body':     ['14px', { lineHeight: '1.7' }],
        'body-lg':  ['15px', { lineHeight: '1.7' }],
        'h4':       ['15px', { lineHeight: '1.5', fontWeight: '600', letterSpacing: '-0.01em' }],
        'h3':       ['16px', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '-0.01em' }],
        'h2':       ['20px', { lineHeight: '1.3', fontWeight: '600', letterSpacing: '-0.01em' }],
        'h1':       ['26px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.02em' }],
        'display':  ['38px', { lineHeight: '1.1', fontWeight: '700', letterSpacing: '-0.02em' }],
      },

      spacing: {
        'xs':  '4px',
        'sm':  '8px',
        'md':  '12px',
        'lg':  '16px',
        'xl':  '24px',
        '2xl': '32px',
        '3xl': '48px',
        '4xl': '64px',
      },

      borderRadius: {
        'sm':   '6px',
        'md':   '10px',
        'lg':   '16px',
        'xl':   '20px',
        'pill': '9999px',
      },

      borderWidth: {
        'hairline': '0.5px',
      },

      boxShadow: {
        'focus-indigo': '0 0 0 3px rgba(91,87,232,0.15)',
        'focus-teal':   '0 0 0 3px rgba(14,158,122,0.15)',
        'card':         '0 1px 2px rgba(11,18,28,.04), 0 12px 28px -18px rgba(11,18,28,.18)',
        'btn-indigo':   '0 8px 20px -8px rgba(91,87,232,.55)',
        'btn-coral':    '0 8px 20px -8px rgba(211,52,32,.55)',
      },

      backgroundImage: {
        'brand-gradient': 'linear-gradient(90deg, #5B57E8, #EE4A34)',
        'hero-gradient':  'linear-gradient(135deg, #0B121C 0%, #16202F 100%)',
      },

      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-up':  'fade-up 0.2s ease-out',
        'fade-in':  'fade-in 0.15s ease-out',
        'slide-in': 'slide-in 0.2s ease-out',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
export default config
