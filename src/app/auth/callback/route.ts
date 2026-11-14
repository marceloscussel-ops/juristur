import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { safeNextPath } from '@/lib/urls'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next')) ?? '/dashboard'
  const origin = request.nextUrl.origin

  if (!code) {
    // O Supabase devolve o motivo na query (ex.: error_code=otp_expired quando
    // um antivírus de e-mail já abriu o link). Sem este log, toda falha vira
    // o mesmo "link expirado" e não dá para saber qual foi.
    console.error('[auth/callback] sem code', {
      error: searchParams.get('error'),
      error_code: searchParams.get('error_code'),
      error_description: searchParams.get('error_description'),
    })
    return NextResponse.redirect(`${origin}/esqueci-senha?erro=1`)
  }

  const response = NextResponse.redirect(`${origin}${next}`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    // "code verifier" no erro = link aberto em outro navegador/dispositivo.
    console.error('[auth/callback] exchangeCodeForSession falhou', {
      code: error.code,
      status: error.status,
      message: error.message,
    })
    return NextResponse.redirect(`${origin}/esqueci-senha?erro=1`)
  }

  return response
}
