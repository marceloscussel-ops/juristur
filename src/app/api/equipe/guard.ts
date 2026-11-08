/**
 * guard.ts — Porteiro das rotas de equipe.
 *
 * Gestão de usuários é do titular, e só dele: é quem assina, paga e responde
 * pela conta. Um membro não convida, não suspende e não remove ninguém.
 *
 * Fica fora de route.ts de propósito: qualquer arquivo dentro de app/ que não
 * seja route.ts/page.tsx não vira rota, e a validação precisa ser a mesma nas
 * quatro rotas (convidar, reenviar, suspender/reativar, remover) — repetir a
 * checagem em cada uma é como se esquece de uma.
 */
import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { getVinculo } from '@/lib/agencia-do-usuario'

interface Titular {
  user:     User
  agencyId: string
}

/**
 * Devolve o titular autenticado, ou a resposta de erro já pronta.
 *
 * Uso: `const porteiro = await exigirTitular(); if ('erro' in porteiro) return porteiro.erro`
 */
export async function exigirTitular(): Promise<Titular | { erro: NextResponse }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { erro: NextResponse.json({ error: 'Não autorizado.' }, { status: 401 }) }
  }

  const vinculo = await getVinculo(user.id)

  if (!vinculo.isTitular || !vinculo.isAtivo) {
    return {
      erro: NextResponse.json(
        { error: 'Só o titular da conta pode gerenciar os usuários da agência.' },
        { status: 403 },
      ),
    }
  }

  return { user, agencyId: vinculo.agencyId }
}
