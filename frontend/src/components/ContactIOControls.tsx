import { useRef } from 'react'
import { Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useBusinessContext } from '@/providers/BusinessContextProvider'

export function ContactIOControls() {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const { businessScope } = useBusinessContext()

  async function importFile(file: File) {
    try {
      const content = await file.text()
      const response = await api.post('/cali/intelligence/vcard/import', {
        content,
        business_scope: businessScope === 'all' ? 'personal' : businessScope,
        run_relationship_scan: true,
      })
      const result = response.data || {}
      toast.success(
        `Contacts compiled · ${Number(result.created || 0)} new · ${Number(result.existing_exact_email || 0)} matched · ${Number(result.phone_review_queued || 0)} review`,
      )
      window.dispatchEvent(new CustomEvent('cali-contacts-imported', { detail: result }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Contact import failed')
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function exportContacts() {
    try {
      const response = await api.post(
        '/cali/intelligence/vcard/export',
        { contact_ids: [], business_scope: businessScope },
        { responseType: 'blob' },
      )
      const blob = response.data as Blob
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = businessScope === 'all' ? 'cali-contacts.vcf' : `cali-${businessScope}-contacts.vcf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      toast.success('iPhone-compatible contact file created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Contact export failed')
    }
  }

  return (
    <div className="hidden items-center gap-1.5 2xl:flex">
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept=".vcf,text/vcard,text/x-vcard"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void importFile(file)
        }}
      />
      <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()} title="Import iPhone/vCard contacts">
        <Upload className="size-3.5" />
        Import contacts
      </Button>
      <Button size="sm" variant="secondary" onClick={() => void exportContacts()} title="Export contacts to iPhone/vCard">
        <Download className="size-3.5" />
        Export contacts
      </Button>
    </div>
  )
}
