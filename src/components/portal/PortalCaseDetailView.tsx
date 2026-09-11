'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Briefcase, FileText, FileDown, Calendar, ClipboardList, Receipt, Clock, Users, DollarSign, MapPin, BookOpen, FileImage, Download, History, Circle, Timer } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import type { PortalCaseDetail, PortalTimelineEntry } from '@/types'
import { cn } from '@/lib/utils'
import { fmtMoney, fmtDate, fmtDateTime, fmtFileSize, initials } from '@/lib/helpers'
import { STATUS_COLORS } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/layout/EmptyState'

export default function PortalCaseDetailView() {
  const { portalSelectedCaseId, setPortalView } = useAppStore()
  const [tab, setTab] = useState('resume')
  const { data: caseDetail, isLoading } = useQuery({
    queryKey: ['portal-case-detail', portalSelectedCaseId],
    queryFn: () => fetch(`/api/portal/cases/${portalSelectedCaseId}`).then(r => { if (!r.ok) throw new Error('Not found'); return r.json() }),
    enabled: !!portalSelectedCaseId,
  })
  const { data: timeline } = useQuery({
    queryKey: ['portal-case-timeline', portalSelectedCaseId],
    queryFn: () => fetch(`/api/portal/cases/${portalSelectedCaseId}/timeline`).then(r => r.json()),
    enabled: !!portalSelectedCaseId && tab === 'timeline',
  })
  if (isLoading) return <div className='p-6 space-y-4'><Skeleton className='h-40 rounded-xl' /><Skeleton className='h-60 rounded-xl' /></div>
  if (!caseDetail) return <EmptyState icon={Briefcase} title='Dossier non trouvé' />
  const timelineColors: Record<string, string> = { event: 'border-l-[#1E5A8A]', note: 'border-l-[#059669]', document: 'border-l-[#C8A45D]', task: 'border-l-[#8B5CF6]', invoice: 'border-l-[#DC2626]' }
  const timelineIcons: Record<string, React.ElementType> = { event: Calendar, note: FileText, document: FileDown, task: ClipboardList, invoice: Receipt }
  const fmtDuration = (s: number) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m > 0 ? m + 'min' : ''}` : `${m}min` }
  const tabs = [
    { id: 'resume', label: 'Résumé' }, { id: 'timeline', label: 'Chronologie' }, { id: 'documents', label: 'Documents' }, { id: 'invoices', label: 'Factures' }, { id: 'time', label: 'Temps' },
  ]
  return (
    <div className='p-4 lg:p-6 space-y-4'>
      <button onClick={() => setPortalView('portal-cases')} className='flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#1E5A8A] transition-colors'><ArrowLeft className='size-4' />Retour aux dossiers</button>
      <Card className='rounded-xl border border-[#E5E7EB]'>
        <CardContent className='p-5'>
          <div className='flex flex-wrap items-start gap-3 mb-3'>
            {caseDetail.reference && <Badge className='text-xs px-2.5 py-1 rounded-full bg-[#F3F4F6] text-[#6B7280] border-0'>{caseDetail.reference}</Badge>}
            <Badge className={cn('text-xs px-2.5 py-1 rounded-full border-0', STATUS_COLORS[caseDetail.status] || 'bg-gray-100 text-gray-600')}>{caseDetail.status}</Badge>
            {caseDetail.caseType && <Badge variant='outline' className='text-xs'>{caseDetail.caseType}</Badge>}
            {caseDetail.priority && caseDetail.priority !== 'normal' && <Badge className={cn('text-xs px-2.5 py-1 rounded-full border-0', caseDetail.priority === 'urgent' ? 'bg-[#FEE2E2] text-[#991B1B]' : caseDetail.priority === 'haute' ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#F3F4F6] text-[#6B7280]')}>{caseDetail.priority}</Badge>}
          </div>
          <h2 className='text-lg font-bold text-[#111827]'>{caseDetail.title}</h2>
          {caseDetail.description && <p className='text-sm text-[#6B7280] mt-1 whitespace-pre-wrap'>{caseDetail.description}</p>}
          <div className='flex flex-wrap gap-x-6 gap-y-1 mt-4 text-xs text-[#6B7280]'>
            {caseDetail.jurisdiction && <span className='flex items-center gap-1'><MapPin className='size-3' />{caseDetail.jurisdiction}</span>}
            {caseDetail.adversary && <span className='flex items-center gap-1'><Users className='size-3' />{caseDetail.adversary}</span>}
            {caseDetail.amountInDispute != null && caseDetail.amountInDispute > 0 && <span className='flex items-center gap-1'><DollarSign className='size-3' />{fmtMoney(caseDetail.amountInDispute, 'XAF', true)}</span>}
          </div>
          {caseDetail.assignments && caseDetail.assignments.length > 0 && (
            <div className='flex items-center gap-2 mt-4 pt-4 border-t border-[#E5E7EB]'>
              <span className='text-xs text-[#9CA3AF]'>Avocat(s) :</span>
              {caseDetail.assignments.map(a => (
                <div key={a.id} className='flex items-center gap-1.5'>
                  <Avatar className='size-6'><AvatarFallback className='bg-[#1E5A8A] text-white text-[9px]'>{initials(a.user?.fullName || '?')}</AvatarFallback></Avatar>
                  <span className='text-xs font-medium text-[#111827]'>{a.user?.fullName}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <div className='flex gap-1 overflow-x-auto border-b border-[#E5E7EB]'>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn('px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px',
            tab === t.id ? 'border-[#1E5A8A] text-[#1E5A8A]' : 'border-transparent text-[#9CA3AF] hover:text-[#6B7280]')}>{t.label}</button>
        ))}
      </div>
      {tab === 'resume' && (
        <div className='space-y-4'>
          {caseDetail.notes && caseDetail.notes.length > 0 && (
            <Card className='rounded-xl border border-[#E5E7EB]'><CardHeader className='pb-2'><CardTitle className='text-sm font-semibold'>Notes</CardTitle></CardHeader><CardContent className='space-y-3'>
              {caseDetail.notes.map(n => (<div key={n.id} className='p-3 rounded-lg bg-[#F9FAFB]'><p className='text-sm text-[#111827] whitespace-pre-wrap'>{n.content}</p><p className='text-[10px] text-[#9CA3AF] mt-1'>{n.author?.fullName || ''} · {fmtDateTime(n.createdAt)}</p></div>))}
            </CardContent></Card>
          )}
          {caseDetail.tasks && caseDetail.tasks.length > 0 && (
            <Card className='rounded-xl border border-[#E5E7EB]'><CardHeader className='pb-2'><CardTitle className='text-sm font-semibold'>Tâches</CardTitle></CardHeader><CardContent className='space-y-2'>
              {caseDetail.tasks.map(t => (<div key={t.id} className='flex items-center gap-3 p-2 rounded-lg hover:bg-[#F9FAFB]'><Badge className={cn('text-[10px] px-2 py-0.5 rounded-full border-0', STATUS_COLORS[t.status === 'en_cours' ? 'en_cours' : t.status === 'terminee' ? 'clos' : t.status === 'a_faire' ? 'nouveau' : 'en_attente'] || 'bg-gray-100 text-gray-600')}>{t.status}</Badge><span className='text-sm text-[#111827]'>{t.title}</span>{t.dueDate && <span className='text-[10px] text-[#9CA3AF] ml-auto'>{fmtDate(t.dueDate)}</span>}</div>))}
            </CardContent></Card>
          )}
          {!caseDetail.notes?.length && !caseDetail.tasks?.length && <EmptyState icon={BookOpen} title='Aucune note ni tâche' description={"Votre avocat n'a pas encore ajouté de notes à ce dossier"} />}
        </div>
      )}
      {tab === 'timeline' && (
        <div className='space-y-2'>
          {(!timeline || timeline.length === 0) && <EmptyState icon={History} title='Aucune activité' />}
          {timeline?.map((entry: PortalTimelineEntry) => {
            const Icon = timelineIcons[entry.type] || Circle
            return (
              <div key={entry.id + entry.type} className={cn('pl-4 py-3 border-l-4 rounded-r-lg', timelineColors[entry.type] || 'border-l-gray-300')}>
                <div className='flex items-start gap-3'>
                  <Icon className='size-4 mt-0.5 text-[#6B7280] shrink-0' />
                  <div className='flex-1 min-w-0'><p className='text-sm font-medium text-[#111827]'>{entry.title}</p>{entry.description && <p className='text-xs text-[#6B7280] mt-0.5'>{entry.description}</p>}<p className='text-[10px] text-[#9CA3AF] mt-1'>{entry.author || ''} · {fmtDateTime(entry.date)}</p></div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {tab === 'documents' && (
        <div className='space-y-2'>
          {(!caseDetail.documents || caseDetail.documents.length === 0) && <EmptyState icon={FileText} title='Aucun document' />}
          {caseDetail.documents?.map(doc => (
            <div key={doc.id} className='flex items-center gap-3 p-3 rounded-lg bg-white border border-[#E5E7EB] hover:shadow-sm transition-shadow'>
              <div className={cn('size-9 rounded-lg flex items-center justify-center shrink-0', doc.mimeType?.includes('pdf') ? 'bg-[#FEE2E2]' : doc.mimeType?.includes('image') ? 'bg-[#D1FAE5]' : 'bg-[#E8F0F8]')}>
                {doc.mimeType?.includes('pdf') ? <FileText className='size-4 text-[#DC2626]' /> : doc.mimeType?.includes('image') ? <FileImage className='size-4 text-[#059669]' /> : <FileText className='size-4 text-[#1E5A8A]' />}
              </div>
              <div className='flex-1 min-w-0'><p className='text-sm font-medium text-[#111827] truncate'>{doc.fileName}</p><p className='text-[10px] text-[#9CA3AF]'>{fmtFileSize(doc.fileSize)} · v{doc.version} · {fmtDate(doc.createdAt)}{doc.uploadedBy && ` · ${doc.uploadedBy.fullName}`}</p></div>
              <a href={`/api/portal/documents/${doc.id}/download`} target='_blank' rel='noopener noreferrer' className='p-2 rounded-lg hover:bg-[#E8F0F8] text-[#6B7280] hover:text-[#1E5A8A] transition-colors'><Download className='size-4' /></a>
            </div>
          ))}
        </div>
      )}
      {tab === 'invoices' && (
        <div className='space-y-2'>
          {(!caseDetail.invoices || caseDetail.invoices.length === 0) && <EmptyState icon={Receipt} title='Aucune facture' />}
          {caseDetail.invoices?.map(inv => (
            <div key={inv.id} className='flex items-center gap-3 p-3 rounded-lg bg-white border border-[#E5E7EB]'>
              <div className='size-9 rounded-lg bg-[#F5F0E3] flex items-center justify-center shrink-0'><Receipt className='size-4 text-[#926B2D]' /></div>
              <div className='flex-1 min-w-0'><p className='text-sm font-medium text-[#111827]'>{inv.invoiceNumber || '—'}</p><p className='text-[10px] text-[#9CA3AF]'>{fmtDate(inv.issuedAt)} · Échéance: {fmtDate(inv.dueDate)}</p></div>
              <div className='text-right shrink-0'><p className='text-sm font-bold text-[#111827]'>{fmtMoney(inv.amount, 'XAF', true)}</p><Badge className={cn('text-[10px] px-2 py-0.5 rounded-full border-0', STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-600')}>{inv.status}</Badge></div>
            </div>
          ))}
        </div>
      )}
      {tab === 'time' && (
        <div className='space-y-2'>
          {(!caseDetail.timeEntries || caseDetail.timeEntries.length === 0) && <EmptyState icon={Timer} title='Aucun temps enregistré' />}
          {caseDetail.timeEntries?.map(te => (
            <div key={te.id} className='flex items-center gap-3 p-3 rounded-lg bg-white border border-[#E5E7EB]'>
              <div className='size-9 rounded-lg bg-[#E8F0F8] flex items-center justify-center shrink-0'><Clock className='size-4 text-[#1E5A8A]' /></div>
              <div className='flex-1 min-w-0'><p className='text-sm text-[#111827]'>{te.description || 'Temps travaillé'}</p><p className='text-[10px] text-[#9CA3AF]'>{te.user?.fullName || ''} · {fmtDate(te.startTime)}</p></div>
              <div className='text-right shrink-0'><p className='text-sm font-semibold text-[#111827]'>{fmtDuration(te.duration)}</p>{te.totalAmount != null && te.totalAmount > 0 && <p className='text-[10px] text-[#9CA3AF]'>{fmtMoney(te.totalAmount, 'XAF', true)}</p>}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
