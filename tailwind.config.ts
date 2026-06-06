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
        // ─── Primárias ───
        ink: {
          DEFAULT: '#0D0D1A',
          80: 'rgba(13,13,26,0.80)',
          40: 'rgba(13,13,26,0.40)',
          15: 'rgba(13,13,26,0.07)',
        },
        indigo: {
          DEFAULT: '#2B1FCC',
          light:   '#4B40E0',
          pale:    '#EEECFF',
        },
        amber: {
          DEFAULT: '#F59E0B',
          light:   '#FCD34D',
          pale:    '#FFFBEB',
        },
        // ─── Suporte ───
        teal: {
          DEFAULT: '#0EA5A0',
          pale:    '#F0FAFA',
        },
        coral: {
          DEFAULT: '#F26D5B',
          pale:    '#FEF0EE',
        },
        // ─── Semânticas ───
        success: '#16A34A',
        danger:  '#DC2626',
        warning: '#F59E0B',
        // ─── Superfícies ───
        surface: '#F8F8FC',
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
        'focus-indigo': '0 0 0 3px rgba(43,31,204,0.15)',
        'focus-teal':   '0 0 0 3px rgba(14,165,160,0.15)',
        'card':         '0 1px 3px rgba(13,13,26,0.05)',
        'dropdown':     '0 8px 24px rgba(13,13,26,0.10)',
      },

      backgroundImage: {
        'brand-gradient': 'linear-gradient(90deg, #2B1FCC, #F26D5B)',
        'hero-gradient':  'linear-gradient(135deg, #0D0D1A 0%, #1A1040 100%)',
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
