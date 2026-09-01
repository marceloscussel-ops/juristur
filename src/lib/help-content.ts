import {
  PlusCircle, ShieldAlert, MessageSquare, Layers, Paperclip, Scale, CreditCard, UserCircle,
  type LucideIcon,
} from 'lucide-react'
import { MAX_FOLLOWUP_QUESTIONS } from '@/types'

// Conteúdo da Central de Ajuda. É só dado — edite os textos aqui sem mexer no layout.

export interface HelpStep {
  titulo:    string
  descricao: string
}

export interface HelpFeature {
  icon:      LucideIcon
  titulo:    string
  descricao: string
}

export interface HelpFaq {
  grupo:    string
  pergunta: string
  resposta: string
}

/** 1 — Passo a passo do uso básico (caminho feliz). */
export const passos: HelpStep[] = [
  {
    titulo:    'Abra um novo caso',
    descricao: 'Clique em "Novo caso", escolha a categoria que melhor descreve a situação, escreva o relato com o máximo de detalhes e, se tiver, anexe documentos (contratos, e-mails, comprovantes).',
  },
  {
    titulo:    'Aguarde a análise',
    descricao: 'A inteligência artificial analisa o caso. Quando a revisão por advogado está ativa, um advogado confere e aprova antes de liberar. Você é avisado no WhatsApp assim que o parecer estiver pronto.',
  },
  {
    titulo:    'Leia o parecer',
    descricao: 'No caso você vê a análise completa: o nível de risco (severidade), o que a lei diz, o que fazer e os caminhos possíveis. Pode imprimir ou salvar em PDF.',
  },
  {
    titulo:    'Tire suas dúvidas',
    descricao: `Ficou com alguma dúvida sobre a análise? Use o campo fixo na base da tela ("Perguntas de acompanhamento") para perguntar. Você tem até ${MAX_FOLLOWUP_QUESTIONS} perguntas por caso.`,
  },
  {
    titulo:    'Complemente, se faltou algo',
    descricao: 'Esqueceu de mencionar um detalhe? Adicione um complemento (uma vez por caso). O relato original é preservado e a IA reanalisa considerando a nova informação.',
  },
  {
    titulo:    'Fale com um advogado, se precisar',
    descricao: 'Para atendimento humano sobre o caso, use "Escalar para advogado" e a conversa segue pelo WhatsApp.',
  },
]

/** 2 — Explicação de todas as funcionalidades. */
export const funcionalidades: HelpFeature[] = [
  {
    icon:      PlusCircle,
    titulo:    'Novo caso',
    descricao: 'Registre uma situação para receber orientação jurídica. Informe a categoria, o relato e anexos opcionais.',
  },
  {
    icon:      ShieldAlert,
    titulo:    'Nível de risco (severidade)',
    descricao: 'Cada análise vem classificada por risco jurídico/financeiro: leve, médio, elevado ou elevadíssimo. Ajuda a priorizar a atenção ao caso.',
  },
  {
    icon:      MessageSquare,
    titulo:    'Perguntas de acompanhamento',
    descricao: `Tire dúvidas sobre a análise no campo fixo na base da tela do caso. Até ${MAX_FOLLOWUP_QUESTIONS} perguntas por caso; para um assunto novo, abra um novo caso.`,
  },
  {
    icon:      Layers,
    titulo:    'Complemento',
    descricao: 'Acrescente uma ressalva ou informação esquecida a um caso já aprovado, sem alterar o relato original. Dispara uma nova análise. Permitido um complemento por caso.',
  },
  {
    icon:      Paperclip,
    titulo:    'Anexos',
    descricao: 'Envie documentos junto ao caso (PDF, imagens). A IA lê o conteúdo e considera na análise.',
  },
  {
    icon:      Scale,
    titulo:    'Escalar para advogado',
    descricao: 'Quando precisar de atendimento humano, escale o caso para um advogado. A conversa continua pelo WhatsApp.',
  },
  {
    icon:      CreditCard,
    titulo:    'Planos e cobrança',
    descricao: 'Gerencie seu plano em "Planos": mensal (assinatura recorrente) ou anual (à vista, cartão em até 12x, PIX ou boleto).',
  },
  {
    icon:      UserCircle,
    titulo:    'Perfil',
    descricao: 'Atualize os dados da agência e o número de WhatsApp que recebe os avisos, e acompanhe o status do seu plano.',
  },
]

