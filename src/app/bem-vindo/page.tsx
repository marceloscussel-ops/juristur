import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import TGLogo from '@/components/TGLogo'
import WhatsappStep from '@/components/WhatsappStep'
import { dadosDoCliente, planoAvaliacao, registrarAceite, temAceite } from '@/lib/contrato/aceite'

/**
 * Passo de boas-vindas após o cadastro.
 *
 * Quem entra por e-mail/senha já informou o WhatsApp e passa direto. Quem entra
 * com Google não tem telefone — e é por ele que avisamos que a análise ficou
 * pronta —, então pedimos só esse campo antes de seguir.
 */
interface Props {
  searchParams: Promise<{ origem?: string; campanha?: string; aceite?: string }>
}

export default async function BemVindoPage({ searchParams }: Props) {
  const { origem, campanha, aceite } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Advogado nunca passa pelo onboarding de agência.
  if (user.app_metadata?.role === 'lawyer') redirect('/lawyer/dashboard')

  const { data: agency } = await supabase
    .from('agencies')
    .select('name, phone, origem, cnpj, email, trial_ends_at')
    .eq('id', user.id)
    .maybeSingle()

  // Aceite do contrato no cadastro por Google. O fluxo OAuth não passa pelo
  // /api/auth/register, então a marca do checkbox volta do provedor na URL
  // (?aceite=1) e o registro é gravado aqui, uma única vez por conta.
  if (aceite === '1' && agency && !(await temAceite(user.id))) {
    const { ip, userAgent } = dadosDoCliente(await headers())
    await registrarAceite({
      agencyId: user.id,
      evento:   'cadastro',
      agencia: {
        nome:      agency.name,
        documento: agency.cnpj,
        email:     agency.email ?? user.email,
        telefone:  agency.phone,
      },
      plano:     planoAvaliacao(agency.trial_ends_at),
      email:     user.email,
      ip, userAgent,
    })
  }

  // Cadastro por Google não passa pelo /api/auth/register: a origem chega aqui
  // pela URL. Só grava se ainda não houver — não sobrescreve a aquisição real.
  if (origem && agency && !agency.origem) {
    await supabase
      .from('agencies')
      .update({
        origem:          origem.slice(0, 30),
        origem_campanha: campanha ? campanha.slice(0, 60) : null,
      })
      .eq('id', user.id)
  }

  if (agency?.phone) {
    // Já temos o canal de aviso. Quem já usou volta ao painel; quem acabou de
    // chegar vai direto abrir o primeiro caso.
    const { count } = await supabase
      .from('cases')
      .select('id', { count: 'exact', head: true })
      .eq('agency_id', user.id)

    redirect((count ?? 0) > 0 ? '/dashboard' : '/casos/novo?bemvindo=1')
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <TGLogo size={36} variant="color" withWordmark />
          <h1 className="j-h1 mt-5 mb-1">Falta só um passo</h1>
          <p className="j-caption">Seu WhatsApp para avisarmos quando a análise ficar pronta</p>
        </div>

        <div className="j-card animate-fade-in">
          <WhatsappStep agencyName={agency?.name ?? 'Minha agência'} />
        </div>
      </div>
    </div>
  )
}
