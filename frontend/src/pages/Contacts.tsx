import { type ChangeEvent, type FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  Check,
  ExternalLink,
  Link2,
  Mail,
  Network,
  Plus,
  RefreshCw,
  ScanSearch,
  Search,
  ShieldQuestion,
  Target,
  Trash2,
  Upload,
  UserRound,
  X,
} from 'lucide-react'
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
import { useBusinessContext } from '@/providers/BusinessContextProvider'
import type { BusinessRole, Contact, DossierMedia } from '@/types'

const relationshipTypes = [
  'personal',
  'family',
  'professional',
  'business',
  'vendor',
  'partner',
  'service_provider',
  'legal',
  'financial',
  'medical',
  'community',
  'other',
]

const salesStages = ['prospect', 'qualified', 'contacted', 'meeting_scheduled', 'proposal', 'won', 'lost']
const mediaKinds = ['person', 'place', 'building', 'other'] as const
const primeMailUrl = String(import.meta.env.VITE_PRIME_MAIL_URL || 'http://127.0.0.1:19000').replace(/\/$/, '')

function field(value?: string | null, fallback = '—') {
  return value && String(value).trim() ? value : fallback
}

function formatPercent(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return `${Math.round(Number(value) * 100)}%`
}

type ConnectionItem = {
  edge_id?: string
  candidate_id?: string
  other_party?: string
  other_name?: string
  predicate?: string
  confidence?: number
  edge_kind?: 'verified' | 'candidate'
  rationale?: string
}

type ConnectionsResponse = {
  party_id: string
  verified: ConnectionItem[]
  candidates: ConnectionItem[]
  latest_relevance?: {
    relevance_score?: number
    connection_strength?: number
    degrees?: number | null
    factors?: string
    rationale?: string
  } | null
}

