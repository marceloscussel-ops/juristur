import {
  PlusCircle, ShieldAlert, MessageSquare, Layers, Paperclip, Scale, CreditCard, UserCircle,
  ShieldCheck, MessageCircle, FileSignature, FileText, FileCheck, Users, LayoutList,
  ScrollText, SunMoon,
  type LucideIcon,
} from 'lucide-react'
import { MAX_FOLLOWUP_QUESTIONS } from '@/types'
import { formatWhatsappNumber } from '@/lib/whatsapp/public-number'
import {
  TRIAL_DAYS, TRIAL_USUARIOS, TRIAL_ESCALATIONS, CARENCIA_DEFESA_DIAS,
} from '@/lib/plans'
import { DOCUMENT_TYPES, DOCUMENT_GROUPS } from '@/lib/templates/documentos'

// Conteúdo da Central de Ajuda. É só dado — edite os textos aqui sem mexer no layout.
//
// As contagens e os prazos vêm das fontes de verdade (plans.ts e
// templates/documentos.ts) de propósito: quando entra um tipo de documento novo
// ou o período gratuito muda, a ajuda acompanha sem ninguém lembrar de voltar aqui.

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

/** Quantos tipos de documento o catálogo oferece, em quantos grupos. */
const QTD_TIPOS_DOC  = DOCUMENT_TYPES.length
const QTD_GRUPOS_DOC = DOCUMENT_GROUPS.length

/** 1 — Passo a passo do uso básico (caminho feliz). */
export const passos: HelpStep[] = [
  {
    titulo:    'Escolha o que você precisa',
    descricao: 'O botão "Novo" abre a tela com as quatro ações da plataforma: tirar uma dúvida jurídica, gerar um contrato, gerar outro documento ou solicitar defesa. As mesmas quatro aparecem no topo do painel.',
  },
  {
    titulo:    'Abra uma dúvida jurídica',
    descricao: 'Escolha a categoria que melhor descreve a situação, escreva o relato com o máximo de detalhes e, se tiver, anexe documentos (contratos, e-mails, comprovantes).',
  },
  {
    titulo:    'Aguarde a análise',
    descricao: 'A inteligência artificial analisa o caso. Quando a revisão por advogado está ativa, um advogado confere e aprova antes de liberar. Você é avisado no WhatsApp assim que o parecer estiver pronto.',
  },
  {
    titulo:    'Leia o parecer',
    descricao: 'No caso você vê a análise completa: o nível de risco (severidade), o que a lei diz, o que fazer e os caminhos possíveis. Dá para baixar em PDF.',
  },
  {
    titulo:    'Tire dúvidas ou complemente',
    descricao: `Ficou com alguma dúvida sobre a análise? Use o campo fixo na base da tela ("Perguntas de acompanhamento") — são até ${MAX_FOLLOWUP_QUESTIONS} perguntas por caso. Se esqueceu de contar um detalhe, adicione um complemento (uma vez por caso): o relato original é preservado e a IA reanalisa com a nova informação.`,
  },
  {
    titulo:    'Gere o documento e confira as lacunas',
    descricao: 'No contrato e nos outros documentos a IA entrega um rascunho. Confira as lacunas e os valores e clique em "Confirmar" — só então os downloads em PDF e Word são liberados. Antes disso dá para gerar de novo quantas vezes quiser.',
  },
  {
    titulo:    'Acompanhe tudo no painel',
    descricao: 'Casos, contratos e documentos ficam na mesma lista, com filtro por tipo, status e categoria. Com mais de um usuário na agência, cada linha mostra quem criou.',
  },
  {
    titulo:    'Solicite defesa, se precisar',
    descricao: 'Para atendimento humano sobre o caso, use "Solicitar defesa": um advogado assume e a conversa segue pelo WhatsApp.',
  },
]

