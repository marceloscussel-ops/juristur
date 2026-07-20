import { env } from '@/lib/env'

/**
 * Retorna true se o e-mail está na allowlist de administradores (ADMIN_EMAILS,
 * separados por vírgula/espaço). Usada para liberar o painel gerencial em /admin.
 */
export function isAdmin(email?: string | null): boolean {
  if (!email) return false
  const list = env('ADMIN_EMAILS').toLowerCase().split(/[,;\s]+/).filter(Boolean)
  return list.includes(email.toLowerCase())
}
