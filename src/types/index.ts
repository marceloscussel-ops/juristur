import type { AceiteEvento, AnexoI } from '@/lib/contrato/termos'

export type CaseStatus = 'em_analise' | 'concluido' | 'arquivado'
export type CaseOrigin = 'web' | 'whatsapp'
export type AgencyPlan = 'free' | 'essencial' | 'profissional' | 'enterprise'
export type SubscriptionStatus = 'trial' | 'active' | 'expired' | 'canceled'
export type BillingCycle = 'mensal' | 'anual'
export type PaymentMethod = 'card' | 'pix' | 'boleto'

/**
 * Máximo de perguntas de acompanhamento (follow-up) permitidas por caso.
 * Evita conversas infinitas e controla o custo por caso. Vale para web e WhatsApp.
 */
export const MAX_FOLLOWUP_QUESTIONS = 5

/** Tamanho máximo do complemento (ressalva) que a agência pode adicionar a um caso. */
export const MAX_COMPLEMENT_LENGTH = 2000

export type CaseCategory =
  | 'Cancelamento de pacote pelo cliente'
  | 'Cancelamento de pacote pelo fornecedor'
  | 'Overbooking (hotel ou aéreo)'
  | 'Acidente ou incidente durante o serviço'
  | 'Disputa com operadora'
  | 'Reclamação de cliente (Procon / Reclame Aqui)'
  | 'Questão trabalhista'
  | 'Contrato com fornecedor'
  | 'Outro'

export const CASE_CATEGORIES: CaseCategory[] = [
  'Cancelamento de pacote pelo cliente',
  'Cancelamento de pacote pelo fornecedor',
  'Overbooking (hotel ou aéreo)',
  'Acidente ou incidente durante o serviço',
  'Disputa com operadora',
  'Reclamação de cliente (Procon / Reclame Aqui)',
  'Questão trabalhista',
  'Contrato com fornecedor',
  'Outro',
]

export interface Agency {
  id:                  string
  name:                string
  cnpj:                string
  email:               string
  phone:               string | null
  plan:                AgencyPlan
  subscription_status: SubscriptionStatus
  trial_ends_at:       string | null
  created_at:          string
  asaas_customer_id?:     string | null
  asaas_subscription_id?: string | null
  asaas_payment_id?:      string | null
  billing_cycle?:         BillingCycle | null
  access_until?:          string | null
  /** Primeira ativação do plano pago: âncora do ano de assinatura e da carência. */
  plan_started_at?:       string | null
}

export interface CaseMessage {
  id:         string
  case_id:    string
  role:       'user' | 'assistant'
  content:    string
  created_at: string
}

export interface Case {
  id:           string
  agency_id:    string
  title:        string | null
  description:  string
  category:     CaseCategory
  status:       CaseStatus
  origin:       CaseOrigin
  escalated_at: string | null
  complement:      string | null
  complemented_at: string | null
  /** Usuário da agência que registrou (null nos casos anteriores à equipe). */
  created_by:   string | null
  created_at:   string
  case_analyses?:  CaseAnalysis[]
  case_files?:     CaseFile[]
  case_messages?:  CaseMessage[]
}

export interface CaseFile {
  id:             string
  case_id:        string
  file_url:       string
  file_name:      string
  file_type:      string
  extracted_text: string | null
  created_at:     string
}

export type ReviewStatus = 'pending' | 'approved' | 'revision_requested'

/** Severidade/risco do caso, classificada pela IA. */
export type Severity = 'leve' | 'medio' | 'elevado' | 'elevadissimo'

export interface CaseAnalysis {
  id:            string
  case_id:       string
  ai_response:   string
  tokens_used:   number | null
  review_status: ReviewStatus
  severity:      Severity | null
  lawyer_notes:  string | null
  reviewed_at:   string | null
  from_complement: boolean
  created_at:    string
}

export interface LawyerSettings {
  id:           number
  auto_approve: boolean
  lawyer_phone: string | null
  updated_at:   string
}

export interface LawyerCase {
  id:          string
  title:       string | null
  description: string
  category:    CaseCategory
  status:      CaseStatus
  origin:      CaseOrigin
  created_at:  string
  agency_name: string
  analysis_id:    string
  ai_response:    string
  review_status:  ReviewStatus
  lawyer_notes:   string | null
  analysis_created_at: string
}

export interface WhatsappSession {
  id:            string
  agency_id:     string
  phone:         string
  current_state: WhatsappState
  case_id:       string | null
  session_data:  Record<string, unknown>
  updated_at:    string
}

export type WhatsappState =
  | 'awaiting_category'
  | 'awaiting_description'
  | 'awaiting_files'
  | 'processing'
  | 'follow_up'
  | 'completed'

export interface RagCase {
  id:                     string
  category:               string
  problem_description:    string
  applicable_laws:        string[] | null
  analysis:               string
  recommended_resolution: string
  actual_outcome:         string | null
  created_at:             string
}

// ─── Documentos gerados (contratos e outros) ──────────────────────────────────

