import type { CaseCategory } from '@/types'

/**
 * Casos de exemplo para o usuário ver a plataforma funcionando em poucos toques.
 *
 * Usados no onboarding (primeiro acesso) e em eventos: em vez de encarar um
 * formulário em branco, a pessoa preenche um caso realista com um clique e vê
 * a análise da IA em segundos. O texto é editável antes de enviar.
 */
export interface CaseExample {
  id:          string
  chip:        string
  title:       string
  category:    CaseCategory
  description: string
}

export const CASE_EXAMPLES: CaseExample[] = [
  {
    id:       'voo',
    chip:     'Atraso de voo',
    title:    'Cliente exige indenização por atraso de voo',
    category: 'Outro',
    description:
      'Vendemos um pacote com voo de São Paulo para Salvador. O voo atrasou 9 horas por problema técnico da companhia aérea e o cliente perdeu a primeira diária do hotel e um passeio já pago. A companhia ofereceu apenas voucher de alimentação. O cliente está exigindo que a nossa agência devolva o valor da diária e do passeio, além de indenização por danos morais. O valor total do pacote foi de R$ 4.800.',
  },
  {
    id:       'bagagem',
    chip:     'Extravio de bagagem',
    title:    'Bagagem extraviada em pacote vendido pela agência',
    category: 'Outro',
    description:
      'Cliente viajou em pacote internacional vendido por nós e teve a bagagem extraviada na conexão. A mala foi devolvida 5 dias depois, já no fim da viagem. Ele comprou roupas e itens de higiene durante esse período, gastando cerca de R$ 2.300, e agora cobra o reembolso da nossa agência, alegando que fomos nós que vendemos a viagem.',
  },
  {
    id:       'cancelamento',
    chip:     'Cancelamento pelo cliente',
    title:    'Cliente quer cancelar pacote 10 dias antes da viagem',
    category: 'Cancelamento de pacote pelo cliente',
    description:
      'Cliente comprou um pacote nacional por R$ 6.500 e solicitou o cancelamento 10 dias antes do embarque, por motivo pessoal. O contrato prevê multa de 30% sobre o valor total. O cliente alega que a multa é abusiva e quer o reembolso integral, ameaçando acionar judicialmente. A hospedagem já foi paga ao fornecedor e não é reembolsável.',
  },
  {
    id:       'overbooking',
    chip:     'Overbooking em hotel',
    title:    'Hotel negou hospedagem por overbooking',
    category: 'Overbooking (hotel ou aéreo)',
    description:
      'Cliente chegou ao hotel com a reserva confirmada e paga através da nossa agência, mas foi informado de que não havia quarto disponível por overbooking. O hotel realocou a família em uma pousada de categoria inferior, a 8 km do local original. O cliente está exigindo da nossa agência o reembolso da diferença de categoria e indenização pelo transtorno.',
  },
]

export function getCaseExample(id?: string | null): CaseExample | undefined {
  if (!id) return undefined
  return CASE_EXAMPLES.find(e => e.id === id)
}
