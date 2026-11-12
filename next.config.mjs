import { spawnSync } from 'node:child_process'
import withSerwistInit from '@serwist/next'

/**
 * Revisão do pré-cache da tela /offline: muda a cada deploy para o service
 * worker buscar a tela nova em vez de servir a antiga para sempre.
 *
 * Na Vercel é o SHA do commit. Na máquina, com mudança ainda não commitada,
 * o SHA não muda — e aí o build local serviria a /offline velha. Por isso o
 * sufixo com o horário quando a árvore está suja.
 */
function precacheRevision() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA

  const git = (...args) => spawnSync('git', args, { encoding: 'utf-8' }).stdout?.trim() ?? ''
  const sha = git('rev-parse', 'HEAD')
  if (!sha) return String(Date.now())

  return git('status', '--porcelain') ? `${sha}-dirty-${Date.now()}` : sha
}

const revision = precacheRevision()

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  // A tela de offline não é um arquivo estático: entra no pré-cache à mão.
  additionalPrecacheEntries: [{ url: '/offline', revision }],
  // Em `next dev` o service worker só atrapalha — segura HTML antigo e
  // confunde o hot reload.
  disable: process.env.NODE_ENV === 'development',
  // O padrão do Serwist é recarregar a página sozinho quando a conexão volta.
  // Aqui isso é perigoso: as telas de relato, documento e defesa são textos
  // longos, e um recarregamento no meio da digitação joga tudo fora. Quem
  // decide quando recarregar é a pessoa, no botão da tela /offline.
  reloadOnOnline: false,
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth'],
  },
}

export default withSerwist(nextConfig)
