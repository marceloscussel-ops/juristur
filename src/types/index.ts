export type CaseStatus = 'em_analise' | 'concluido' | 'arquivado'
export type CaseOrigin = 'web' | 'whatsapp'
export type AgencyPlan = 'free' | 'basic' | 'pro'

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
  id:         string
  name:       string
  cnpj:       string
  email:      string
  phone:      string | null
  plan:       AgencyPlan
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
  created_at:   string
  case_analyses?: CaseAnalysis[]
  case_files?:    CaseFile[]
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

export interface CaseAnalysis {
  id:          string
  case_id:     string
  ai_response: string
  tokens_used: number | null
  created_at:  string
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