/** 2 — Explicação de todas as funcionalidades. */
export const funcionalidades: HelpFeature[] = [
  {
    icon:      PlusCircle,
    titulo:    'Dúvida jurídica (novo caso)',
    descricao: 'Registre uma situação para receber orientação jurídica com a base legal citada. Informe a categoria, o relato e anexos opcionais.',
  },
  {
    icon:      FileSignature,
    titulo:    'Gerar contrato',
    descricao: 'Contrato de prestação de serviço entre a agência e o consumidor, a partir do modelo padrão do turismo. Envie os documentos do cliente ou digite os dados: o que faltar fica como lacuna para preencher depois.',
  },
  {
    icon:      FileText,
    titulo:    'Gerar outros documentos',
    descricao: `São ${QTD_TIPOS_DOC} tipos, em ${QTD_GRUPOS_DOC} grupos: cliente (e-mail ou carta, termo de ciência, recusa de seguro viagem, autorização de viagem de menor, regulamento de excursão), financeiro (proposta comercial, confissão de dívida e parcelamento, recibo), encerramento de contrato (acordo de cancelamento e reembolso, cobrança amigável, termo de renúncia, distrato), fornecedor e terceiros (notificação, procuração para pleitear reembolso) e conflito e conformidade (resposta a Procon e consumidor.gov.br, uso de imagem, consentimento LGPD). Você escolhe o tipo, descreve o caso e a IA redige seguindo a estrutura e a base legal daquele documento.`,
  },
  {
    icon:      FileCheck,
    titulo:    'Rascunho, lacunas e confirmação',
    descricao: 'Todo documento nasce como rascunho. O que você não informou vira lacuna, marcada no texto para preencher à mão. Depois de conferir, clique em "Confirmar" para liberar o download em PDF e Word. Antes disso dá para gerar de novo ou excluir.',
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
    icon:      LayoutList,
    titulo:    'Painel e filtros',
    descricao: 'Casos, contratos e documentos aparecem numa lista única, do mais recente para o mais antigo. Filtre por tipo (dúvidas jurídicas, contratos, outros documentos), por status (em análise, concluído, rascunho, confirmado, arquivado) e, nos casos, por categoria.',
  },
  {
    icon:      Scale,
    titulo:    'Solicitar defesa',
    descricao: 'Quando precisar de atendimento humano, solicite defesa: um advogado assume o caso e a conversa continua pelo WhatsApp.',
  },
  {
    icon:      MessageCircle,
    titulo:    'Abrir casos pelo WhatsApp',
    descricao: `Você não precisa entrar na plataforma para abrir um caso: mande o relato por mensagem ou áudio para ${formatWhatsappNumber()} e a análise volta na própria conversa. Escreva do número cadastrado na plataforma — o do titular, no perfil da agência, ou o de cada usuário em "Equipe": é por ele que identificamos quem está falando.`,
  },
  {
    icon:      Users,
    titulo:    'Equipe',
    descricao: `O titular convida o resto da agência em "Equipe": informa nome, e-mail e WhatsApp, e a pessoa recebe um convite por e-mail para criar a senha. Todos veem o mesmo histórico da agência. Os assentos vêm do plano (${TRIAL_USUARIOS} durante o período gratuito), e dá para suspender, reativar ou remover um usuário a qualquer momento.`,
  },
  {
    icon:      CreditCard,
    titulo:    'Planos e cobrança',
    descricao: 'São três planos — Essential, Professional e Enterprise —, que mudam o número de usuários e as defesas com advogado inclusas. Em "Planos" você compara os valores e escolhe mensal (assinatura recorrente) ou anual (à vista, cartão em até 12x, PIX ou boleto).',
  },
  {
    icon:      UserCircle,
    titulo:    'Perfil',
    descricao: 'O titular atualiza os dados da agência e o número de WhatsApp que recebe os avisos, e acompanha o status do plano. Quem entrou por convite vê aqui com qual conta está logado.',
  },
  {
    icon:      ScrollText,
    titulo:    'Contrato e Anexo I',
    descricao: 'O contrato de licença de uso é aceito no cadastro e na contratação do plano. O texto geral fica sempre aberto em "Contrato", e no perfil, na seção "Contrato", o titular vê cada aceite registrado com data, versão e o Anexo I da agência — com PDF individualizado para baixar.',
  },
  {
    icon:      SunMoon,
    titulo:    'Tema claro ou escuro',
    descricao: 'A plataforma segue o tema do seu sistema, e no ícone ao lado do menu você fixa Sistema, Claro ou Escuro. A escolha fica guardada no navegador.',
  },
  {
    icon:      ShieldCheck,
    titulo:    'Meus dados e privacidade',
    descricao: 'No perfil o titular pode baixar todos os dados da agência em um arquivo ou excluir a conta definitivamente, conforme a LGPD.',
  },
]

