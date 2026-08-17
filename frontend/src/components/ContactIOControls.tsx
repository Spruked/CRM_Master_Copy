import { useRef } from 'react'
import { Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useBusinessContext } from '@/providers/BusinessContextProvider'

type ContactFormat = 'vcf' | 'csv'

export function ContactIOControls() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { businessScope } = useBusinessContext()

  async function importFile(file: File) {
    try {
      const content = await file.text()
      const lowerName = file.name.toLowerCase()
      const isCsv = lowerName.endsWith('.csv') || file.type.toLowerCase().includes('csv')
      const endpoint = isCsv ? '/cali/intelligence/csv/import' : '/cali/intelligence/vcard/import'
      const response = await api.post(endpoint, {
        content,
        business_scope: businessScope === 'all' ? 'personal' : businessScope,
        run_relationship_scan: true,
      })
      const result = response.data || {}
      const seen = Number(result.rows_seen || result.cards_seen || 0)
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
      <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()} title="Import VCF or CSV dossiers">
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
