import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
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
import { DossierLinksRibbon } from '@/components/DossierLinksRibbon'
import { api } from '@/lib/api'
import { updateCRMContext } from '@/lib/orb-integration'
import { compactDate, initials } from '@/lib/utils'
import type { Contact } from '@/types'

const contactTypes = ['business', 'investor', 'marketing', 'promoter', 'personal', 'financial']
const stages = ['prospect', 'qualified', 'contacted', 'meeting_scheduled', 'proposal', 'won', 'lost', 'active']

export default function Contacts() {
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [contactType, setContactType] = useState('')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
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
    updateCRMContext({
      currentView: 'contacts',
      activeFilters: { search: query, type: contactType || 'all' },
      selectedContact,
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
    onSuccess: async () => {
      toast.success('Contact added')
      setForm({ name: '', email: '', phone: '', type: 'business', stage: 'prospect', notes: '' })
      await queryClient.invalidateQueries({ queryKey: ['contacts'] })
      await queryClient.invalidateQueries({ queryKey: ['pipeline'] })
    },
    onError: (error) => toast.error(error.message),
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    createContact.mutate()
  }

  return (
    <div>
      <SectionHeader title="Contacts" detail="Add contacts, classify accounts, and feed pipeline stages." />
      {selectedContact?.id ? (
        <div className="mb-5">
          <DossierLinksRibbon contactId={String(selectedContact.id)} />
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1fr_23rem]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle>Directory</CardTitle>
              <div className="flex gap-2">
                <div className="relative w-72 max-w-full">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
                  <Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, notes" />
                </div>
                <Select value={contactType} onChange={(event) => setContactType(event.target.value)}>
                  <option value="">All types</option>
                  {contactTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
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
                    {contacts.map((contact) => (
                      <tr
                        key={contact.id || contact.email || contact.name}
                        className="cursor-pointer transition hover:bg-zinc-900/40"
                        onClick={() => setSelectedContact(contact)}
                      >
                        <Td>
                          <div className="flex items-center gap-3">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-900 text-xs font-semibold text-zinc-300">
                              {initials(contact.name)}
                            </div>
                            <div>
                              <div className="font-medium text-zinc-100">{contact.name}</div>
                              <div className="text-xs text-zinc-500">{contact.phone || 'No phone'}</div>
                            </div>
                          </div>
                        </Td>
                        <Td>
                          <Badge>{contact.type || contact.contact_type || 'contact'}</Badge>
                        </Td>
                        <Td>
                          <Badge variant="muted">{contact.crm_stage || 'active'}</Badge>
                        </Td>
                        <Td>{contact.email || 'No email'}</Td>
                        <Td>{compactDate(contact.next_follow_up_at)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <EmptyState title="No contacts found" detail="Add accounts or adjust the current filters." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add Contact</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col gap-3" onSubmit={submit}>
              <Input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Name" />
              <Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email" type="email" />
              <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="Phone" />
              <Select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
                {contactTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </Select>
              <Select value={form.stage} onChange={(event) => setForm({ ...form, stage: event.target.value })}>
                {stages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </Select>
              <Textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Notes" />
              <Button variant="primary" disabled={createContact.isPending}>
                <Plus className="size-4" />
                Add contact
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
