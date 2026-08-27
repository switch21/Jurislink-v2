'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Briefcase, Search, FileText, Calendar } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import type { PortalCaseItem } from '@/types'
import { cn } from '@/lib/utils'
import { fmtDate } from '@/lib/helpers'
import { STATUS_COLORS, CASE_STATUS_LABELS } from '@/lib/constants'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/layout/EmptyState'

export default function PortalCasesView() {
  const { setPortalView, setPortalSelectedCaseId } = useAppStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const { data: cases, isLoading } = useQuery({
    queryKey: ['portal-cases'],
    queryFn: () => fetch('/api/portal/cases').then(r => r.json()),
  })
  if (isLoading) return <div className='p-6 space-y-3'>{[1,2,3].map(i=><Skeleton key={i} className='h-32 rounded-xl' />)}</div>
  const filtered = (cases || []).filter((c: PortalCaseItem) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !(c.reference || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const statusPills = ['all', 'nouveau', 'ouvert', 'en_cours', 'en_attente', 'clos']
  return (
    <div className='p-4 lg:p-6 space-y-4'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div><h2 className='text-xl font-bold text-[#111827]'>Mes dossiers</h2><p className='text-sm text-[#6B7280]'>{filtered.length} dossier{filtered.length > 1 ? 's' : ''}</p></div>
        <div className='relative w-full sm:w-64'><Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9CA3AF]' /><Input placeholder='Rechercher...' value={search} onChange={e => setSearch(e.target.value)} className='pl-9 h-9 rounded-lg border-[#E5E7EB]' /></div>
      </div>
      <div className='flex gap-2 overflow-x-auto pb-1'>
        {statusPills.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
            statusFilter === s ? 'bg-[#1E5A8A] text-white' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]')}>
            {s === 'all' ? 'Tous' : CASE_STATUS_LABELS[s] || s}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? <EmptyState icon={Briefcase} title='Aucun dossier' description={search ? 'Aucun résultat pour cette recherche' : 'Vous n\'avez pas encore de dossiers'} /> : (
        <div className='grid sm:grid-cols-2 xl:grid-cols-3 gap-3'>
          {filtered.map((c: PortalCaseItem, i: number) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
              <Card className='rounded-xl border border-[#E5E7EB] hover:shadow-sm hover:border-[#C8A45D]/30 transition-all cursor-pointer h-full' onClick={() => { setPortalSelectedCaseId(c.id); setPortalView('portal-case-detail') }}>
                <CardContent className='p-4'>
                  <div className='flex items-start justify-between gap-2 mb-2'>
                    {c.reference && <Badge className='text-[10px] px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280] border-0'>{c.reference}</Badge>}
                    <Badge className={cn('text-[10px] px-2 py-0.5 rounded-full border-0 shrink-0', STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-600')}>{c.status}</Badge>
                  </div>
                  <h3 className='text-sm font-semibold text-[#111827] line-clamp-2 mb-2'>{c.title}</h3>
                  <div className='flex items-center gap-3 text-[10px] text-[#9CA3AF]'>
                    {c.caseType && <span className='px-1.5 py-0.5 bg-[#F3F4F6] rounded'>{c.caseType}</span>}
                    <span className='flex items-center gap-1'><FileText className='size-3' />{c._count?.documents || 0}</span>
                    <span className='flex items-center gap-1'><Calendar className='size-3' />{c._count?.events || 0}</span>
                  </div>
                  <p className='text-[10px] text-[#9CA3AF] mt-2'>{fmtDate(c.updatedAt)}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
