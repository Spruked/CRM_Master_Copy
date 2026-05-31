export type Contact = {
  id?: string
  contact_id?: string
  name: string
  type?: string
  contact_type?: string
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
  priority?: number
  crm_stage?: string | null
  lead_source?: string | null
  owner?: string | null
  last_contacted_at?: string | null
  next_follow_up_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export type PipelineStage =
  | 'prospect'
  | 'qualified'
  | 'contacted'
  | 'meeting_scheduled'
  | 'proposal'
  | 'won'
  | 'lost'

export type PipelineItem = Contact & {
  id: string
  crm_stage: PipelineStage
}

export type Pipeline = {
  stages: Record<string, number>
  total: number
  leads: Contact[]
}

export type EmailMessage = {
  id: number
  sender?: string
  recipient?: string
  subject?: string
  body_text?: string
  body?: string
  date?: string
  folder?: string
  read?: boolean
  starred?: boolean
  archived?: boolean
  message_id?: string
}

export type Activity = {
  id: string
  contact_id: string
  activity_type: string
  summary: string
  metadata?: Record<string, unknown>
  created_at?: string
}

export type ExternalLinkRecord = {
  id: number
  contact_id: string
  platform: string
  label: string
  url: string
  link_type: string
  verified_status: string
  source: string
  confidence_score: number
  last_checked_at: string
  created_at: string
  updated_at: string
}

export type UnifiedStatus = {
  crm_pipeline?: Pipeline
  crm_email_connector?: {
    configured?: boolean
    status?: string
    password_env_detected?: boolean
  }
  external_email?: {
    enabled?: boolean
    api_base?: string
    health?: Record<string, unknown>
  }
}
