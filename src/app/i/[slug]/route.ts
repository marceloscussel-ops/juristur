/**
 * GET /i/<slug> — link de indicação.
 *
 * É o endereço que o indicador divulga (ex.: turisguard.com/i/unav). Grava o
 * slug num cookie e manda a pessoa para o cadastro.
 *
 * O cookie existe por causa do cadastro por Google: o fluxo OAuth sai do site,
 * passa pelo provedor e volta pelo /auth/callback — uma query string não
 * sobrevive a essa ida e volta, um cookie de primeira parte sobrevive. O `?ind=`
 * no destino é só para a tela confirmar de quem é a indicação.
 *
 * Slug desconhecido ou indicador inativo não é erro: a pessoa segue para o
 * cadastro normalmente, só sem atribuição. Quem errou o link foi quem o
 * divulgou, e barrar o cadastro seria perder a agência.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  INDICADOR_COOKIE, INDICADOR_COOKIE_DIAS, buscarIndicadorPorSlug,
} from '@/lib/partners'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const partner = await buscarIndicadorPorSlug(slug)

  const destino = new URL('/cadastro', request.nextUrl.origin)
  // Preserva o que já vinha na URL (utm_campaign e afins) — o link do
  // indicador pode ser usado dentro de uma campanha.
  request.nextUrl.searchParams.forEach((v, k) => destino.searchParams.set(k, v))
  if (partner) destino.searchParams.set('ind', partner.slug)

  const response = NextResponse.redirect(destino)

  if (partner) {
    response.cookies.set(INDICADOR_COOKIE, partner.slug, {
      maxAge:   INDICADOR_COOKIE_DIAS * 86_400,
      httpOnly: true,   // só o servidor lê; nada no navegador precisa dele
      sameSite: 'lax',  // sobrevive ao retorno do provedor de OAuth
      secure:   process.env.NODE_ENV === 'production',
      path:     '/',
    })
  }

  return response
}
