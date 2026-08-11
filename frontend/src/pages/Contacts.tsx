import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CalendarDays, ExternalLink, Mail, Plus, Search, UserRound } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { DossierLinksRibbon } from '@/components/DossierLinksRibbon'
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
import { compactDate, initials } from '@/lib/utils'
import type { Contact } from '@/types'

const contactTypes = ['business', 'investor', 'marketing', 'promoter', 'personal', 'financial']
const stages = ['prospect', 'qualified', 'contacted', 'meeting_scheduled', 'proposal', 'won', 'lost', 'active']

const primeMailUrl = String(import.meta.env.VITE_PRIME_MAIL_URL || 'http://127.0.0.1:19000').replace(/\/$/, '')

function field(value?: string | null, fallback = '—') {
  return value && String(value).trim() ? value : fallback
}

export default function Contacts() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [contactType, setContactType] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', type: 'business', stage: 'prospect', notes: '' })

  const contactsQuery = useQuery({
    queryKey: ['contacts', query, contactType],
    queryFn: async () => {
      const response = await api.get('/cali/contacts', {
        params: { query: query || undefined, contact_type: contactType || undefined },
      })
      return response.data as { contacts: Contact[]; count: number }
    },
  })

  const contacts = useMemo(() => contactsQuery.data?.contacts || [], [contactsQuery.data?.contacts])

  useEffect(() => {
    const requestedEmail = searchParams.get('email')?.trim().toLowerCase()
    if (!requestedEmail || selectedContact) return
    const match = contacts.find((contact) => contact.email?.trim().toLowerCase() === requestedEmail)
    if (match) {
      setSelectedContact(match)
      setShowAddForm(false)
    }
  }, [contacts, searchParams, selectedContact])

  useEffect(() => {
    updateCRMContext({
      currentView: 'contacts',
      activeFilters: { search: query, type: contactType || 'all' },
      selectedContact,
      lastAction: selectedContact?.id ? `dossier:${selectedContact.id}` : 'contacts_directory',
    })
  }, [query, contactType, selectedContact])

  const createContact = useMutation({
    mutationFn: async () =>
      api.post('/cali/contacts', {
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        contact_type: form.type,
        crm_stage: form.stage,
        notes: form.notes || undefined,
        priority: form.type === 'investor' ? 3 : 1,
        owner: 'bryan@spruked.com',
      }),
    onSuccess: async (response) => {
      toast.success('Contact added')
      setForm({ name: '', email: '', phone: '', type: 'business', stage: 'prospect', notes: '' })
      setShowAddForm(false)
      await queryClient.invalidateQueries({ queryKey: ['contacts'] })
      await queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      const created = response.data as Contact
      if (created?.id || created?.email) setSelectedContact(created)
    },
    onError: (error) => toast.error(error.message),
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    createContact.mutate()
  }

  function selectContact(contact: Contact) {
    setSelectedContact(contact)
    setShowAddForm(false)
  }

  function openPrimeMail(contact: Contact) {
    const url = contact.email
      ? `${primeMailUrl}/?contact=${encodeURIComponent(contact.email)}`
      : primeMailUrl
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function openCalendar(contact: Contact) {
    const params = new URLSearchParams()
    if (contact.id) params.set('contact_id', String(contact.id))
    if (contact.name) params.set('contact', contact.name)
    navigate(`/calendar${params.toString() ? `?${params}` : ''}`)
  }

  const selectedType = selectedContact?.type || selectedContact?.contact_type || 'contact'
  const selectedStage = selectedContact?.crm_stage || 'active'

  return (
    <div>
      <SectionHeader
        title="Contacts"
        detail="Canonical contact dossiers shared with PRIME MAIL, pipeline, calendar, activities, and ORB context."
        action={
          <Button
            variant="primary"
            onClick={() => {
              setSelectedContact(null)
              setShowAddForm(true)
            }}
          >
            <Plus className="size-4" />
            Add contact
          </Button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <Card className="min-w-0">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Directory</CardTitle>
                <div className="mt-1 text-xs text-zinc-500">{contactsQuery.data?.count ?? contacts.length} indexed contacts</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative w-72 max-w-full">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
                  <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, notes" />
                </div>
                <Select value={contactType} onChange={(event) => setContactType(event.target.value)}>
                  <option value="">All types</option>
                  {contactTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {contacts.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <thead>
                    <tr>
                      <Th>Name</Th>
                      <Th>Type</Th>
                      <Th>Stage</Th>
                      <Th>Email</Th>
                      <Th>Follow-up</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((contact) => {
                      const selected = selectedContact && String(selectedContact.id || selectedContact.email) === String(contact.id || contact.email)
                      return (
                        <tr
                          key={contact.id || contact.email || contact.name}
                          className={`cursor-pointer transition ${selected ? 'bg-blue-950/35 ring-1 ring-inset ring-blue-500/30' : 'hover:bg-zinc-900/40'}`}
                          onClick={() => selectContact(contact)}
                        >
                          <Td>
                            <div className="flex items-center gap-3">
                              <div className={`flex size-9 items-center justify-center rounded-lg text-xs font-semibold ${selected ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-300'}`}>
                                {initials(contact.name)}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate font-medium text-zinc-100">{contact.name}</div>
                                <div className="truncate text-xs text-zinc-500">{contact.phone || 'No phone'}</div>
                              </div>
                            </div>
                          </Td>
                          <Td><Badge>{contact.type || contact.contact_type || 'contact'}</Badge></Td>
                          <Td><Badge variant="muted">{contact.crm_stage || 'active'}</Badge></Td>
                          <Td><div className="max-w-64 truncate">{contact.email || 'No email'}</div></Td>
                          <Td>{compactDate(contact.next_follow_up_at)}</Td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              </div>
            ) : (
              <EmptyState title="No contacts found" detail="Add accounts or adjust the current filters." />
            )}
          </CardContent>
        </Card>

        <div className="min-w-0">
          {showAddForm ? (
            <Card>
              <CardHeader>
                <CardTitle>New Contact</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="flex flex-col gap-3" onSubmit={submit}>
                  <Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Name" />
                  <Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email" type="email" />
                  <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Phone" />
                  <Select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
                    {contactTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </Select>
                  <Select value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value })}>
                    {stages.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
                  </Select>
                  <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Notes" />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)}>Cancel</Button>
                    <Button variant="primary" disabled={createContact.isPending}>
                      <Plus className="size-4" />
                      Add contact
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : selectedContact ? (
            <div className="overflow-hidden rounded-xl border border-blue-500/25 bg-[#0d1528] shadow-2xl shadow-black/20">
              <div className="border-b border-blue-500/20 bg-[#111d37] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-400">Contact Dossier</div>
                    <div className="mt-1 text-xs text-zinc-500">CALI CRM · shared context surface</div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => window.open(window.location.href, '_blank', 'noopener,noreferrer')}>
                    <ExternalLink className="size-3.5" />
                    Pop out
                  </Button>
                </div>
              </div>

              <div className="max-h-[calc(100vh-15rem)] overflow-y-auto p-4">
                <div className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950/55 p-4">
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-lg font-bold text-white">
                    {initials(selectedContact.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-xl font-semibold text-white">{selectedContact.name}</h2>
                    <div className="mt-1 truncate text-sm text-zinc-400">{field(selectedContact.email, 'No email')}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge>{selectedType}</Badge>
                      <Badge variant="muted">{selectedStage}</Badge>
                      {selectedContact.priority && selectedContact.priority > 1 ? <Badge>priority {selectedContact.priority}</Badge> : null}
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.15em] text-blue-400">Contact</div>
                <div className="mt-2 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/45 text-sm">
                  <div className="grid grid-cols-[7rem_1fr] gap-3 border-b border-zinc-800 px-3 py-2.5"><span className="text-zinc-500">Email</span><span className="break-all text-zinc-200">{field(selectedContact.email)}</span></div>
                  <div className="grid grid-cols-[7rem_1fr] gap-3 border-b border-zinc-800 px-3 py-2.5"><span className="text-zinc-500">Phone</span><span className="text-zinc-200">{field(selectedContact.phone)}</span></div>
                  <div className="grid grid-cols-[7rem_1fr] gap-3 px-3 py-2.5"><span className="text-zinc-500">Address</span><span className="text-zinc-200">{field(selectedContact.address)}</span></div>
                </div>

                <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.15em] text-blue-400">CRM Status</div>
                <div className="mt-2 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/45 text-sm">
                  <div className="grid grid-cols-[7rem_1fr] gap-3 border-b border-zinc-800 px-3 py-2.5"><span className="text-zinc-500">Pipeline</span><span className="text-zinc-200">{selectedStage}</span></div>
                  <div className="grid grid-cols-[7rem_1fr] gap-3 border-b border-zinc-800 px-3 py-2.5"><span className="text-zinc-500">Last contact</span><span className="text-zinc-200">{compactDate(selectedContact.last_contacted_at)}</span></div>
                  <div className="grid grid-cols-[7rem_1fr] gap-3 border-b border-zinc-800 px-3 py-2.5"><span className="text-zinc-500">Follow-up</span><span className="text-zinc-200">{compactDate(selectedContact.next_follow_up_at)}</span></div>
                  <div className="grid grid-cols-[7rem_1fr] gap-3 px-3 py-2.5"><span className="text-zinc-500">Owner</span><span className="text-zinc-200">{field(selectedContact.owner)}</span></div>
                </div>

                {selectedContact.notes ? (
                  <>
                    <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.15em] text-blue-400">Notes</div>
                    <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950/45 p-3 text-sm leading-6 text-zinc-300">{selectedContact.notes}</div>
                  </>
                ) : null}

                {selectedContact.id ? (
                  <div className="mt-4">
                    <DossierLinksRibbon contactId={String(selectedContact.id)} />
                  </div>
                ) : null}

                <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.15em] text-blue-400">Quick Actions</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button variant="primary" onClick={() => openPrimeMail(selectedContact)} disabled={!selectedContact.email}>
                    <Mail className="size-4" />
                    PRIME MAIL
                  </Button>
                  <Button variant="secondary" onClick={() => openCalendar(selectedContact)}>
                    <CalendarDays className="size-4" />
                    Calendar
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-blue-500/20 bg-[#111d37] px-4 py-3 text-[10px] text-zinc-500">
                <span>Mail · CRM · Calendar · ORB context</span>
                <span className="flex items-center gap-1.5 font-bold text-emerald-400"><span className="size-1.5 rounded-full bg-emerald-400" /> LINKED</span>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent>
                <div className="flex min-h-80 flex-col items-center justify-center text-center">
                  <div className="flex size-14 items-center justify-center rounded-xl bg-zinc-900 text-zinc-500"><UserRound className="size-6" /></div>
                  <div className="mt-4 font-medium text-zinc-200">Select a contact dossier</div>
                  <div className="mt-1 max-w-64 text-sm text-zinc-500">The selected contact becomes the shared context for CRM, PRIME MAIL, Calendar, Activities, and the ORB.</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
