import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist, StaleWhileRevalidate } from 'serwist'
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Lista de arquivos a pré-cachear, injetada pelo @serwist/next no build.
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

/**
 * O que este service worker cacheia — e, principalmente, o que ele NÃO cacheia.
 *
 * O TurisGuard é multiusuário e multiagência: o Cache Storage é por origem, não
 * por sessão, e não é limpo no logout. Guardar ali resposta de API, dado do
 * Supabase ou HTML/RSC de página logada significaria deixar caso, documento e
 * parecer de uma agência no disco, legíveis pela próxima pessoa que abrir o
 * navegador naquele aparelho. Por isso a lista abaixo só cobre arquivo estático
 * e de mesma origem — tudo o mais vai de NetworkOnly.
 *
 * A ordem importa: o Serwist usa a primeira regra que casar.
 */
const runtimeCaching: RuntimeCaching[] = [
  {
    // Build do Next: nome com hash, conteúdo imutável. JS, CSS e as fontes do
    // next/font moram todos aqui.
    matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/_next/static/'),
    handler: new CacheFirst({
      cacheName: 'next-static',
      plugins: [new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: 60 * 60 * 24 * 30 })],
    }),
  },
  {
    // Ícones e imagens servidas de /public.
    matcher: ({ url, sameOrigin }) =>
      sameOrigin && /\.(?:png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname),
    handler: new StaleWhileRevalidate({
      cacheName: 'static-images',
      plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 30 })],
    }),
  },
  {
    // Otimizador de imagem do Next.
    matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname === '/_next/image',
    handler: new StaleWhileRevalidate({
      cacheName: 'next-image',
      plugins: [new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 })],
    }),
  },
  {
    // Todo o resto — /api/*, Supabase, Anthropic, analytics, HTML e payload RSC
    // de página logada — vai direto à rede e não encosta no cache.
    //
    // Esta regra também é o que faz a tela /offline aparecer: sem rede o
    // NetworkOnly falha, e a falha cai no fallback configurado lá embaixo.
    matcher: () => true,
    handler: new NetworkOnly(),
  },
]

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: '/offline',
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
})

serwist.addEventListeners()
