'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { LayoutDashboard, Briefcase, AlertTriangle, DollarSign, Wallet, Receipt, MessageSquare } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import type { PortalDashboardData } from '@/types'
import { cn } from '@/lib/utils'
import { fmtMoney, fmtDateTime } from '@/lib/helpers'
import { STATUS_COLORS } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/layout/EmptyState'

export default function PortalDashboardView() {
  const { portalUser } = useAppStore()
  const { data: dash, isLoading } = useQuery({
    queryKey: ['portal-dashboard'],
    queryFn: () => fetch('/api/portal/dashboard').then(r => r.json()),
  })
  const clientName = portalUser?.client?.fullName || ''
  const currencyCode = portalUser?.tenant?.currencyCode || 'XAF'
  if (isLoading) return <div className='p-6 space-y-4'>{[1,2,3,4].map(i=><Skeleton key={i} className='h-28 rounded-xl' />)}</div>
  if (!dash) return <EmptyState icon={LayoutDashboard} title='Erreur de chargement' />
  const kpis = [
    { label: 'Dossiers actifs', value: dash.activeCasesCount ?? 0, icon: Briefcase, color: 'text-[#1E5A8A]', bg: 'bg-[#E8F0F8]' },
    { label: 'Factures en attente', value: dash.overdueInvoicesCount ?? 0, icon: AlertTriangle, color: dash.overdueInvoicesCount > 0 ? 'text-[#DC2626]' : 'text-[#065F46]', bg: dash.overdueInvoicesCount > 0 ? 'bg-[#FEE2E2]' : 'bg-[#D1FAE5]' },
    { label: 'Montant total', value: fmtMoney(dash.totalInvoicesAmount ?? 0, currencyCode, true), icon: DollarSign, color: 'text-[#1E5A8A]', bg: 'bg-[#E8F0F8]' },
    { label: 'Reste à payer', value: fmtMoney(dash.totalRemaining ?? 0, currencyCode, true), icon: Wallet, color: dash.totalRemaining > 0 ? 'text-[#92400E]' : 'text-[#065F46]', bg: dash.totalRemaining > 0 ? 'bg-[#FEF3C7]' : 'bg-[#D1FAE5]' },
  ]
  return (
    <div className='p-4 lg:p-6 space-y-6'>
      <div>
        <h2 className='text-xl font-bold text-[#111827]'>Bonjour, {clientName.split(' ')[0]} 👋</h2>
        <p className='text-sm text-[#6B7280] mt-0.5'>Voici un aperçu de votre espace</p>
      </div>
      <div className='grid grid-cols-2 lg:grid-cols-4 gap-3'>
        {kpis.map((kpi, i) => <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <Card className='rounded-xl border border-[#E5E7EB] hover:shadow-sm transition-shadow'>
            <CardContent className='p-4'><div className='flex items-center gap-3'><div className={cn('size-10 rounded-lg flex items-center justify-center shrink-0', kpi.bg)}><kpi.icon className={cn('size-5', kpi.color)} /></div><div className='min-w-0'><p className='text-xs text-[#9CA3AF] font-medium'>{kpi.label}</p><p className='text-lg font-bold text-[#111827] truncate'>{typeof kpi.value === 'number' ? kpi.value : kpi.value}</p></div></div></CardContent>
          </Card>
        </motion.div>)}
      </div>
      <div className='grid lg:grid-cols-2 gap-6'>
        <Card className='rounded-xl border border-[#E5E7EB]'>
          <CardHeader className='pb-3'><CardTitle className='text-sm font-semibold text-[#111827]'>Dossiers récents</CardTitle></CardHeader>
          <CardContent className='space-y-3'>
            {dash.recentCases?.length === 0 && <p className='text-sm text-[#9CA3AF]'>Aucun dossier</p>}
            {dash.recentCases?.map(c => (
              <button key={c.id} onClick={() => { useAppStore.getState().setPortalSelectedCaseId(c.id); useAppStore.getState().setPortalView('portal-case-detail') }} className='w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[#F9FAFB] transition-colors text-left'>
                <div className='size-9 rounded-lg bg-[#E8F0F8] flex items-center justify-center shrink-0'><Briefcase className='size-4 text-[#1E5A8A]' /></div>
                <div className='flex-1 min-w-0'><p className='text-sm font-medium text-[#111827] truncate'>{c.title}</p>{c.reference && <p className='text-xs text-[#9CA3AF]'>{c.reference}</p>}</div>
                <Badge className={cn('text-[10px] px-2 py-0.5 rounded-full border-0', STATUS_COLORS[c.status] || 'bg-gray-100 text-gray-600')}>{c.status}</Badge>
              </button>
            ))}
          </CardContent>
        </Card>
        <Card className='rounded-xl border border-[#E5E7EB]'>
          <CardHeader className='pb-3'><CardTitle className='text-sm font-semibold text-[#111827]'>Factures récentes</CardTitle></CardHeader>
          <CardContent className='space-y-3'>
            {dash.recentInvoices?.length === 0 && <p className='text-sm text-[#9CA3AF]'>Aucune facture</p>}
            {dash.recentInvoices?.map(inv => (
              <div key={inv.id} className='flex items-center gap-3 p-3 rounded-lg bg-[#F9FAFB]'>
                <div className='size-9 rounded-lg bg-[#F5F0E3] flex items-center justify-center shrink-0'><Receipt className='size-4 text-[#926B2D]' /></div>
                <div className='flex-1 min-w-0'><p className='text-sm font-medium text-[#111827] truncate'>{inv.invoiceNumber || '—'}</p><p className='text-xs text-[#9CA3AF]'>{inv.case?.reference || '—'}</p></div>
                <div className='text-right shrink-0'><p className='text-sm font-bold text-[#111827]'>{fmtMoney(inv.amount, inv.currency?.code || 'XAF', true)}</p><Badge className={cn('text-[10px] px-2 py-0.5 rounded-full border-0', STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-600')}>{inv.status}</Badge></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      {dash.recentCommunications?.length > 0 && (
        <Card className='rounded-xl border border-[#E5E7EB]'>
          <CardHeader className='pb-3'><CardTitle className='text-sm font-semibold text-[#111827]'>Dernières communications</CardTitle></CardHeader>
          <CardContent className='space-y-2'>
            {dash.recentCommunications.map(comm => (
              <div key={comm.id} className='flex items-start gap-3 p-3 rounded-lg hover:bg-[#F9FAFB] transition-colors'>
                <div className='size-8 rounded-full bg-[#E8F0F8] flex items-center justify-center shrink-0 mt-0.5'><MessageSquare className='size-3.5 text-[#1E5A8A]' /></div>
                <div className='flex-1 min-w-0'>
                  <p className='text-sm text-[#111827]'><span className='font-medium'>{comm.sentBy?.fullName || 'Vous'}</span>{comm.case && <span className='text-[#9CA3AF]'> · {comm.case.reference}</span>}</p>
                  <p className='text-xs text-[#6B7280] mt-0.5 line-clamp-2'>{comm.subject || comm.content.slice(0, 120)}</p>
                  <p className='text-[10px] text-[#9CA3AF] mt-1'>{fmtDateTime(comm.createdAt)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
