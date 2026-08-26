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
