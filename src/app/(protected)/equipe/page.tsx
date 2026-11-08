import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getVinculo } from '@/lib/agencia-do-usuario'
import EquipeClient from '@/components/EquipeClient'

/**
 * Equipe da agência — tela do titular.
 *
 * A checagem é no servidor, antes de renderizar: esconder o link na Navbar é
 * conveniência, não trava. As rotas de /api/equipe recusam quem não é titular
 * de novo, então quem digitar /equipe na barra de endereços volta ao painel
 * em vez de ver uma tela que não funciona.
 */
export default async function EquipePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const vinculo = await getVinculo(user.id)
  if (!vinculo.isTitular) redirect('/dashboard')

  return <EquipeClient />
}
