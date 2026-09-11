'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Receipt, Printer } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import type { PortalInvoiceItem } from '@/types'
import { cn } from '@/lib/utils'
import { fmtMoney, fmtDate } from '@/lib/helpers'
import { STATUS_COLORS, INVOICE_STATUS_LABELS } from '@/lib/constants'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EmptyState } from '@/components/layout/EmptyState'

export default function PortalInvoicesView() {
  const { portalUser } = useAppStore()
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedInvoice, setSelectedInvoice] = useState<PortalInvoiceItem | null>(null)
  const currencyCode = portalUser?.tenant?.currencyCode || 'XAF'
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['portal-invoices', statusFilter],
    queryFn: () => fetch(`/api/portal/invoices${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`).then(r => r.json()),
  })
  const { data: invoiceDetail } = useQuery({
    queryKey: ['portal-invoice-detail', selectedInvoice?.id],
    queryFn: () => fetch(`/api/portal/invoices/${selectedInvoice!.id}`).then(r => r.json()),
    enabled: !!selectedInvoice,
  })
  if (isLoading) return <div className='p-6 space-y-3'>{[1,2,3].map(i=><Skeleton key={i} className='h-24 rounded-xl' />)}</div>
  const filtered = invoices || []
  const totalAmount = filtered.reduce((s: number, inv: PortalInvoiceItem) => s + inv.amount, 0)
  const statusPills = ['all', 'non_paye', 'partiel', 'paye']
  return (
    <div className='p-4 lg:p-6 space-y-4'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <div><h2 className='text-xl font-bold text-[#111827]'>Mes factures</h2><p className='text-sm text-[#6B7280]'>{filtered.length} facture{filtered.length > 1 ? 's' : ''} · Total: {fmtMoney(totalAmount, currencyCode, true)}</p></div>
      </div>
      <div className='flex gap-2 overflow-x-auto pb-1'>
        {statusPills.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={cn('px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
            statusFilter === s ? 'bg-[#1E5A8A] text-white' : 'bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]')}>
            {s === 'all' ? 'Toutes' : INVOICE_STATUS_LABELS[s] || s}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? <EmptyState icon={Receipt} title='Aucune facture' /> : (
        <div className='space-y-2'>
          {(filtered as PortalInvoiceItem[]).map(inv => {
            const remaining = inv.amount - inv.paidAmount
            const progress = inv.amount > 0 ? Math.min(100, (inv.paidAmount / inv.amount) * 100) : 0
            return (
              <motion.div key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className='rounded-xl border border-[#E5E7EB] hover:shadow-sm cursor-pointer transition-all' onClick={() => setSelectedInvoice(inv)}>
                  <CardContent className='p-4'>
                    <div className='flex items-center gap-4'>
                      <div className='size-10 rounded-lg bg-[#F5F0E3] flex items-center justify-center shrink-0'><Receipt className='size-5 text-[#926B2D]' /></div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2 mb-1'><p className='text-sm font-semibold text-[#111827]'>{inv.invoiceNumber || '—'}</p><Badge className={cn('text-[10px] px-2 py-0.5 rounded-full border-0', STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-600')}>{inv.status}</Badge></div>
                        <p className='text-xs text-[#9CA3AF]'>{inv.case?.reference ? `Dossier ${inv.case.reference}` : '—'} · Échéance: {fmtDate(inv.dueDate)}</p>
                        <div className='mt-2 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden'><div className='h-full bg-[#059669] rounded-full transition-all' style={{ width: `${progress}%` }} /></div>
                      </div>
                      <div className='text-right shrink-0'>
                        <p className='text-sm font-bold text-[#111827]'>{fmtMoney(inv.amount, inv.currency?.code || currencyCode)}</p>
                        <p className='text-[10px] text-[#9CA3AF]'>Payé: {fmtMoney(inv.paidAmount, inv.currency?.code || currencyCode, true)}</p>
                        {remaining > 0 && <p className='text-[10px] text-[#DC2626] font-medium'>Reste: {fmtMoney(remaining, inv.currency?.code || currencyCode, true)}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className='max-w-2xl max-h-[85vh] overflow-y-auto'>
          <DialogHeader><DialogTitle className='text-base'>Facture {invoiceDetail?.invoiceNumber || selectedInvoice?.invoiceNumber || ''}</DialogTitle><DialogDescription>Détails de la facture</DialogDescription></DialogHeader>
          {invoiceDetail && (<div className='space-y-4'>
            <div className='grid grid-cols-2 gap-4 text-sm'>
              <div><span className='text-[#9CA3AF]'>Statut</span><Badge className={cn('ml-2 text-[10px] px-2 py-0.5 rounded-full border-0', STATUS_COLORS[invoiceDetail.status] || 'bg-gray-100 text-gray-600')}>{invoiceDetail.status}</Badge></div>
              <div><span className='text-[#9CA3AF]'>Date :</span> <span className='text-[#111827] ml-1'>{fmtDate(invoiceDetail.issuedAt)}</span></div>
              <div><span className='text-[#9CA3AF]'>Échéance :</span> <span className='text-[#111827] ml-1'>{fmtDate(invoiceDetail.dueDate)}</span></div>
              <div><span className='text-[#9CA3AF]'>Montant :</span> <span className='font-bold text-[#111827] ml-1'>{fmtMoney(invoiceDetail.amount, invoiceDetail.currency?.code || currencyCode)}</span></div>
            </div>
            {invoiceDetail.lineItems && invoiceDetail.lineItems.length > 0 && (
              <Table><TableHeader><TableRow><TableHead>Description</TableHead><TableHead className='text-right'>Qté</TableHead><TableHead className='text-right'>P.U. HT</TableHead><TableHead className='text-right'>Total</TableHead></TableRow></TableHeader><TableBody>
                {invoiceDetail.lineItems.map(li => <TableRow key={li.id}><TableCell className='text-sm'>{li.description}</TableCell><TableCell className='text-right text-sm'>{li.quantity}</TableCell><TableCell className='text-right text-sm'>{fmtMoney(li.unitPrice, invoiceDetail.currency?.code || currencyCode)}</TableCell><TableCell className='text-right text-sm font-medium'>{fmtMoney(li.total, invoiceDetail.currency?.code || currencyCode)}</TableCell></TableRow>)}
              </TableBody></Table>
            )}
            {invoiceDetail.payments && invoiceDetail.payments.length > 0 && (
              <div><h4 className='text-sm font-semibold mb-2'>Paiements</h4><Table><TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Mode</TableHead><TableHead className='text-right'>Montant</TableHead><TableHead>Enregistré par</TableHead></TableRow></TableHeader><TableBody>
                {invoiceDetail.payments.map(p => <TableRow key={p.id}><TableCell className='text-sm'>{fmtDate(p.paidAt)}</TableCell><TableCell className='text-sm'>{p.method}</TableCell><TableCell className='text-right text-sm font-medium'>{fmtMoney(p.amount, currencyCode)}</TableCell><TableCell className='text-sm'>{p.recorder?.fullName || '—'}</TableCell></TableRow>)}
              </TableBody></Table></div>
            )}
            <div className='flex gap-2 pt-2'><a href={`/api/invoices/${invoiceDetail.id}/pdf`} target='_blank' rel='noopener noreferrer'><Button size='sm' className='bg-[#1E5A8A] hover:bg-[#164070]'><Printer className='size-4 mr-1.5' />Télécharger PDF</Button></a></div>
          </div>)}
        </DialogContent>
      </Dialog>
    </div>
  )
}
