import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getTrialInfo } from '@/lib/plans'
import { isAdmin } from '@/lib/admin'
import { safeNextPath } from '@/lib/urls'

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
  // /contrato é público: a pessoa precisa poder ler o contrato ANTES de ter conta.
  // /offline é a tela que o service worker mostra sem rede: ela é pré-cacheada
  // no build e tem de responder 200 para qualquer um, com ou sem sessão —
  // senão o que entraria no cache seria o redirecionamento para /login.
  const publicPaths  = ['/login', '/cadastro', '/evento', '/', '/contrato', '/esqueci-senha', '/resetar-senha', '/auth/callback', '/auth/confirmar', '/offline']
  // /i/<slug> é o link de indicação: ele só grava o cookie e manda para o
  // cadastro, então tem de abrir para quem ainda não tem conta — que é
  // justamente quem chega por ele.
  const isPublicPath = publicPaths.some(p => pathname === p || pathname.startsWith('/api/'))
    || pathname.startsWith('/i/')

  // Papel do usuário vem diretamente do JWT (app_metadata) — sem query ao banco
  const isLawyer = user?.app_metadata?.role === 'lawyer'

  // Guarda o destino em ?next= para o login devolver a pessoa ao lugar certo.
  // Sem isto, quem abre um link de caso (por exemplo o que mandamos no
  // WhatsApp) sem sessão ativa cai no dashboard e tem de procurar o caso.
  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    const next = `${pathname}${request.nextUrl.search}`
    url.pathname = '/login'
    url.search = ''
    url.searchParams.set('next', next)
    return NextResponse.redirect(url)
  }

  if (user && (pathname === '/login' || pathname === '/cadastro' || pathname === '/evento')) {
    const next = safeNextPath(request.nextUrl.searchParams.get('next'))
    const url  = new URL(next ?? (isLawyer ? '/lawyer/dashboard' : '/dashboard'), request.url)
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
    // Qual agência é a desta pessoa? Com múltiplos usuários por agência, o
    // `auth.uid()` do membro NÃO é o id da agência — ler `agencies` por
    // `user.id` devolveria nada e o gate deixaria passar quem já expirou.
    //
    // Aqui a consulta usa a sessão do próprio usuário (e não o service role de
    // src/lib/agencia-do-usuario.ts): o middleware roda no Edge, onde env var
    // lida dinamicamente não existe. A policy de `agency_members` já mostra a
    // linha de quem está ativo, que é justamente quem o gate precisa avaliar.
    const { data: membro } = await supabase
      .from('agency_members')
      .select('agency_id')
      .eq('user_id', user.id)
      .maybeSingle()

    // Sem linha (ou migration ainda não aplicada): titular da própria agência,
    // igual ao comportamento de antes desta feature.
    const agencyId = membro?.agency_id ?? user.id

    const { data: agency } = await supabase
      .from('agencies')
      .select('subscription_status, trial_ends_at, created_at, access_until')
      .eq('id', agencyId)
      .maybeSingle()

    if (agency && getTrialInfo(agency).isExpired) {
      const url = request.nextUrl.clone()
      url.pathname = '/assinar'
      return NextResponse.redirect(url)
    }
  }

  // /assinar continua aberto ao membro de propósito: é onde ele vê que a
  // assinatura é administrada pelo titular (a própria página explica). Barrar
  // aqui criaria laço com o redirecionamento do gate acima, que manda todo
  // mundo da agência expirada justamente para /assinar. Contratar, trocar de
  // plano e cancelar é que são bloqueados — nas rotas de /api/billing.

  return supabaseResponse
}