export default function Contacts() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { businessScope, activeBusiness } = useBusinessContext()
  const [query, setQuery] = useState('')
  const [relationshipType, setRelationshipType] = useState('')
  const [segment, setSegment] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [salesContact, setSalesContact] = useState(false)
  const [roleDraft, setRoleDraft] = useState('')
  const [segmentDraft, setSegmentDraft] = useState('')
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'professional',
    stage: '',
    notes: '',
    relationship: '',
    segments: '',
  })
  const [mediaDraft, setMediaDraft] = useState({
    media_kind: 'person',
    label: '',
    image_url: '',
    notes: '',
    is_primary: false,
  })

  const contactsQuery = useQuery({
    queryKey: ['contacts-intelligence', query, relationshipType, segment, businessScope],
    queryFn: async () => {
      const response = await api.get('/cali/intelligence/contacts', {
        params: {
          query: query || undefined,
          business_scope: businessScope,
          segment: segment || undefined,
        },
      })
      return response.data as { contacts: Contact[]; count: number }
    },
  })

  const segmentsQuery = useQuery({
    queryKey: ['contact-segments', businessScope],
    queryFn: async () => {
      const response = await api.get('/cali/intelligence/segments', {
        params: { business_scope: businessScope },
      })
      return response.data as { segments: Array<{ name: string; count: number }> }
    },
  })

  const contacts = useMemo(() => {
    const all = contactsQuery.data?.contacts || []
    if (!relationshipType) return all
    return all.filter((contact) => (contact.type || contact.contact_type || '').toLowerCase() === relationshipType)
  }, [contactsQuery.data?.contacts, relationshipType])

  const connectionsQuery = useQuery({
    queryKey: ['contact-connections', selectedContact?.party_id, businessScope],
    enabled: Boolean(selectedContact?.party_id),
    queryFn: async () => {
      const response = await api.get(`/cali/intelligence/parties/${encodeURIComponent(String(selectedContact?.party_id))}/connections`, {
        params: { business_scope: businessScope },
      })
      return response.data as ConnectionsResponse
    },
  })

  const mediaQuery = useQuery({
    queryKey: ['contact-media', selectedContact?.id],
    enabled: Boolean(selectedContact?.id),
    queryFn: async () => {
      const response = await api.get(`/cali/intelligence/contacts/${encodeURIComponent(String(selectedContact?.id))}/media`)
      return response.data as { media: DossierMedia[]; count: number }
    },
  })

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
    if (!selectedContact || businessScope === 'all') {
      setRoleDraft('')
      setSegmentDraft('')
      return
    }
    const role = selectedContact.business_roles?.find((item) => item.business_id === businessScope)
    setRoleDraft(role?.role || '')
    setSegmentDraft((role?.segment_tags || []).join(', '))
  }, [selectedContact, businessScope])

  useEffect(() => {
    updateCRMContext({
      currentView: 'contacts',
      activeFilters: {
        search: query,
        type: relationshipType || 'all',
        segment: segment || 'all',
        businessScope,
      },
      selectedContact,
      lastAction: selectedContact?.id ? `dossier:${selectedContact.id}` : 'contacts_directory',
    })
  }, [query, relationshipType, segment, businessScope, selectedContact])

  const createContact = useMutation({
    mutationFn: async () => {
      const response = await api.post('/cali/contacts', {
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        contact_type: form.type,
        crm_stage: salesContact ? form.stage || 'prospect' : undefined,
        notes: form.notes || undefined,
        priority: 1,
        owner: 'bryan@spruked.com',
      })
      return response.data as Contact
    },
    onSuccess: async (created) => {
      const contactId = created?.id || created?.contact_id
      if (businessScope !== 'all' && contactId) {
        await api.post(`/cali/intelligence/contacts/${encodeURIComponent(String(contactId))}/business-role`, {
          business_id: businessScope,
          role: form.relationship || undefined,
          segment_tags: form.segments.split(',').map((item) => item.trim()).filter(Boolean),
          visibility: 'scoped',
        })
      }
      toast.success('Dossier created')
      setForm({ name: '', email: '', phone: '', type: 'professional', stage: '', notes: '', relationship: '', segments: '' })
      setSalesContact(false)
      setShowAddForm(false)
      await queryClient.invalidateQueries({ queryKey: ['contacts-intelligence'] })
      await queryClient.invalidateQueries({ queryKey: ['contact-segments'] })
      await queryClient.invalidateQueries({ queryKey: ['pipeline'] })
      setSelectedContact(created)
    },
    onError: (error) => toast.error(error.message),
  })

  const saveBusinessRole = useMutation({
    mutationFn: async () => {
      if (!selectedContact?.id || businessScope === 'all') throw new Error('Select a business context first')
      return api.post(`/cali/intelligence/contacts/${encodeURIComponent(String(selectedContact.id))}/business-role`, {
        business_id: businessScope,
        role: roleDraft || undefined,
        segment_tags: segmentDraft.split(',').map((item) => item.trim()).filter(Boolean),
        visibility: 'scoped',
      })
    },
    onSuccess: async () => {
      toast.success('Compartment scope saved')
      await queryClient.invalidateQueries({ queryKey: ['contacts-intelligence'] })
      await queryClient.invalidateQueries({ queryKey: ['contact-segments'] })
    },
    onError: (error) => toast.error(error.message),
  })

  const scanConnections = useMutation({
    mutationFn: async () => api.post('/cali/intelligence/scan', null, { params: { business_scope: businessScope } }),
    onSuccess: async (response) => {
      const count = Number(response.data?.candidates_written || 0)
      toast.success(`Connection scan completed · ${count} candidate associations processed`)
      await queryClient.invalidateQueries({ queryKey: ['contact-connections'] })
    },
    onError: (error) => toast.error(error.message),
  })

  const recalculateRelevance = useMutation({
    mutationFn: async () => {
      if (!selectedContact?.party_id) throw new Error('Canonical party id is not available yet')
      return api.post(`/cali/intelligence/parties/${encodeURIComponent(selectedContact.party_id)}/relevance/recalculate`, {
        business_scope: businessScope,
      })
    },
    onSuccess: async (response) => {
      toast.success(`Relevance recalculated · ${Math.round(Number(response.data?.relevance_score || 0))}`)
      await queryClient.invalidateQueries({ queryKey: ['contact-connections'] })
      await queryClient.invalidateQueries({ queryKey: ['contacts-intelligence'] })
    },
    onError: (error) => toast.error(error.message),
  })

  const reviewCandidate = useMutation({
    mutationFn: async ({ candidateId, decision }: { candidateId: string; decision: 'accept' | 'reject' }) =>
      api.post(`/cali/intelligence/candidates/${encodeURIComponent(candidateId)}/review`, { decision }),
    onSuccess: async (_, variables) => {
      toast.success(variables.decision === 'accept' ? 'Connection verified' : 'Connection rejected')
      await queryClient.invalidateQueries({ queryKey: ['contact-connections'] })
    },
    onError: (error) => toast.error(error.message),
  })

  const addMedia = useMutation({
    mutationFn: async () => {
      if (!selectedContact?.id) throw new Error('Select a dossier first')
      return api.post(`/cali/intelligence/contacts/${encodeURIComponent(String(selectedContact.id))}/media`, mediaDraft)
    },
    onSuccess: async () => {
      toast.success('Image vault item added')
      setMediaDraft({ media_kind: 'person', label: '', image_url: '', notes: '', is_primary: false })
      await queryClient.invalidateQueries({ queryKey: ['contact-media', selectedContact?.id] })
    },
    onError: (error) => toast.error(error.message),
  })

  const setPrimaryMedia = useMutation({
    mutationFn: async (mediaId: string) => {
      if (!selectedContact?.id) throw new Error('Select a dossier first')
      return api.post(`/cali/intelligence/contacts/${encodeURIComponent(String(selectedContact.id))}/media/${encodeURIComponent(mediaId)}/primary`)
    },
    onSuccess: async () => {
      toast.success('Primary dossier image set')
      await queryClient.invalidateQueries({ queryKey: ['contact-media', selectedContact?.id] })
    },
    onError: (error) => toast.error(error.message),
  })

  const deleteMedia = useMutation({
    mutationFn: async (mediaId: string) => {
      if (!selectedContact?.id) throw new Error('Select a dossier first')
      return api.delete(`/cali/intelligence/contacts/${encodeURIComponent(String(selectedContact.id))}/media/${encodeURIComponent(mediaId)}`)
    },
    onSuccess: async () => {
      toast.success('Image vault item removed')
      await queryClient.invalidateQueries({ queryKey: ['contact-media', selectedContact?.id] })
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
  const selectedStage = selectedContact?.crm_stage
  const relevance = connectionsQuery.data?.latest_relevance || selectedContact?.relevance
  const verifiedConnections = connectionsQuery.data?.verified || []
  const candidateConnections = connectionsQuery.data?.candidates || []
  const selectedBusinessRole: BusinessRole | undefined = businessScope === 'all'
    ? undefined
    : selectedContact?.business_roles?.find((item) => item.business_id === businessScope)

  return (
    <div>
      <SectionHeader
        title="Dossier Vault"
        detail="Canonical subjects with compartment scope, signal history, associate discovery, and optional operation state."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => scanConnections.mutate()} disabled={scanConnections.isPending}>
              <ScanSearch className="size-4" />
              Run Path Discovery
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setSelectedContact(null)
                setShowAddForm(true)
              }}
            >
              <Plus className="size-4" />
              Create Dossier
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-blue-900/60 bg-[#0b1633]/80 px-4 py-3 text-sm">
        <span className="text-zinc-500">Compartment</span>
        <Badge>{activeBusiness?.label || 'All compartments'}</Badge>
        <span className="ml-2 text-zinc-500">Cell</span>
        <Select className="h-8 w-44" value={segment} onChange={(event) => setSegment(event.target.value)}>
          <option value="">All cells</option>
          {(segmentsQuery.data?.segments || []).map((item) => (
            <option key={item.name} value={item.name}>{item.name} ({item.count})</option>
          ))}
        </Select>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_27rem]">
        <Card className="min-w-0">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Subject Directory</CardTitle>
                <div className="mt-1 text-xs text-zinc-500">{contacts.length} subjects in this compartment</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="relative w-72 max-w-full">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
                  <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Signal scan: subject, origin, claims, location" />
                </div>
                <Select value={relationshipType} onChange={(event) => setRelationshipType(event.target.value)}>
                  <option value="">All classifications</option>
                  {relationshipTypes.map((type) => (
                    <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>
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
                      <Th>Subject</Th>
                      <Th>Clearance</Th>
                      <Th>Cells</Th>
                      <Th>Origin Signature</Th>
                      <Th>Profile Score</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((contact) => {
                      const selected = selectedContact && String(selectedContact.id || selectedContact.email) === String(contact.id || contact.email)
                      const contextRole = businessScope === 'all'
                        ? contact.business_roles?.[0]
                        : contact.business_roles?.find((role) => role.business_id === businessScope)
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
                                <div className="truncate text-xs text-zinc-500">{contact.phone || 'No line'}</div>
                              </div>
                            </div>
                          </Td>
                          <Td><Badge>{contextRole?.role || contact.type || contact.contact_type || 'contact'}</Badge></Td>
                          <Td>
                            <div className="flex max-w-52 flex-wrap gap-1">
                              {(contact.segments || []).slice(0, 3).map((item) => <Badge key={item} variant="muted">{item}</Badge>)}
                              {(contact.segments || []).length > 3 ? <Badge variant="muted">+{(contact.segments || []).length - 3}</Badge> : null}
                            </div>
                          </Td>
                          <Td><div className="max-w-64 truncate">{contact.email || 'No origin'}</div></Td>
                          <Td>{contact.relevance?.relevance_score !== undefined ? Math.round(contact.relevance.relevance_score) : '—'}</Td>
                        </tr>
                      )
                    })}
                  </tbody>
                </Table>
              </div>
            ) : (
              <EmptyState title="No subjects found" detail="Change the compartment, cell, or signal scan." />
            )}
          </CardContent>
        </Card>

        <div className="min-w-0">
          {showAddForm ? (
            <Card>
              <CardHeader><CardTitle>New Dossier</CardTitle></CardHeader>
              <CardContent>
                <form className="flex flex-col gap-3" onSubmit={submit}>
                  <Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Subject name" />
                  <Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Origin signature" type="email" />
                  <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Secure line" />
                  <Select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
                    {relationshipTypes.map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}
                  </Select>
                  {businessScope !== 'all' ? (
                    <>
                      <Input value={form.relationship} onChange={(event) => setForm({ ...form, relationship: event.target.value })} placeholder={`Compartment role for ${activeBusiness?.label || businessScope}`} />
                      <Input value={form.segments} onChange={(event) => setForm({ ...form, segments: event.target.value })} placeholder="Cell tags, comma separated" />
                    </>
                  ) : null}
                  <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Claims / field notes" />

                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-300">
                    <input type="checkbox" checked={salesContact} onChange={(event) => setSalesContact(event.target.checked)} />
                    This subject also has an operation opportunity
                  </label>
                  {salesContact ? (
                    <Select value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value })}>
                      <option value="">Choose escalation state</option>
                      {salesStages.map((stage) => <option key={stage} value={stage}>{stage.replaceAll('_', ' ')}</option>)}
                    </Select>
                  ) : null}

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)}>Stand Down</Button>
                    <Button variant="primary" disabled={createContact.isPending}>
                      <Plus className="size-4" />
                      Create dossier
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
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-400">Subject Dossier</div>
                    <div className="mt-1 text-xs text-zinc-500">Identity · communications · connections · context</div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => window.open(window.location.href, '_blank', 'noopener,noreferrer')}>
                    <ExternalLink className="size-3.5" />
                    Detach
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
                    <div className="mt-1 truncate text-sm text-zinc-400">{field(selectedContact.email, 'No origin')}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge>{selectedType.replaceAll('_', ' ')}</Badge>
                      {selectedBusinessRole?.role ? <Badge variant="muted">{selectedBusinessRole.role}</Badge> : null}
                      {(selectedContact.segments || []).map((item) => <Badge key={item} variant="muted">{item}</Badge>)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.15em] text-blue-400">Canonical Identity</div>
                <div className="mt-2 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/45 text-sm">
                  <div className="grid grid-cols-[7rem_1fr] gap-3 border-b border-zinc-800 px-3 py-2.5"><span className="text-zinc-500">Origin</span><span className="break-all text-zinc-200">{field(selectedContact.email)}</span></div>
                  <div className="grid grid-cols-[7rem_1fr] gap-3 border-b border-zinc-800 px-3 py-2.5"><span className="text-zinc-500">Line</span><span className="text-zinc-200">{field(selectedContact.phone)}</span></div>
                  <div className="grid grid-cols-[7rem_1fr] gap-3 px-3 py-2.5"><span className="text-zinc-500">Location</span><span className="text-zinc-200">{field(selectedContact.address)}</span></div>
                </div>

                <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.15em] text-blue-400">Compartment Scope</div>
                <div className="mt-2 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950/45 text-sm">
                  <div className="grid grid-cols-[7rem_1fr] gap-3 border-b border-zinc-800 px-3 py-2.5"><span className="text-zinc-500">Last signal</span><span className="text-zinc-200">{compactDate(selectedContact.last_contacted_at)}</span></div>
                  <div className="grid grid-cols-[7rem_1fr] gap-3 border-b border-zinc-800 px-3 py-2.5"><span className="text-zinc-500">Next command</span><span className="text-zinc-200">{compactDate(selectedContact.next_follow_up_at)}</span></div>
                  <div className="grid grid-cols-[7rem_1fr] gap-3 px-3 py-2.5"><span className="text-zinc-500">Compartments</span><span className="text-zinc-200">{selectedContact.business_roles?.map((item) => item.business_id).join(', ') || 'Uncompartmented'}</span></div>
                </div>

                {businessScope !== 'all' ? (
                  <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/45 p-3">
                    <div className="mb-2 text-xs font-medium text-zinc-300">{activeBusiness?.label || businessScope} compartment scope</div>
                    <div className="grid gap-2">
                      <Input value={roleDraft} onChange={(event) => setRoleDraft(event.target.value)} placeholder="Role or cover" />
                      <Input value={segmentDraft} onChange={(event) => setSegmentDraft(event.target.value)} placeholder="Cell tags, comma separated" />
                      <Button size="sm" variant="secondary" onClick={() => saveBusinessRole.mutate()} disabled={saveBusinessRole.isPending}>
                        <Check className="size-3.5" />
                        Save scope
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-400">Associate Map</div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => recalculateRelevance.mutate()} disabled={!selectedContact.party_id || recalculateRelevance.isPending}>
                      <Target className="size-3.5" />
                      Signature
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void connectionsQuery.refetch()}>
                      <RefreshCw className="size-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/45 p-3 text-center">
                    <div className="text-xl font-semibold text-white">{relevance?.relevance_score !== undefined ? Math.round(Number(relevance.relevance_score)) : '—'}</div>
                    <div className="mt-1 text-[9px] uppercase tracking-wide text-zinc-500">Profile</div>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/45 p-3 text-center">
                    <div className="text-xl font-semibold text-white">{formatPercent(relevance?.connection_strength)}</div>
                    <div className="mt-1 text-[9px] uppercase tracking-wide text-zinc-500">Link</div>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-950/45 p-3 text-center">
                    <div className="text-xl font-semibold text-white">{verifiedConnections.length + candidateConnections.length}</div>
                    <div className="mt-1 text-[9px] uppercase tracking-wide text-zinc-500">Associates</div>
                  </div>
                </div>
                <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950/45 p-3 text-xs leading-5 text-zinc-400">
                  Profile confidence is contextual and explainable. Geographic or domain proximity can support path discovery but does not verify an associate link.
                </div>

                {verifiedConnections.length ? (
                  <div className="mt-3 space-y-2">
                    {verifiedConnections.slice(0, 4).map((connection) => (
                      <div key={connection.edge_id} className="flex items-center gap-2 rounded-lg border border-emerald-900/40 bg-emerald-950/10 p-2.5 text-xs">
                        <Link2 className="size-4 text-emerald-400" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-zinc-200">{connection.other_name}</div>
                          <div className="text-zinc-500">{connection.predicate?.replaceAll('_', ' ')} · verified</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {candidateConnections.length ? (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-400">
                      <ShieldQuestion className="size-3.5" /> Candidate Links
                    </div>
                    {candidateConnections.slice(0, 6).map((connection) => (
                      <div key={connection.edge_id} className="rounded-lg border border-amber-900/40 bg-amber-950/10 p-2.5 text-xs">
                        <div className="flex items-start gap-2">
                          <Network className="mt-0.5 size-4 shrink-0 text-amber-400" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-zinc-200">{connection.other_name}</div>
                            <div className="text-zinc-500">{connection.predicate?.replaceAll('_', ' ')} · {formatPercent(connection.confidence)}</div>
                            {connection.rationale ? <div className="mt-1 text-[10px] leading-4 text-zinc-600">{connection.rationale}</div> : null}
                          </div>
                        </div>
                        <div className="mt-2 flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => connection.edge_id && reviewCandidate.mutate({ candidateId: connection.edge_id, decision: 'reject' })}>
                            <X className="size-3" /> Dismiss
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => connection.edge_id && reviewCandidate.mutate({ candidateId: connection.edge_id, decision: 'accept' })}>
                            <Check className="size-3" /> Verify
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {selectedContact.notes ? (
                  <>
                    <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.15em] text-blue-400">Claim Ledger</div>
                    <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950/45 p-3 text-sm leading-6 text-zinc-300">{selectedContact.notes}</div>
                  </>
                ) : null}

                {selectedStage ? (
                  <>
                    <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.15em] text-violet-400">Operation State</div>
                    <div className="mt-2 rounded-lg border border-violet-900/40 bg-violet-950/10 p-3 text-sm text-zinc-300">
                      Escalation state: <span className="font-medium text-white">{selectedStage.replaceAll('_', ' ')}</span>
                    </div>
                  </>
                ) : null}

                {selectedContact.id ? <div className="mt-4"><DossierLinksRibbon contactId={String(selectedContact.id)} /></div> : null}

                <div className="mt-4 text-[10px] font-bold uppercase tracking-[0.15em] text-blue-400">Commands</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <Button variant="primary" onClick={() => openPrimeMail(selectedContact)} disabled={!selectedContact.email}>
                    <Mail className="size-4" /> Signal Desk
                  </Button>
                  <Button variant="secondary" onClick={() => openCalendar(selectedContact)}>
                    <CalendarDays className="size-4" /> Event Grid
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-blue-500/20 bg-[#111d37] px-4 py-3 text-[10px] text-zinc-500">
                <span>Identity · relationships · communications · ORB context</span>
                <span className="flex items-center gap-1.5 font-bold text-emerald-400"><span className="size-1.5 rounded-full bg-emerald-400" /> LINKED</span>
              </div>
            </div>
          ) : (
            <Card>
              <CardContent>
                <div className="flex min-h-80 flex-col items-center justify-center text-center">
                  <div className="flex size-14 items-center justify-center rounded-xl bg-zinc-900 text-zinc-500"><UserRound className="size-6" /></div>
                  <div className="mt-4 font-medium text-zinc-200">Select a subject dossier</div>
                  <div className="mt-1 max-w-72 text-sm text-zinc-500">The same canonical identity can operate across compartments without duplicate dossiers.</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
