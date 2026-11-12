import type { MetadataRoute } from 'next'
import { THEME_COLOR } from '@/lib/theme'

/**
 * Manifesto do PWA — servido em /manifest.webmanifest.
 *
 * É ele que faz o Android e o iPhone oferecerem "instalar" e abrirem o
 * TurisGuard em janela própria, sem a barra do navegador.
 *
 * `start_url` aponta para /dashboard porque quem instala é a agência que usa
 * todo dia; sem sessão, o middleware devolve para /login com ?next=/dashboard
 * e a pessoa cai no lugar certo depois de entrar.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'TurisGuard — Assessoria Jurídica para Agências de Turismo',
    short_name: 'TurisGuard',
    description:
      'Plataforma de assessoria jurídica especializada para agências de turismo brasileiras',
    lang: 'pt-BR',
    dir: 'ltr',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: THEME_COLOR.light,
    theme_color: THEME_COLOR.light,
    categories: ['business', 'productivity'],
    icons: [
      // SVG primeiro: é o que o navegador usa em qualquer tamanho quando
      // entende vetor. Os PNG ficam para quem não entende — e o Chrome exige
      // um PNG de 192 e um de 512 para considerar o app instalável.
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // Atalhos do ícone (segurar o ícone no Android, botão direito no desktop).
    // São as mesmas ações dos cards do painel — cada URL tem de existir de
    // verdade, senão o atalho cai num 404.
    shortcuts: [
      {
        name: 'Dúvida jurídica',
        short_name: 'Dúvida',
        description: 'Relatar um caso para a assessoria jurídica',
        url: '/casos/novo',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Gerar documento',
        short_name: 'Documento',
        description: 'Gerar ou analisar um documento',
        url: '/documentos/novo',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: 'Solicitar defesa',
        short_name: 'Defesa',
        description: 'Pedir defesa em reclamação ou processo',
        url: '/defesa',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
  }
}
