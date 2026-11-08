import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'
import TrialBanner from '@/components/TrialBanner'
import { getTrialInfo, type AgencyAccess } from '@/lib/plans'
import { AGENCY_COLS, ensureAgency } from '@/lib/agency'
import { getVinculo, ativarSeConvidado } from '@/lib/agencia-do-usuario'
import { UserX } from 'lucide-react'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Com múltiplos usuários por agência, o id do usuário logado não é mais
  // necessariamente o id da agência: quem é membro tem a agência resolvida
  // pelo vínculo em `agency_members`.
  let vinculo = await getVinculo(user.id)

  // Convite aceito: quem chegou aqui com sessão aberta passou pelo link do
  // convite. O trigger on_auth_user_confirmed normalmente já fez isso; esta é
  // a rede de segurança para a conta não ficar presa em 'convidado'.
  if (vinculo.status === 'convidado') {
    await ativarSeConvidado(user.id)
    vinculo = await getVinculo(user.id)
  }

  const isLawyer = user.app_metadata?.role === 'lawyer'

  // Suspenso pelo titular (ou excedente de um downgrade de plano): sem acesso
  // aos dados da agência. O aviso fica aqui, no layout, para valer em todas as
  // telas protegidas de uma vez — a RLS já devolveria tudo vazio, e uma tela
  // vazia sem explicação pareceria defeito.
  if (!vinculo.isAtivo && !isLawyer) {
    return (
      <div className="min-h-screen bg-surface relative">
        <Navbar isTitular={false} />
        <main className="max-w-md mx-auto px-4 sm:px-6 py-16">
          <div className="j-card text-center py-10">
            <UserX className="w-9 h-9 text-ink-40 mx-auto mb-3" />
            <h1 className="j-h3 mb-1">Acesso suspenso</h1>
            <p className="j-caption">
              O titular da conta suspendeu o seu acesso a esta agência. Fale com
              ele para voltar a usar o TurisGuard.
            </p>
          </div>
        </main>
      </div>
    )
  }

  const { data } = await supabase
    .from('agencies')
    .select(AGENCY_COLS)
    .eq('id', vinculo.agencyId)
    .maybeSingle()

  let agency = data as AgencyAccess | null

  // Auto-reparo: usuário autenticado sem agência (ex.: cadastro via Google, ou
  // linha removida). Cria a agência com o período gratuito antes de seguir.
  // Só vale para quem não tem vínculo: para um membro, criar agência aqui é o
  // bug que o convite existe para evitar.
  if (!agency && !isLawyer && !vinculo.membership) {
    agency = await ensureAgency(user)
  }

  const trial = agency ? getTrialInfo(agency) : null

  return (
    <div className="min-h-screen bg-surface relative">
      <Navbar isTitular={vinculo.isTitular} />
      {trial && <TrialBanner trial={trial} />}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  )
}
