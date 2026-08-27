'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileText, FileImage, Search, Download } from 'lucide-react'
import type { PortalDocItem } from '@/types'
import { cn } from '@/lib/utils'
import { fmtDate, fmtFileSize } from '@/lib/helpers'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/layout/EmptyState'

export default function PortalDocumentsView() {
  const [search, setSearch] = useState('')
  const { data: docs, isLoading } = useQuery({
    queryKey: ['portal-documents', search],
    queryFn: () => fetch(`/api/portal/documents${search ? `?search=${encodeURIComponent(search)}` : ''}`).then(r => r.json()),
  })
  if (isLoading) return <div className='p-6 space-y-3'>{[1,2,3].map(i=><Skeleton key={i} className='h-16 rounded-xl' />)}</div>
  return (
    <div className='p-4 lg:p-6 space-y-4'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div><h2 className='text-xl font-bold text-[#111827]'>Documents</h2><p className='text-sm text-[#6B7280]'>{(docs || []).length} document{(docs || []).length > 1 ? 's' : ''}</p></div>
        <div className='relative w-full sm:w-64'><Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9CA3AF]' /><Input placeholder='Rechercher un document...' value={search} onChange={e => setSearch(e.target.value)} className='pl-9 h-9 rounded-lg border-[#E5E7EB]' /></div>
      </div>
      {(docs || []).length === 0 ? <EmptyState icon={FileText} title='Aucun document' description={search ? 'Aucun résultat' : 'Aucun document disponible'} /> : (
        <div className='space-y-2'>
          {(docs as PortalDocItem[]).map(doc => (
            <div key={doc.id} className='flex items-center gap-3 p-3 rounded-lg bg-white border border-[#E5E7EB] hover:shadow-sm transition-shadow'>
              <div className={cn('size-10 rounded-lg flex items-center justify-center shrink-0', doc.mimeType?.includes('pdf') ? 'bg-[#FEE2E2]' : doc.mimeType?.includes('image') ? 'bg-[#D1FAE5]' : doc.mimeType?.includes('word') || doc.mimeType?.includes('document') ? 'bg-[#DBEAFE]' : 'bg-[#E8F0F8]')}>
                {doc.mimeType?.includes('pdf') ? <FileText className='size-5 text-[#DC2626]' /> : doc.mimeType?.includes('image') ? <FileImage className='size-5 text-[#059669]' /> : <FileText className='size-5 text-[#1E5A8A]' />}
              </div>
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-medium text-[#111827] truncate'>{doc.fileName}</p>
                <p className='text-[10px] text-[#9CA3AF]'>{fmtFileSize(doc.fileSize)} · v{doc.version}{doc.case && <span> · {doc.case.reference} — {doc.case.title}</span>}{doc.uploadedBy && <span> · {doc.uploadedBy.fullName}</span>}</p>
              </div>
              <span className='text-[10px] text-[#9CA3AF] shrink-0 hidden sm:block'>{fmtDate(doc.createdAt)}</span>
              <a href={`/api/portal/documents/${doc.id}/download`} target='_blank' rel='noopener noreferrer' className='p-2 rounded-lg hover:bg-[#E8F0F8] text-[#6B7280] hover:text-[#1E5A8A] transition-colors shrink-0'><Download className='size-4' /></a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