/** 3 — Perguntas frequentes, agrupadas por tema. */
export const faqGrupos = [
  'Uso', 'Documentos', 'Análise & IA', 'Equipe', 'Advogado & Suporte',
  'Plano & Cobrança', 'Privacidade e dados',
] as const

export const faq: HelpFaq[] = [
  {
    grupo:    'Uso',
    pergunta: 'Como abro um caso?',
    resposta: 'Clique em "Novo" no menu e escolha "Dúvida jurídica". Selecione a categoria, descreva a situação com detalhes e anexe documentos se tiver. Depois é só enviar e aguardar a análise.',
  },
  {
    grupo:    'Uso',
    pergunta: 'Posso anexar documentos?',
    resposta: 'Sim. Você pode anexar arquivos (como contratos, e-mails e comprovantes) ao criar o caso. A IA lê o conteúdo e usa na análise.',
  },
  {
    grupo:    'Uso',
    pergunta: 'Onde encontro tudo o que já criei?',
    resposta: 'No painel. Casos, contratos e documentos ficam na mesma lista, e os filtros no topo separam por tipo, por status (em análise, concluído, rascunho, confirmado, arquivado) e, nos casos, por categoria.',
  },
  {
    grupo:    'Uso',
    pergunta: 'Dá para usar o TurisGuard pelo WhatsApp?',
    resposta: `Dá. Salve o número ${formatWhatsappNumber()} e mande o caso por mensagem ou áudio — a análise volta na própria conversa, e o caso aparece normalmente aqui no painel. Escreva do número cadastrado na plataforma: o do perfil da agência, se você é o titular, ou o que o titular cadastrou para você em "Equipe".`,
  },
  {
    grupo:    'Uso',
    pergunta: 'Quanto tempo leva a análise?',
    resposta: 'Normalmente segundos. Quando a revisão por advogado está ativa, o parecer só é liberado após a aprovação — nesse caso o tempo depende do advogado. Você é avisado no WhatsApp quando ficar pronto.',
  },
  {
    grupo:    'Uso',
    pergunta: 'Quanto dura o período gratuito e o que ele inclui?',
    resposta: `São ${TRIAL_DAYS} dias de acesso, com as consultas à IA e a geração de documentos liberadas, até ${TRIAL_USUARIOS} usuários na equipe e ${TRIAL_ESCALATIONS} solicitações de defesa sem custo. Depois disso é preciso assinar um plano para continuar — seus casos e documentos continuam todos lá.`,
  },
  {
    grupo:    'Uso',
    pergunta: 'Posso entrar com a minha conta Google?',
    resposta: 'Sim, tanto no cadastro quanto no login. No cadastro é preciso aceitar o contrato antes de clicar em entrar com o Google: o aceite não viaja para o provedor.',
  },
  {
    grupo:    'Uso',
    pergunta: 'A plataforma tem tema escuro?',
    resposta: 'Tem. Por padrão ela segue o tema do seu sistema, e o ícone ao lado do menu permite fixar Claro ou Escuro. A preferência fica guardada no navegador.',
  },
  {
    grupo:    'Documentos',
    pergunta: 'Quais documentos a plataforma gera?',
    resposta: `O contrato de prestação de serviço ao consumidor e outros ${QTD_TIPOS_DOC} tipos: e-mail ou carta ao cliente, termo de ciência e responsabilidade, termo de recusa de seguro viagem, autorização de viagem de menor, regulamento de excursão, proposta comercial, confissão de dívida e parcelamento, recibo, acordo de cancelamento e reembolso, aviso de inadimplência e cobrança amigável, termo de desistência e renúncia, distrato, notificação a fornecedor, procuração para pleitear reembolso, resposta a reclamação (Procon, consumidor.gov.br), autorização de uso de imagem e termo de consentimento LGPD.`,
  },
  {
    grupo:    'Documentos',
    pergunta: 'O que é uma lacuna?',
    resposta: 'É um trecho que a IA deixou em branco porque o dado não estava no pedido — um valor, uma data, um número de documento. Ela fica marcada no texto para você completar à mão. Quanto mais detalhe no pedido, menos lacuna sobra.',
  },
  {
    grupo:    'Documentos',
    pergunta: 'Por que o download só aparece depois de confirmar?',
    resposta: 'Porque confirmar é o passo em que você declara que conferiu as lacunas e os valores. É uma trava de propósito: evita que um rascunho com um valor errado saia para o cliente assinar.',
  },
  {
    grupo:    'Documentos',
    pergunta: 'Não gostei do resultado. Posso gerar de novo?',
    resposta: 'Pode, quantas vezes quiser — "Gerar de novo" refaz o texto a partir do mesmo pedido. Também dá para excluir o documento; a exclusão pede um segundo clique para não apagar sem querer.',
  },
  {
    grupo:    'Documentos',
    pergunta: 'Em que formatos eu baixo?',
    resposta: 'PDF e Word (.docx), depois de confirmar. O Word ajuda quando você ainda quer ajustar o texto ou preencher as lacunas no computador.',
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
    resposta: 'Não. Ela oferece uma orientação inicial rápida e prática. Para atendimento humano sobre o caso, use "Solicitar defesa".',
  },
  {
    grupo:    'Equipe',
    pergunta: 'Como coloco mais gente da agência na plataforma?',
    resposta: 'O titular abre "Equipe" no menu, informa nome, e-mail e WhatsApp da pessoa e envia o convite. Ela recebe um e-mail com o link para criar a senha e já entra na agência. Enquanto não aceita, o convite aparece como "Convite enviado" e pode ser reenviado.',
  },
  {
    grupo:    'Equipe',
    pergunta: 'Quantos usuários o meu plano permite?',
    resposta: `Essential 1, Professional 3 e Enterprise 5, sempre contando o titular. No período gratuito são ${TRIAL_USUARIOS}. Convite pendente já ocupa assento, porque vira acesso assim que for aceito.`,
  },
  {
    grupo:    'Equipe',
    pergunta: 'O que um usuário convidado pode fazer?',
    resposta: 'Abrir casos, gerar contratos e documentos, solicitar defesa e ver todo o histórico da agência — inclusive o que os colegas criaram. Fica só com o titular: contratar ou cancelar o plano, editar os dados cadastrais, administrar a equipe, o contrato e a exclusão da conta.',
  },
  {
    grupo:    'Equipe',
    pergunta: 'Como suspendo ou removo alguém?',
    resposta: 'Em "Equipe", na linha da pessoa. Suspender tira o acesso e devolve o assento, e dá para reativar depois. Remover apaga a conta de acesso dela. Nos dois casos os casos e documentos que ela criou continuam na agência.',
  },
  {
    grupo:    'Equipe',
    pergunta: 'Troquei para um plano com menos usuários. O que acontece?',
    resposta: 'A troca não é bloqueada: quem passou do novo limite fica como suspenso, e o titular escolhe em "Equipe" quem reativar dentro dos assentos disponíveis.',
  },
  {
    grupo:    'Equipe',
    pergunta: 'O usuário convidado também abre caso pelo WhatsApp?',
    resposta: 'Abre, pelo número que o titular cadastrou para ele em "Equipe" — é por esse número que identificamos de quem é a mensagem e a qual agência o caso pertence. Se o número mudar, quem atualiza é o titular, na tela de equipe.',
  },
  {
    grupo:    'Advogado & Suporte',
    pergunta: 'Como falo com um advogado sobre o caso?',
    resposta: 'Use "Solicitar defesa" — na tela de ações ou dentro do caso. A conversa segue pelo WhatsApp. No período gratuito há uma cota de solicitações.',
  },
  {
    grupo:    'Advogado & Suporte',
    pergunta: 'Quantas defesas o meu plano inclui?',
    resposta: `O Professional inclui 1 defesa com advogado por ano de assinatura e o Enterprise inclui 3, ambas disponíveis após a carência de ${CARENCIA_DEFESA_DIAS} dias prevista em contrato. O Essential não inclui defesa: você pode solicitar assim mesmo e o advogado passa um orçamento. A tela "Solicitar defesa" mostra quantas estão inclusas e quantas já foram utilizadas.`,
  },
  {
    grupo:    'Advogado & Suporte',
    pergunta: 'Quando uma defesa conta como utilizada?',
    resposta: 'Só quando o advogado confirma que atendeu — pedir não consome a defesa do plano. Muitas solicitações terminam numa orientação pelo WhatsApp, e nesse caso nada é descontado. Você acompanha a situação de cada pedido na tela "Solicitar defesa".',
  },
  {
    grupo:    'Advogado & Suporte',
    pergunta: 'Como falo com o suporte da plataforma?',
    resposta: 'Use o botão "Falar com o suporte" aqui no final desta página — ele abre uma conversa no WhatsApp com a nossa equipe.',
  },
  {
    grupo:    'Plano & Cobrança',
    pergunta: 'Qual a diferença entre os três planos?',
    resposta: 'Todos têm consultas ilimitadas à IA, base legal citada, geração de contratos e documentos e histórico completo. O que muda é o tamanho da equipe e a defesa com advogado: Essential, 1 usuário e defesa sob orçamento; Professional, 3 usuários e 1 defesa inclusa por ano; Enterprise, 5 usuários, 3 defesas inclusas e resposta humana em até 2h úteis. Os valores estão em "Planos".',
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
  {
    grupo:    'Plano & Cobrança',
    pergunta: 'Onde leio o contrato que aceitei?',
    resposta: 'O texto geral está sempre disponível na página do contrato, aberta no rodapé do site, no cadastro e na contratação. O que é da sua agência fica no perfil, na seção "Contrato": cada aceite aparece com data, versão e o Anexo I (dados da agência e do plano), com PDF individualizado para baixar.',
  },
  {
    grupo:    'Privacidade e dados',
    pergunta: 'Como excluo minha conta?',
    resposta: 'Vá em "Perfil", role até "Meus dados e privacidade" e clique em Excluir. Você precisa digitar EXCLUIR para confirmar. A exclusão é imediata e não tem como desfazer — recomendamos baixar seus dados antes. Só o titular pode excluir a conta.',
  },
  {
    grupo:    'Privacidade e dados',
    pergunta: 'O que é apagado quando excluo a conta?',
    resposta: 'O cadastro da agência, o acesso à plataforma de todos os usuários, todos os casos, análises, documentos gerados e mensagens, e os arquivos anexados. Se houver assinatura ativa, ela é cancelada — o tempo restante já pago não é reembolsado.',
  },
  {
    grupo:    'Privacidade e dados',
    pergunta: 'Fica guardado algum dado depois da exclusão?',
    resposta: 'Apenas os registros fiscais dos pagamentos, que a lei obriga a manter. Eles ficam sem vínculo com a sua agência, ou seja, sem dados pessoais — apenas o histórico da transação.',
  },
  {
    grupo:    'Privacidade e dados',
    pergunta: 'Posso baixar tudo o que tenho na plataforma?',
    resposta: 'Sim. Em "Perfil", na seção "Meus dados e privacidade", use "Baixar meus dados". Você recebe um arquivo com o cadastro, os casos, as análises, os documentos e as mensagens.',
  },
]
