import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getTrialInfo } from '@/lib/plans'
import { isAdmin } from '@/lib/admin'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isLawyerPath = pathname.startsWith('/lawyer')
  const publicPaths  = ['/login', '/cadastro', '/evento', '/', '/esqueci-senha', '/resetar-senha', '/auth/callback']
  const isPublicPath = publicPaths.some(p => pathname === p || pathname.startsWith('/api/'))

  // Papel do usuário vem diretamente do JWT (app_metadata) — sem query ao banco
  const isLawyer = user?.app_metadata?.role === 'lawyer'

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && (pathname === '/login' || pathname === '/cadastro' || pathname === '/evento')) {
    const url = request.nextUrl.clone()
    url.pathname = isLawyer ? '/lawyer/dashboard' : '/dashboard'
    return NextResponse.redirect(url)
  }

  if (user && isLawyerPath && !isLawyer) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Bloqueio de acesso: agência com trial expirado e sem assinatura ativa só pode
  // acessar /assinar e /perfil (para corrigir o CNPJ). APIs já são isPublicPath e
  // passam livres — o weblayout logado é o alvo do bloqueio.
  const billingExempt =
    pathname === '/assinar' || pathname.startsWith('/assinar/') || pathname === '/perfil'

  if (
    user && !isLawyer && !isLawyerPath &&
    !isAdmin(user.email) && !pathname.startsWith('/admin') &&
    !isPublicPath && !billingExempt
  ) {
    const { data: agency } = await supabase
      .from('agencies')
      .select('subscription_status, trial_ends_at, created_at, access_until')
      .eq('id', user.id)
      .maybeSingle()

    if (agency && getTrialInfo(agency).isExpired) {
      const url = request.nextUrl.clone()
      url.pathname = '/assinar'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
