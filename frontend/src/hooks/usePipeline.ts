import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Pipeline, PipelineItem } from '@/types'

type PipelineWithItems = Omit<Pipeline, 'leads'> & { leads: PipelineItem[] }

export const pipelineStages = [
  { id: 'prospect', label: 'Prospect', color: 'bg-slate-700' },
  { id: 'qualified', label: 'Qualified', color: 'bg-blue-700' },
  { id: 'contacted', label: 'Contacted', color: 'bg-cyan-500' },
  { id: 'meeting_scheduled', label: 'Meeting', color: 'bg-violet-600' },
  { id: 'proposal', label: 'Proposal', color: 'bg-indigo-600' },
  { id: 'won', label: 'Won', color: 'bg-teal-500' },
  { id: 'lost', label: 'Lost', color: 'bg-slate-500' },
] as const

export function usePipeline() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['pipeline'],
    queryFn: async () => {
      const response = await api.get('/cali/crm/pipeline')
      const data = response.data as Pipeline
      const leads = (data.leads || [])
        .filter((lead) => lead.id || lead.contact_id)
        .map((lead) => ({
          ...lead,
          id: String(lead.id || lead.contact_id),
          crm_stage: (lead.crm_stage || 'prospect') as PipelineItem['crm_stage'],
        }))
      return { ...data, leads } as PipelineWithItems
    },
  })

  const updateStage = useMutation({
    mutationFn: async ({
      contact_id,
      stage,
      next_follow_up_at,
      notes,
    }: {
      contact_id: string
      stage: string
      next_follow_up_at?: string | null
      notes?: string
    }) =>
      api.patch('/cali/crm/leads/stage', {
        contact_id,
        stage,
        next_follow_up_at,
        owner: 'bryan@spruked.com',
        notes: notes || 'Updated from Pipeline',
      }),
    onSuccess: async () => {
      toast.success('Pipeline updated')
      await queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      await queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
    onError: (error) => toast.error(error.message),
  })

  return {
    pipeline: query.data?.leads || [],
    summary: query.data,
    stages: pipelineStages,
    isLoading: query.isLoading,
    updateStage,
  }
}
