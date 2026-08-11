import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, MailPlus, RefreshCcw, Search, Send, Star, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { SectionHeader } from '@/components/SectionHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Table, Td, Th } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api'
import { updateCRMContext } from '@/lib/orb-integration'
import { compactDate } from '@/lib/utils'
import type { EmailMessage } from '@/types'

const folders = ['inbox', 'sent', 'starred', 'archive', 'trash']
const primeMailUrl = String(import.meta.env.VITE_PRIME_MAIL_URL || 'http://127.0.0.1:19000').replace(/\/$/, '')

function extractEmail(value = '') {
  const angle = value.match(/<([^>]+)>/)
  if (angle?.[1]) return angle[1].trim().toLowerCase()
  const plain = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)
  return (plain?.[0] || '').trim().toLowerCase()
}

export default function Email() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [folder, setFolder] = useState('inbox')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<EmailMessage | null>(null)
  const [compose, setCompose] = useState({ to: '', subject: '', text: '' })

  const messagesQuery = useQuery({
    queryKey: ['external-email', folder, search],
    queryFn: async () => {
      const response = await api.get('/cali/crm/external-email/messages', {
        params: { folder, limit: 75, search: search || undefined },
      })
      return response.data as { emails?: EmailMessage[]; messages?: EmailMessage[]; total?: number }
    },
  })

  const messages = useMemo(() => messagesQuery.data?.emails || messagesQuery.data?.messages || [], [messagesQuery.data])
  const unreadEmails = useMemo(() => messages.filter((message) => !message.read).length, [messages])
  const selectedSenderEmail = extractEmail(selected?.sender || '')

  useEffect(() => {
    updateCRMContext({
      currentView: 'email',
      activeFilters: { folder, search },
      unreadEmails,
      lastAction: selected ? `selected_email:${selected.id}` : 'email_loaded',
      selectedEmail: selected,
    })
  }, [folder, search, unreadEmails, selected])

  const sync = useMutation({
    mutationFn: async () => api.post('/cali/crm/external-email/sync', { folder, limit: 75, search: search || undefined }),
    onSuccess: async (response) => {
      toast.success(`Synced ${response.data.processed ?? 0} messages`)
      await queryClient.invalidateQueries({ queryKey: ['external-email'] })
      await queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
    onError: (error) => toast.error(error.message),
  })

  const send = useMutation({
    mutationFn: async () => api.post('/cali/crm/external-email/send', compose),
    onSuccess: () => {
      toast.success('Send request submitted')
      setCompose({ to: '', subject: '', text: '' })
    },
    onError: (error) => toast.error(error.message),
  })

  const toggleStar = useMutation({
    mutationFn: async (message: EmailMessage) => api.patch(`/cali/crm/external-email/messages/${message.id}`, { starred: !message.starred }),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['external-email'] }),
    onError: (error) => toast.error(error.message),
  })

  function submitSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    send.mutate()
  }

  function openPrimeMail() {
    const params = new URLSearchParams()
    if (selected?.id) params.set('message', String(selected.id))
    if (selectedSenderEmail) params.set('contact', selectedSenderEmail)
    window.open(`${primeMailUrl}${params.toString() ? `/?${params}` : ''}`, '_blank', 'noopener,noreferrer')
  }

  function openSenderDossier() {
    if (!selectedSenderEmail) return
    navigate(`/contacts?email=${encodeURIComponent(selectedSenderEmail)}`)
  }

  return (
    <div>
      <SectionHeader
        title="Email"
        detail="PRIME MAIL surfaced inside CALI CRM for sync, triage, contact context, and outbound handoff."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={openPrimeMail}>
              <ExternalLink className="size-4" />
              Open PRIME MAIL
            </Button>
            <Button variant="primary" onClick={() => sync.mutate()} disabled={sync.isPending}>
              <RefreshCcw className="size-4" />
              Sync Mail
            </Button>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <Card className="min-w-0">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Mailbox</CardTitle>
                <div className="mt-1 text-xs text-zinc-500">{messages.length} loaded · {unreadEmails} unread</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={folder} onChange={(event) => setFolder(event.target.value)}>
                  {folders.map((item) => <option key={item} value={item}>{item}</option>)}
                </Select>
                <div className="relative w-72 max-w-full">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
                  <Input className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Sender, subject, body" />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {messages.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <thead>
                    <tr><Th></Th><Th>Sender</Th><Th>Subject</Th><Th>Folder</Th><Th>Date</Th></tr>
                  </thead>
                  <tbody>
                    {messages.map((message) => {
                      const isSelected = selected?.id === message.id
                      return (
                        <tr
                          key={message.id}
                          className={`cursor-pointer transition ${isSelected ? 'bg-blue-950/35 ring-1 ring-inset ring-blue-500/30' : 'hover:bg-zinc-900/40'}`}
                          onClick={() => setSelected(message)}
                        >
                          <Td>
                            <button type="button" onClick={(event) => { event.stopPropagation(); toggleStar.mutate(message) }}>
                              <Star className={message.starred ? 'size-4 fill-amber-300 text-amber-300' : 'size-4 text-zinc-600'} />
                            </button>
                          </Td>
                          <Td><div className="max-w-64 truncate">{message.sender || 'Unknown'}</div></Td>
                          <Td><div className="max-w-xl truncate font-medium text-zinc-100">{message.subject || '(no subject)'}</div></Td>
                          <Td><Badge variant="muted">{message.folder || folder}</Badge></Td>
                          <Td>{compactDate(message.date)}</Td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              </div>
            ) : (
              <EmptyState title="No mail loaded" detail="Sync or adjust the current folder/search filters." />
            )}
          </CardContent>
        </Card>

        <div className="flex min-w-0 flex-col gap-5">
          <div className="overflow-hidden rounded-xl border border-blue-500/25 bg-[#0d1528] shadow-xl shadow-black/20">
            <div className="border-b border-blue-500/20 bg-[#111d37] px-4 py-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-400">Mail Context</div>
              <div className="mt-1 text-xs text-zinc-500">PRIME MAIL ↔ CALI CRM</div>
            </div>
            <div className="p-4">
              {selected ? (
                <div className="flex flex-col gap-4 text-sm">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">From</div>
                    <div className="mt-1 break-all text-zinc-200">{selected.sender || 'Unknown'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Subject</div>
                    <div className="mt-1 text-zinc-100">{selected.subject || '(no subject)'}</div>
                  </div>
                  <div className="max-h-72 overflow-y-auto rounded-lg border border-zinc-800 bg-black/30 p-3 leading-6 text-zinc-400">
                    {selected.body_text || selected.body || 'No body preview.'}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="primary" onClick={openPrimeMail}>
                      <ExternalLink className="size-4" />
                      PRIME MAIL
                    </Button>
                    <Button variant="secondary" onClick={openSenderDossier} disabled={!selectedSenderEmail}>
                      <UserRound className="size-4" />
                      Dossier
                    </Button>
                  </div>
                </div>
              ) : (
                <EmptyState title="Select a message" detail="The selected sender becomes available as CRM dossier context." />
              )}
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle>Send Email</CardTitle></CardHeader>
            <CardContent>
              <form className="flex flex-col gap-3" onSubmit={submitSend}>
                <Input required type="email" value={compose.to} onChange={(event) => setCompose({ ...compose, to: event.target.value })} placeholder="To" />
                <Input required value={compose.subject} onChange={(event) => setCompose({ ...compose, subject: event.target.value })} placeholder="Subject" />
                <Textarea required value={compose.text} onChange={(event) => setCompose({ ...compose, text: event.target.value })} placeholder="Message" />
                <Button variant="primary" disabled={send.isPending}>
                  <Send className="size-4" />
                  Send
                </Button>
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <MailPlus className="size-4" />
                  Outbound routes through the configured PRIME MAIL bridge.
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
