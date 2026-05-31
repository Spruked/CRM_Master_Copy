import { KeyRound, RefreshCcw, Search, Sparkles } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { API_URL } from '@/lib/api'
import { openDesktopOrb } from '@/lib/orb-integration'

export function Topbar({ onTokenClick }: { onTokenClick: () => void }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-950 px-5">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative w-full max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
          <Input className="pl-9" placeholder="Search contacts, emails, pipeline..." />
        </div>
        <div className="hidden max-w-48 truncate rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-500 lg:block">
          Cali CRM · {API_URL}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => void queryClient.invalidateQueries()}>
          <RefreshCcw className="size-4" />
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            openDesktopOrb({ currentView: 'floating-orb' })
            navigate('/orb')
          }}
        >
          <Sparkles className="size-4" />
          ORB
        </Button>
        <Button variant="secondary" size="sm" onClick={onTokenClick}>
          <KeyRound className="size-4" />
          Token
        </Button>
      </div>
    </header>
  )
}
