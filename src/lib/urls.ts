/**
 * urls.ts — Endereços públicos da plataforma e validação de destino pós-login.
 */

import { env } from '@/lib/env'

/**
 * URL pública canônica da plataforma, sem barra no fim.
 *
 * Fallback único: antes cada arquivo carregava o seu, e vários ainda apontavam
 * para o domínio antigo (juristur.vercel.app). Em produção a env var existe e
 * mascarava isso — mas preview e build local geravam links para o lugar errado.
 *
 * Só para uso no servidor: `env()` lê `process.env[nome]` dinamicamente, e o
 * Next só inlina no bundle do cliente os acessos com nome literal.
 */
export function appUrl(): string {
  return (env('NEXT_PUBLIC_APP_URL') || 'https://www.turisguard.com').replace(/\/+$/, '')
}

/** Link direto para um caso na plataforma. */
export function caseUrl(caseId: string): string {
  return `${appUrl()}/casos/${caseId}`
}

/**
 * Valida o destino pós-login vindo de `?next=`.
 *
 * Aceita só caminho interno absoluto. Rejeita `//host` e `/\host`, que o
 * navegador resolve como URL absoluta e transformariam o login em open
 * redirect. Roda no cliente e no middleware — não depende de env var.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith('/')) return null
  if (raw.startsWith('//') || raw.startsWith('/\\')) return null
  return raw
}
