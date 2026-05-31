import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Mail, Server, Users } from 'lucide-react'
import { ContextDebugPanel } from '@/components/ContextDebugPanel'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionHeader } from '@/components/SectionHeader'
import { api } from '@/lib/api'
import { updateCRMContext } from '@/lib/orb-integration'
import type { UnifiedStatus } from '@/types'

function StatCard({ title, value, detail, icon: Icon }: { title: string; value: string | number; detail: string; icon: typeof Server }) {
  const valueText = String(value)
  const valueClass = valueText.length > 11 ? 'text-2xl' : 'text-3xl'

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{detail}</CardDescription>
        </div>
        <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-900 text-zinc-400">
          <Icon className="size-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className={`${valueClass} break-words font-semibold leading-tight text-zinc-100`}>{value}</div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: async () => (await api.get('/health')).data as { status: string; service: string },
  })

  const status = useQuery({
    queryKey: ['crm-unified-status'],
    queryFn: async () => (await api.get('/cali/crm/unified/status')).data as UnifiedStatus,
  })

  const pipeline = status.data?.crm_pipeline
  const connector = status.data?.crm_email_connector
  const externalEmail = status.data?.external_email

  useEffect(() => {
    if (!pipeline) return
    updateCRMContext({
      currentView: 'dashboard',
      pipelineSummary: {
        total: pipeline.total,
        byStage: pipeline.stages,
      },
      lastAction: 'dashboard_status_loaded',
    })
  }, [pipeline])

  return (
    <div>
      <SectionHeader title="Pipeline Intelligence. Orbit Faster." detail="Your AI-powered revenue command center." />

      <div className="grid gap-4 lg:grid-cols-4">
        {health.isLoading ? (
          Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-36" />)
        ) : (
          <>
            <StatCard title="CRM API" value={health.data?.status || 'error'} detail={health.data?.service || 'health'} icon={Server} />
            <StatCard title="Pipeline Leads" value={pipeline?.total ?? 0} detail="active local leads" icon={Users} />
            <StatCard title="Email Bridge" value={externalEmail?.enabled ? 'enabled' : 'offline'} detail={externalEmail?.api_base || 'prime mail'} icon={Mail} />
            <StatCard title="Connector" value={connector?.status || 'unknown'} detail="CRM email connector" icon={Activity} />
          </>
        )}
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Snapshot</CardTitle>
            <CardDescription>Lead distribution by deterministic CRM stage.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {Object.entries(pipeline?.stages || {}).map(([stage, count]) => (
                <div key={stage} className="rounded-lg border border-zinc-800 bg-black/30 p-4">
                  <div className="text-xs uppercase text-zinc-500">{stage.replaceAll('_', ' ')}</div>
                  <div className="mt-2 text-2xl font-semibold text-zinc-100">{count}</div>
                </div>
              ))}
              {!pipeline ? <Skeleton className="h-24" /> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integration State</CardTitle>
            <CardDescription>Protected backend surfaces the frontend expects.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 p-3">
              <span className="text-sm text-zinc-400">CRM API</span>
              <Badge variant={health.data?.status === 'ok' ? 'success' : 'warning'}>{health.data?.status || 'unknown'}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 p-3">
              <span className="text-sm text-zinc-400">Prime Mail bridge</span>
              <Badge variant={externalEmail?.enabled ? 'success' : 'warning'}>{externalEmail?.enabled ? 'enabled' : 'disabled'}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-zinc-800 p-3">
              <span className="text-sm text-zinc-400">Admin auth</span>
              <Badge variant={status.isError ? 'warning' : 'success'}>{status.isError ? 'check token' : 'accepted'}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-5">
        <ContextDebugPanel />
      </div>
    </div>
  )
}
