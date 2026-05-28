/**
 * env.ts — Lê variáveis de ambiente removendo BOM e chars inválidos.
 *
 * Variáveis adicionadas via PowerShell pipe (echo "val" | vercel env add)
 * podem conter BOM (U+FEFF) invisível que quebra headers HTTP, JWTs e API keys.
 */
export function env(name: string): string {
  return (process.env[name] ?? '').replace(/[^\x20-\x7E]/g, '').trim()
}
