/**
 * titular.ts — Porteiro das rotas que só o titular pode usar.
 *
 * O que é do titular, e só dele: gestão de usuários, cobrança (assinar, trocar
 * de plano, cancelar), dados da agência e exclusão/exportação da conta. É quem
 * assina, paga e responde pela conta.
 *
 * A validação vive num lugar só porque são muitas rotas — equipe (convidar,
 * reenviar, suspender, remover), billing (checkout, cancel) e profile (patch,
 * delete, export). Repetir a checagem em cada uma é como se esquece de uma.
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
 * `mensagem` é o texto que o membro vê ao tentar — vale a pena ser específico,
 * porque "não autorizado" numa tela que ele abriu sozinho parece defeito.
 *
 * Uso: `const porteiro = await exigirTitular(); if ('erro' in porteiro) return porteiro.erro`
 */
export async function exigirTitular(mensagem?: string): Promise<Titular | { erro: NextResponse }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { erro: NextResponse.json({ error: 'Não autorizado.' }, { status: 401 }) }
  }

  const vinculo = await getVinculo(user.id)

  if (!vinculo.isTitular || !vinculo.isAtivo) {
    return {
      erro: NextResponse.json(
        { error: mensagem ?? 'Só o titular da conta pode fazer isso.' },
        { status: 403 },
      ),
    }
  }

  return { user, agencyId: vinculo.agencyId }
}
