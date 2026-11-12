import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // sw.js, swe-worker-*.js e manifest.webmanifest ficam de fora de propósito:
    // o navegador busca os três sem sessão, e um redirecionamento para /login
    // aqui quebraria a instalação do PWA.
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|swe-worker-.*\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