/**
 * As ações oferecidas na tela inicial. `duvida` é o fluxo de casos já existente;
 * `contrato` e `documento` geram documentos; `defesa` é a escalada para um
 * advogado (antes "falar com um advogado").
 */
export type ActionKind = 'contrato' | 'documento' | 'duvida' | 'defesa'

/** Natureza do documento gerado. `contrato` parte de um modelo base. */
export type DocumentKind = 'contrato' | 'outro'

export type DocumentStatus = 'rascunho' | 'confirmado' | 'arquivado'

/** Tipos sugeridos para "outros documentos" (campo livre, estes são atalhos). */
export const DOCUMENT_TYPES = [
  'E-mail ao cliente',
  'E-mail ao fornecedor',
  'Termo de ciência',
  'Formalização financeira',
  'Notificação extrajudicial',
  'Declaração',
  'Outro',
] as const

export type DocumentType = (typeof DOCUMENT_TYPES)[number]

/**
 * Dados do consumidor usados para preencher o contrato. Todos opcionais: a
 * agência pode gerar um contrato com lacunas para preencher à mão depois.
 */
export interface ClientData {
  nome?:          string
  nacionalidade?: string
  cpf?:           string
  rg?:            string
  endereco?:      string
  email?:         string
  telefone?:      string
  /** Campos extras que a IA extraiu e não se encaixam acima. */
  [key: string]: string | undefined
}

export interface AgencyDocument {
  id:          string
  agency_id:   string
  kind:        DocumentKind
  template_id: string | null
  doc_type:    string | null
  title:       string | null
  prompt:      string | null
  client_data: ClientData
  content:     string | null
  status:      DocumentStatus
  tokens_used: number | null
  /** Usuário da agência que gerou (null nos documentos anteriores à equipe). */
  created_by:  string | null
  created_at:  string
  updated_at:  string
  document_files?: DocumentFile[]
}

export interface DocumentFile {
  id:             string
  document_id:    string
  file_url:       string
  file_name:      string
  file_type:      string
  extracted_text: string | null
  created_at:     string
}

/**
 * Linha do painel unificado: casos e documentos na mesma lista, ordenados por
 * data. `kind` diz de qual tabela veio e qual rótulo mostrar.
 */
export interface PanelItem {
  id:         string
  kind:       'duvida' | 'contrato' | 'documento'
  title:      string
  subtitle:   string
  href:       string
  status:     CaseStatus | DocumentStatus
  severity:   Severity | null
  /** Nome de quem registrou, quando a agência tem mais de um usuário. */
  autor:      string | null
  created_at: string
}

// ─── Aceite do contrato ───────────────────────────────────────────────────────

/**
 * Registro de um aceite do contrato de licença de uso. Cada linha é um ato
 * (cadastro, assinatura ou renovação) e nunca é atualizada: `anexo` e
 * `contract_text` guardam o contrato individualizado como estava no aceite.
 */
export interface ContractAcceptance {
  id:            string
  agency_id:     string
  version:       string
  event:         AceiteEvento
  anexo:         AnexoI
  contract_text: string | null
  ip:            string | null
  user_agent:    string | null
  accepted_at:   string
}

// ─── Defesas (escalonamento para advogado) ────────────────────────────────────

/** De onde partiu a solicitação. `advogado` = lançada pelo próprio advogado. */
export type DefenseOrigin = 'web' | 'whatsapp' | 'advogado'

/**
 * Natureza do escalonamento, conforme o Parágrafo Primeiro da Cláusula
 * Terceira do contrato: contrato, defesa em processo, audiência ou peça.
 */
export type DefenseKind = 'contrato' | 'defesa' | 'audiencia' | 'peca' | 'outro'

export const DEFENSE_KIND_LABELS: Record<DefenseKind, string> = {
  contrato:  'Elaboração de contrato',
  defesa:    'Defesa em processo',
  audiencia: 'Acompanhamento em audiência',
  peca:      'Peça jurídica',
  outro:     'Outro',
}

/**
 * `solicitada` está na fila do advogado; `utilizada` foi confirmada por ele
 * (e é o que desconta da cota do plano); `descartada` não gerou atendimento.
 */
export type DefenseStatus = 'solicitada' | 'utilizada' | 'descartada'

export const DEFENSE_STATUS_LABELS: Record<DefenseStatus, string> = {
  solicitada: 'Aguardando o advogado',
  utilizada:  'Defesa utilizada',
  descartada: 'Não utilizada',
}

/**
 * Solicitação de defesa. A agência cria; o advogado decide se foi realmente
 * utilizada. `consumes_quota` separa a defesa inclusa no plano daquela que foi
 * atendida mas cobrada à parte.
 */
export interface DefenseRequest {
  id:             string
  agency_id:      string
  case_id:        string | null
  origin:         DefenseOrigin
  kind:           DefenseKind
  status:         DefenseStatus
  consumes_quota: boolean
  subject:        string | null
  lawyer_notes:   string | null
  requested_at:   string
  used_at:        string | null
  decided_at:     string | null
  decided_by:     string | null
  plan_at_use:    string | null
  created_at:     string
}
