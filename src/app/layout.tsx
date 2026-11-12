import type { Metadata } from 'next'
import { Sora, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import '@/styles/juristur.css'
import { THEME_COLOR, THEME_INIT_SCRIPT } from '@/lib/theme'

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-body',
  display: 'swap',
})

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://www.turisguard.com'),
  title: 'TurisGuard — Assessoria Jurídica para Agências de Turismo',
  description: 'Plataforma de assessoria jurídica especializada para agências de turismo brasileiras',
  applicationName: 'TurisGuard',
  manifest: '/manifest.webmanifest',
  // O iPhone não lê o manifest: quem abre o app em tela cheia na tela de
  // início, com o nome e o ícone certos, são estas metas.
  appleWebApp: {
    capable: true,
    title: 'TurisGuard',
    statusBarStyle: 'default',
  },
  icons: {
    // /icon.svg vem de src/app/icon.svg (convenção do Next); o PNG é para o
    // iPhone, que ignora ícone em SVG.
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  // Sem isto o Safari transforma CNPJ, protocolo e número de caso em link de
  // telefone e pinta tudo de azul.
  formatDetection: { telephone: false, address: false, date: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID

  return (
    // suppressHydrationWarning: o script abaixo escreve data-theme no <html>
    // antes do React hidratar, então o atributo do servidor e o do cliente
    // divergem de propósito.
    <html
      lang="pt-BR"
      data-theme="light"
      className={`${sora.variable} ${inter.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="theme-color" content={THEME_COLOR.light} />
        {/* Define o tema (escolha do usuário ou preferência do sistema) antes
            da primeira pintura — sem isto a página pisca branca no escuro. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {/* Google Analytics (gtag.js) — snippet oficial, renderizado no HTML */}
        {gaId && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
            <script
              id="ga-gtag-init"
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}');`,
              }}
            />
          </>
        )}
        {/* Microsoft Clarity — heatmaps e gravações de sessão */}
        {clarityId && (
          <script
            id="ms-clarity-init"
            dangerouslySetInnerHTML={{
              __html: `(function(c,l,a,r,i,t,y){
c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${clarityId}");`,
            }}
          />
        )}
        {children}
      </body>
    </html>
  )
}