/** 3 — Perguntas frequentes, agrupadas por tema. */
export const faqGrupos = ['Uso', 'Análise & IA', 'Advogado & Suporte', 'Plano & Cobrança'] as const

export const faq: HelpFaq[] = [
  {
    grupo:    'Uso',
    pergunta: 'Como abro um caso?',
    resposta: 'Clique em "Novo caso" no menu, escolha a categoria, descreva a situação com detalhes e anexe documentos se tiver. Depois é só enviar e aguardar a análise.',
  },
  {
    grupo:    'Uso',
    pergunta: 'Posso anexar documentos?',
    resposta: 'Sim. Você pode anexar arquivos (como contratos, e-mails e comprovantes) ao criar o caso. A IA lê o conteúdo e usa na análise.',
  },
  {
    grupo:    'Uso',
    pergunta: 'Quanto tempo leva a análise?',
    resposta: 'Normalmente segundos. Quando a revisão por advogado está ativa, o parecer só é liberado após a aprovação — nesse caso o tempo depende do advogado. Você é avisado no WhatsApp quando ficar pronto.',
  },
  {
    grupo:    'Análise & IA',
    pergunta: 'O que significa o nível de risco (severidade)?',
    resposta: 'É a classificação do risco jurídico/financeiro do caso, em quatro níveis: leve, médio, elevado e elevadíssimo. Serve para você priorizar os casos mais sensíveis.',
  },
  {
    grupo:    'Análise & IA',
    pergunta: 'Esqueci de contar um detalhe. Posso editar o relato?',
    resposta: 'O relato original é sempre preservado e não pode ser editado. Para acrescentar uma informação, use o "Complemento" no caso: o texto original fica intacto e a IA reanalisa com a nova informação. É permitido um complemento por caso.',
  },
  {
    grupo:    'Análise & IA',
    pergunta: 'Quantas perguntas de acompanhamento posso fazer?',
    resposta: `Até ${MAX_FOLLOWUP_QUESTIONS} por caso. Ao atingir o limite, abra um novo caso para um assunto diferente.`,
  },
  {
    grupo:    'Análise & IA',
    pergunta: 'A análise da IA substitui um advogado?',
    resposta: 'Não. Ela oferece uma orientação inicial rápida e prática. Para atendimento humano sobre o caso, use "Escalar para advogado".',
  },
  {
    grupo:    'Advogado & Suporte',
    pergunta: 'Como falo com um advogado sobre o caso?',
    resposta: 'Dentro do caso, use o botão "Escalar para advogado". A conversa segue pelo WhatsApp. No período gratuito há uma cota de escaladas.',
  },
  {
    grupo:    'Advogado & Suporte',
    pergunta: 'Como falo com o suporte da plataforma?',
    resposta: 'Use o botão "Falar com o suporte" aqui no final desta página — ele abre uma conversa no WhatsApp com a nossa equipe.',
  },
  {
    grupo:    'Plano & Cobrança',
    pergunta: 'Qual a diferença entre o plano mensal e o anual?',
    resposta: 'O mensal precisa ser renovado todo mês (assinatura recorrente). O anual é válido por um ano, com desconto no valor da assinatura, pago à vista (cartão em até 12x, PIX ou boleto).',
  },
  {
    grupo:    'Plano & Cobrança',
    pergunta: 'Meu período gratuito acabou. E agora?',
    resposta: 'Para continuar usando, acesse "Planos" e assine o plano que preferir. Seus casos e análises anteriores continuam disponíveis.',
  },
]
