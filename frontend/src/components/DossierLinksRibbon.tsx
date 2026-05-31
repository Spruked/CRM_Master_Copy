import { useEffect, useState, type ReactNode } from 'react'
import { ExternalLink, Globe, Link2, MapPin, RefreshCcw, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import type { ExternalLinkRecord } from '@/types'

const PLATFORM_ICONS: Record<string, { icon: ReactNode; color: string }> = {
  google_search: { icon: <Search size={14} />, color: 'text-blue-400 hover:bg-blue-950/40' },
  google_maps: { icon: <MapPin size={14} />, color: 'text-emerald-400 hover:bg-emerald-950/40' },
  facebook: { icon: <Link2 size={14} />, color: 'text-indigo-400 hover:bg-indigo-950/40' },
  linkedin: { icon: <Link2 size={14} />, color: 'text-cyan-400 hover:bg-cyan-950/40' },
  github: { icon: <Link2 size={14} />, color: 'text-purple-400 hover:bg-purple-950/40' },
  domain_lookup: { icon: <Globe size={14} />, color: 'text-amber-400 hover:bg-amber-950/40' },
  company_website: { icon: <Globe size={14} />, color: 'text-zinc-400 hover:bg-zinc-800/40' },
  custom: { icon: <Link2 size={14} />, color: 'text-teal-400 hover:bg-teal-950/40' },
}

const STATUS_BADGES: Record<string, string> = {
  generated_search: 'border-amber-500/30 text-amber-500 bg-amber-950/20',
  detected: 'border-blue-500/30 text-blue-400 bg-blue-950/20',
  verified: 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20',
  manual: 'border-zinc-500/30 text-zinc-300 bg-zinc-800/20',
  broken: 'border-rose-500/30 text-rose-400 bg-rose-950/20',
}

export function DossierLinksRibbon({ contactId }: { contactId: string }) {
  const [links, setLinks] = useState<ExternalLinkRecord[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLinks = async () => {
    try {
      const response = await api.get(`/cali/contacts/${contactId}/external-links`)
      setLinks(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load dossier links'
      toast.error(message)
    }
  }

  const handleGenerate = async () => {
    setLoading(true)
    try {
      await api.post(`/cali/contacts/${contactId}/external-links/generate`)
      await fetchLinks()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generation error'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (event: React.MouseEvent, id: number) => {
    event.stopPropagation()
    event.preventDefault()
    if (!window.confirm('Sever link node from dossier?')) return
    try {
      await api.delete(`/cali/contacts/${contactId}/external-links/${id}`)
      await fetchLinks()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Deletion error'
      toast.error(message)
    }
  }

  const executeLink = (url: string) => {
    const shell = (window as Window & { electron?: { shell?: { openExternal?: (u: string) => void } } }).electron?.shell
    if (shell?.openExternal) {
      shell.openExternal(url)
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  useEffect(() => {
    if (!contactId) return
    fetchLinks()
  }, [contactId])

  return (
    <div className="w-full rounded border border-zinc-800 bg-zinc-950 p-3 font-mono">
      <div className="mb-2 flex items-center justify-between border-b border-zinc-800 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Dossier Execution Layer</span>
          <span className="rounded border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-500">{links.length} nodes indexed</span>
        </div>
        <Button variant="secondary" size="sm" disabled={loading} onClick={handleGenerate} className="h-7 text-[11px]">
          <RefreshCcw size={10} className={loading ? 'animate-spin' : ''} />
          Generate Fallbacks
        </Button>
      </div>

      {links.length === 0 ? (
        <div className="py-1 text-[11px] italic text-zinc-600">No identity verification pathways instantiated for this profile. Click generate to build fallbacks.</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {links.map((link) => {
            const display = PLATFORM_ICONS[link.platform] || PLATFORM_ICONS.custom
            return (
              <div
                key={link.id}
                onClick={() => executeLink(link.url)}
                className={`group flex cursor-pointer items-center gap-2 rounded border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-xs transition-all ${display.color}`}
                title={`Target: ${link.url}\nType: ${link.link_type}\nSource: ${link.source}`}
              >
                <div className="flex items-center gap-1.5">
                  {display.icon}
                  <span className="font-medium text-zinc-300">{link.label}</span>
                </div>
                <span className={`rounded border px-1 text-[9px] uppercase tracking-tighter ${STATUS_BADGES[link.verified_status] || STATUS_BADGES.manual}`}>
                  {String(link.verified_status || 'manual').replace('_', ' ')}
                </span>
                <ExternalLink size={10} className="opacity-40 group-hover:opacity-100" />
                <button
                  onClick={(event) => handleDelete(event, link.id)}
                  className="ml-1 text-zinc-600 opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
                  title="Purge Link Node"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
