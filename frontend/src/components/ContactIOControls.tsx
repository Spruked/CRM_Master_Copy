import { useRef } from 'react'
import { Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useBusinessContext } from '@/providers/BusinessContextProvider'

type ContactFormat = 'vcf' | 'csv'
type CsvSource = 'gmail' | 'outlook' | 'generic'

function detectCsvSource(content: string): CsvSource {
  const header = String(content || '').split(/\r?\n/, 1)[0]?.toLowerCase() || ''
  const looksGoogle =
    header.includes('e-mail 1 - value') ||
    header.includes('phone 1 - value') ||
    (header.includes('given name') && header.includes('family name'))
  if (looksGoogle) return 'gmail'

  const looksOutlook =
    header.includes('e-mail address') ||
    header.includes('mobile phone') ||
    (header.includes('first name') && header.includes('last name') && header.includes('company'))
  if (looksOutlook) return 'outlook'

  return 'generic'
}

function importedContactIds(result: any): string[] {
  const ids = new Set<string>()
  for (const item of Array.isArray(result?.merge_audit) ? result.merge_audit : []) {
    const id = String(item?.contact_id || '').trim()
    if (id) ids.add(id)
  }
  return Array.from(ids)
}

export function ContactIOControls() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { businessScope } = useBusinessContext()

  async function importFile(file: File) {
    try {
      const lowerName = file.name.toLowerCase()
      const isCsv = lowerName.endsWith('.csv') || file.type.toLowerCase().includes('csv')
      const targetScope = businessScope === 'all' ? 'personal' : businessScope

      if (isCsv) {
        const content = await file.text()
        const source = detectCsvSource(content)
        const form = new FormData()
        form.append('file', file)

        const response = await api.post(`/cali/contacts/import/csv/${source}`, form, {
          params: {
            default_contact_type: targetScope === 'personal' ? 'personal' : 'professional',
            default_stage: 'active',
          },
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        const result = response.data || {}
        const ids = importedContactIds(result)
        const dossierResponse = await api.post('/cali/intelligence/dossiers/backfill', {
          business_scope: targetScope,
          contact_ids: ids,
          only_unscoped: true,
        })
        const counts = result.counts || {}
        const dossierCount = Number(dossierResponse.data?.roles_assigned || 0)
        toast.success(
          `Dossiers imported (${source}) - ${Number(counts.created || 0)} new - ${Number(counts.merged || 0)} merged - ${dossierCount} dossiers scoped - ${Number(counts.review_candidates || 0)} review - ${Number(counts.errors || 0)} errors`,
        )
        window.dispatchEvent(new CustomEvent('cali-contacts-imported', { detail: { ...result, dossier_backfill: dossierResponse.data } }))
        return
      }

      const content = await file.text()
      const response = await api.post('/cali/intelligence/vcard/import', {
        content,
        business_scope: targetScope,
        run_relationship_scan: false,
      })
      const result = response.data || {}
      const seen = Number(result.cards_seen || 0)
      toast.success(
        `Dossiers compiled - ${seen} read - ${Number(result.created || 0)} new - ${Number(result.existing_exact_email || 0)} matched - ${Number(result.phone_review_queued || 0)} review`,
      )
      window.dispatchEvent(new CustomEvent('cali-contacts-imported', { detail: result }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Dossier import failed')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function exportContacts(format: ContactFormat) {
    try {
      const endpoint = format === 'csv' ? '/cali/intelligence/csv/export' : '/cali/intelligence/vcard/export'
      const response = await api.post(
        endpoint,
        { contact_ids: [], business_scope: businessScope },
        { responseType: 'blob' },
      )
      const blob = response.data as Blob
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      const scope = businessScope === 'all' ? 'viv-dossiers' : `viv-${businessScope}-dossiers`
      anchor.download = `${scope}.${format}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      toast.success(format === 'csv' ? 'CSV dossier file created' : 'iPhone-compatible dossier file created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Dossier export failed')
    }
  }

  return (
    <div className="hidden items-center gap-1.5 2xl:flex">
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept=".vcf,.csv,text/vcard,text/x-vcard,text/csv"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void importFile(file)
        }}
      />
      <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()} title="Import VCF, Google CSV, Outlook CSV, or generic CSV dossiers">
        <Upload className="size-3.5" />
        Import dossiers
      </Button>
      <Button size="sm" variant="secondary" onClick={() => void exportContacts('vcf')} title="Export dossiers as iPhone-compatible vCard">
        <Download className="size-3.5" />
        Export VCF
      </Button>
      <Button size="sm" variant="secondary" onClick={() => void exportContacts('csv')} title="Export dossiers as CSV">
        <Download className="size-3.5" />
        Export CSV
      </Button>
    </div>
  )
}
