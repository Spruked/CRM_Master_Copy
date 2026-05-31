import type { Contact, PipelineItem } from '@/types'

export interface CRMContextPayload {
  currentPath: string
  currentView: string
  user: string
  timestamp: string
  selectedContact?: Contact | null
  selectedPipelineItem?: PipelineItem | null
  pipelineSummary?: {
    total: number
    byStage: Record<string, number>
  }
  activeFilters?: Record<string, unknown>
  unreadEmails?: number
  highPriorityTasks?: number
  lastAction?: string
}

declare global {
  interface Window {
    __CALI_CRM_CONTEXT?: CRMContextPayload
  }
}

export const crmContext = {
  current: {
    currentPath: '/',
    currentView: 'dashboard',
    user: 'bryan@spruked.com',
    timestamp: new Date().toISOString(),
  } as CRMContextPayload,
}

export function updateCRMContext(payload: Partial<CRMContextPayload>) {
  const nextContext: CRMContextPayload = {
    ...crmContext.current,
    ...payload,
    timestamp: new Date().toISOString(),
  }

  crmContext.current = nextContext
  window.__CALI_CRM_CONTEXT = nextContext

  window.dispatchEvent(
    new CustomEvent('cali-crm-context-update', {
      detail: nextContext,
    }),
  )

  window.postMessage({ type: 'CALI_CRM_CONTEXT_UPDATE', payload: nextContext }, '*')
}

export function openDesktopOrb(payload: Partial<CRMContextPayload> = {}) {
  updateCRMContext({
    ...payload,
    lastAction: 'open_desktop_orb',
  })
  window.dispatchEvent(new CustomEvent('cali-crm-open-orb', { detail: crmContext.current }))
  window.postMessage({ type: 'OPEN_ORB', payload: crmContext.current }, '*')
}

export function getCRMContext() {
  return crmContext.current
}
