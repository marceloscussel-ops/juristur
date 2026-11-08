import type { Config } from 'tailwindcss'

/* As cores não são valores fixos: cada uma aponta para um token do tema
   declarado em src/styles/juristur.css. Os tokens guardam canais RGB
   soltos ("91 87 232"), então `rgb(var(--tg-x) / <alpha-value>)` mantém
   os modificadores de opacidade do Tailwind funcionando (`bg-indigo/30`).
   Trocar de tema claro para escuro é reescrever os tokens — nenhuma
   classe muda. */
const rgb = (token: string) => `rgb(var(${token}) / <alpha-value>)`

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ─── Ink — texto (acompanha o tema: escuro no claro, claro no escuro) ───
        ink: {
          DEFAULT: rgb('--tg-fg'),
          900:     rgb('--tg-fg-strong'),
          80:      'var(--j-ink-80)',
          40:      'var(--j-ink-40)',
          15:      'var(--j-ink-15)',
        },

        // ─── Superfícies ───
        surface: rgb('--tg-surface'),   // fundo da página e poços internos
        card:    rgb('--tg-card'),      // cartões, menus, modais
        input:   rgb('--tg-input'),     // campos de formulário
        nav:     rgb('--tg-nav'),       // barra de navegação (escura nos dois temas)

        // ─── Inversão — botão primário, chip ativo, badge ink ───
        inverse: {
          DEFAULT: rgb('--tg-inverse'),
          hover:   rgb('--tg-inverse-hover'),
        },
        'on-inverse': rgb('--tg-on-inverse'),

        // ─── Linhas e véus ───
        line: {
          DEFAULT: 'var(--j-border)',
          strong:  'var(--j-border-strong)',
          hover:   'var(--j-border-hover)',
        },
        overlay: 'var(--j-overlay)',

        // ─── Indigo — Interação/CTAs ───
        // `indigo` é a versão legível (texto, borda, ícone) e clareia no
        // tema escuro; `indigo-solid` é o preenchimento de CTA, igual nos
        // dois temas porque leva texto branco por cima.
        indigo: {
          DEFAULT: rgb('--tg-indigo'),
          solid:   rgb('--tg-indigo-solid'),
          light:   rgb('--tg-indigo-light'),
          pale:    rgb('--tg-indigo-pale'),
          50:      rgb('--tg-indigo-pale'),
          100:     rgb('--tg-indigo-100'),
          300:     rgb('--tg-indigo-300'),
          700:     rgb('--tg-indigo-700'),
        },

        // ─── Amber — Alerta/Atenção ───
        amber: {
          DEFAULT: rgb('--tg-amber'),
          solid:   rgb('--tg-amber-solid'),
          light:   rgb('--tg-amber-light'),
          pale:    rgb('--tg-amber-pale'),
          50:      rgb('--tg-amber-pale'),
          200:     rgb('--tg-amber-200'),
          700:     rgb('--tg-amber-700'),
          800:     rgb('--tg-amber-800'),
        },

        // ─── Teal — Sucesso/Resolvido ───
        teal: {
          DEFAULT: rgb('--tg-teal'),
          pale:    rgb('--tg-teal-pale'),
          50:      rgb('--tg-teal-pale'),
          100:     rgb('--tg-teal-100'),
          700:     rgb('--tg-teal-700'),
        },

        // ─── Coral — Risco/Escalada ───
        coral: {
          DEFAULT: rgb('--tg-coral'),
          solid:   rgb('--tg-coral-solid'),
          600:     rgb('--tg-coral-600'),
          700:     rgb('--tg-coral-700'),
          pale:    rgb('--tg-coral-pale'),
          50:      rgb('--tg-coral-pale'),
          200:     rgb('--tg-coral-200'),
        },

        // ─── Semânticas ───
        success: rgb('--tg-success'),
        danger:  rgb('--tg-danger'),
        warning: rgb('--tg-amber'),
      },

      // A classe `border` sem cor passa a usar a linha do tema.
      borderColor: {
        DEFAULT: 'var(--j-border)',
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
        'focus-indigo': '0 0 0 3px rgba(91,87,232,0.25)',
        'focus-teal':   '0 0 0 3px rgba(14,158,122,0.25)',
        'card':         'var(--j-shadow-card)',
        'pop':          'var(--j-shadow-pop)',
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
