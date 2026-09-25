'use client'

import { useQuery } from '@tanstack/react-query'
import { Building as BuildingIcon, UsersRound, Briefcase, Users, TrendingUp, DollarSign, Crown, ShieldCheck } from 'lucide-react'
import { Card, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { ROLE_LABELS } from '@/lib/constants'
import { fmtDate, fmtMoney } from '@/lib/helpers'
import type { AdminDashboardData } from '@/types'
import { EmptyState } from '@/components/layout/EmptyState'

export default function AdminDashboardView() {
  const { data, isLoading } = useQuery<AdminDashboardData>({ queryKey: ['admin-dashboard'], queryFn: () => fetch('/api/admin/dashboard').then(r => r.json()) })
  if (isLoading) return <div className='p-6 space-y-4'><div className='grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4'>{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className='h-24 rounded-xl' />)}</div></div>
  if (!data) return <EmptyState icon={ShieldCheck} title='Erreur de chargement' />
  const months = Object.entries(data.signupsByMonth || {}).slice(-12)
  const maxMonth = Math.max(...months.map(([, v]) => v), 1)
  const maxPlan = Math.max(...(data.tenantsByPlan || []).map(p => p._count.id), 1)
  const maxRole = Math.max(...(data.usersByRole || []).map(r => r._count.id), 1)
  const kpis = [
    { label: 'Cabinets actifs', value: data.activeTenants, icon: BuildingIcon, color: 'text-[#1E5A8A]' },
    { label: 'Utilisateurs actifs', value: data.activeUsers, icon: UsersRound, color: 'text-[#059669]' },
    { label: 'Dossiers actifs', value: data.activeCases, icon: Briefcase, color: 'text-[#C8A45D]' },
    { label: 'Clients', value: data.totalClients, icon: Users, color: 'text-[#7C3AED]' },
    { label: 'CA total', value: fmtMoney(data.totalRevenue), icon: TrendingUp, color: 'text-[#1E5A8A]' },
    { label: 'CA ce mois', value: fmtMoney(data.thisMonthRevenue), icon: DollarSign, color: 'text-[#059669]' },
  ]
  return (<div className='p-6 space-y-6'>
    <div className='flex items-center gap-2'><Crown className='size-5 text-[#C8A45D]' /><h2 className='text-lg font-bold text-[#111827]'>Administration</h2></div>
    <div className='grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4'>
      {kpis.map(k => (<Card key={k.label} className='p-4'><div className='flex items-center gap-3'><div className={cn('p-2 rounded-lg bg-[#F3F4F6]', k.color)}><k.icon className='size-4' /></div><div><p className='text-xs text-[#9CA3AF]'>{k.label}</p><p className='text-lg font-bold text-[#111827]'>{k.value}</p></div></div></Card>))}
    </div>
    <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
      <Card className='lg:col-span-2 p-4'><CardTitle className='text-sm font-semibold mb-4'>Inscriptions par mois</CardTitle>
        <div className='flex items-end gap-2 h-40'>{months.map(([m, v]) => (<div key={m} className='flex-1 flex flex-col items-center gap-1'><span className='text-[10px] text-[#6B7280]'>{v}</span><div className='w-full bg-[#C8A45D] rounded-t' style={{ height: `${Math.max((v / maxMonth) * 120, 2)}px` }} /><span className='text-[9px] text-[#9CA3AF] truncate w-full text-center'>{m}</span></div>))}</div>
      </Card>
      <Card className='p-4'><CardTitle className='text-sm font-semibold mb-3'>Cabinets récents</CardTitle>
        <div className='space-y-3'>{(data.recentTenants || []).slice(0, 5).map(t => { const userCount = t._count?.users ?? 0; return (<div key={t.id} className='flex items-center justify-between'><div><p className='text-sm font-medium text-[#111827]'>{t.name}</p><p className='text-xs text-[#9CA3AF]'>{userCount} utilisateur{userCount > 1 ? 's' : ''} · {fmtDate(t.createdAt)}</p></div>{t.subscription?.plan && <Badge className='bg-[#E8F0F8] text-[#1E5A8A] text-[10px]'>{t.subscription.plan.name}</Badge>}</div>) })}</div>
      </Card>
    </div>
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
      <Card className='p-4'><CardTitle className='text-sm font-semibold mb-4'>Distribution par plan</CardTitle>
        <div className='space-y-3'>{(data.tenantsByPlan || []).map(p => (<div key={p.plan}><div className='flex justify-between text-xs mb-1'><span className='text-[#374151]'>{p.plan}</span><span className='text-[#6B7280]'>{p._count.id}</span></div><div className='h-2 bg-[#F3F4F6] rounded-full overflow-hidden'><div className='h-full bg-[#C8A45D] rounded-full' style={{ width: `${(p._count.id / maxPlan) * 100}%` }} /></div></div>))}</div>
      </Card>
      <Card className='p-4'><CardTitle className='text-sm font-semibold mb-4'>Distribution par rôle</CardTitle>
        <div className='space-y-3'>{(data.usersByRole || []).map(r => (<div key={r.role}><div className='flex justify-between text-xs mb-1'><span className='text-[#374151]'>{ROLE_LABELS[r.role] || r.role}</span><span className='text-[#6B7280]'>{r._count.id}</span></div><div className='h-2 bg-[#F3F4F6] rounded-full overflow-hidden'><div className='h-full bg-[#1E5A8A] rounded-full' style={{ width: `${(r._count.id / maxRole) * 100}%` }} /></div></div>))}</div>
      </Card>
    </div>
  </div>)
}
