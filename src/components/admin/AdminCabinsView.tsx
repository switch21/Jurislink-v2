'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building as BuildingIcon, CreditCard as CreditCardIcon, Users, Briefcase, Archive, UserCircle, Search, RefreshCw, CreditCard, Edit, Trash2, ArrowUpDown, ArrowUpRight, AlertOctagon, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { fmtDate, fmtMoney } from '@/lib/helpers'
import { toast } from '@/hooks/use-toast'
import type { AdminTenant } from '@/types'
import { EmptyState } from '@/components/layout/EmptyState'
import { TenantRow } from './TenantRow'

export default function AdminCabinsView() {
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [subDialogOpen, setSubDialogOpen] = useState(false)
  const [subTarget, setSubTarget] = useState<AdminTenant | null>(null)
  const [subPlanId, setSubPlanId] = useState('')
  const [subPeriod, setSubPeriod] = useState('annual')
  const [editing, setEditing] = useState<AdminTenant | null>(null)
  const [form, setForm] = useState({ name: '', slug: '', email: '', phone: '', address: '', city: '', country: '', niu: '', plan: 'starter', maxUsers: 5, maxStorageGb: 5, isActive: true })
  const qc = useQueryClient()
  const { data, isLoading } = useQuery<{ tenants: AdminTenant[]; total: number }>({ queryKey: ['admin-tenants', showInactive], queryFn: () => fetch(`/api/tenants?includeInactive=${showInactive}`).then(r => r.json()) })
  const tenants = (data?.tenants || []).filter(t => !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.toLowerCase().includes(search.toLowerCase()))
  const allTenants = data?.tenants || []
  const totalActive = allTenants.filter(t => t.isActive).length
  const totalInactive = allTenants.filter(t => !t.isActive).length
  const totalUsers = allTenants.reduce((s, t) => s + (t._count?.users ?? 0), 0)
  const totalCases = allTenants.reduce((s, t) => s + (t._count?.cases ?? 0), 0)
  const totalClients = allTenants.reduce((s, t) => s + (t._count?.clients ?? 0), 0)
  const plansMap: Record<string, number> = {}
  for (const t of allTenants) { const p = t.subscription?.plan?.name || t.plan; plansMap[p] = (plansMap[p] || 0) + 1 }
  const topByCases = [...allTenants].sort((a, b) => (b._count?.cases ?? 0) - (a._count?.cases ?? 0)).slice(0, 3)
  const saveMut = useMutation({
    mutationFn: async (f: typeof form) => {
      if (editing) { const r = await fetch(`/api/tenants/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) }); if (!r.ok) throw new Error(); return r.json() }
      const r = await fetch('/api/tenants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) }); if (!r.ok) throw new Error(); return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-tenants'] }); toast.success(editing ? 'Cabinet modifié' : 'Cabinet créé'); setDialogOpen(false) },
    onError: () => toast.error('Erreur lors de la sauvegarde')
  })
  const delMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/tenants/${id}`, { method: 'DELETE' }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-tenants'] }); toast.success('Cabinet supprimé') },
    onError: () => toast.error('Erreur lors de la suppression')
  })
  const { data: plans } = useQuery<Array<{ id: string; name: string; slug: string; priceAnnual: number; priceSemiAnnual: number; priceQuarterly: number; priceMonthly: number; maxUsers: number; maxStorageGb: number; isActive: boolean }>>({ queryKey: ['admin-plans-subs'], queryFn: () => fetch('/api/subscription-plans').then(r => r.json()) })
  const subMut = useMutation({
    mutationFn: (body: { tenantId: string; planId: string; billingPeriod: string; action: string }) =>
      fetch('/api/subscriptions/admin', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => { if (!r.ok) throw new Error(); return r.json() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-tenants'] }); toast.success('Abonnement mis à jour'); setSubDialogOpen(false) },
    onError: () => toast.error("Erreur lors de la mise à jour de l'abonnement")
  })
  const openSubDialog = (t: AdminTenant) => {
    setSubTarget(t)
    setSubPlanId(t.subscription?.plan?.id || '')
    setSubPeriod(t.subscription?.billingPeriod || 'annual')
    setSubDialogOpen(true)
  }
  const handleSubAction = (action: string) => {
    if (!subTarget || !subPlanId) return
    subMut.mutate({ tenantId: subTarget.id, planId: subPlanId, billingPeriod: subPeriod, action })
  }
  const subDaysLeft = (t: AdminTenant) => {
    if (!t.subscription?.currentPeriodEnd) return null
    const end = new Date(t.subscription.currentPeriodEnd)
    const diff = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return diff
  }
  const periodLabels: Record<string, string> = { monthly: 'Mensuel', quarterly: 'Trimestriel', semi_annual: 'Semestriel', annual: 'Annuel' }
  const openCreate = () => { setEditing(null); setForm({ name: '', slug: '', email: '', phone: '', address: '', city: '', country: '', niu: '', plan: 'starter', maxUsers: 5, maxStorageGb: 5, isActive: true }); setDialogOpen(true) }
  const openEdit = (t: AdminTenant) => { setEditing(t); setForm({ name: t.name, slug: t.slug, email: t.email || '', phone: t.phone || '', address: t.address || '', city: t.city || '', country: t.country || '', niu: t.niu || '', plan: t.plan, maxUsers: t.maxUsers, maxStorageGb: t.maxStorageGb, isActive: t.isActive }); setDialogOpen(true) }
  const genSlug = (name: string) => name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  const kpis = [
    { label: 'Cabinets actifs', value: totalActive, icon: BuildingIcon, color: 'text-[#1E5A8A]', bg: 'bg-[#E8F0F8]', ring: 'ring-[#1E5A8A]/10' },
    { label: 'Cabinets inactifs', value: totalInactive, icon: Archive, color: 'text-[#9CA3AF]', bg: 'bg-[#F3F4F6]', ring: 'ring-[#9CA3AF]/10' },
    { label: 'Total utilisateurs', value: totalUsers, icon: Users, color: 'text-[#059669]', bg: 'bg-[#D1FAE5]', ring: 'ring-[#059669]/10' },
    { label: 'Total dossiers', value: totalCases, icon: Briefcase, color: 'text-[#C8A45D]', bg: 'bg-[#FEF3C7]', ring: 'ring-[#C8A45D]/10' },
    { label: 'Total clients', value: totalClients, icon: UserCircle, color: 'text-[#7C3AED]', bg: 'bg-[#EDE9FE]', ring: 'ring-[#7C3AED]/10' },
    { label: 'Types de forfaits', value: Object.keys(plansMap).length, icon: CreditCardIcon, color: 'text-[#D97706]', bg: 'bg-[#FEF3C7]', ring: 'ring-[#D97706]/10' },
  ]
  return (<div className='p-6 space-y-6'>
    <div className='flex items-center justify-between flex-wrap gap-3'>
      <div>
        <h2 className='text-lg font-bold text-[#111827]'>Cabinets</h2>
        <p className='text-xs text-[#9CA3AF] mt-0.5'>{allTenants.length} cabinet{allTenants.length !== 1 ? 's' : ''} enregistré{allTenants.length !== 1 ? 's' : ''} au total</p>
      </div>
      <Button onClick={openCreate} className='bg-[#1E5A8A] hover:bg-[#164070] text-white'><BuildingIcon className='size-4 mr-2' />Nouveau cabinet</Button>
    </div>

    {/* KPI Cards */}
    <div className='grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4'>
      {kpis.map((k, i) => (
        <Card key={i} className='relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow'>
          <CardContent className='p-4'>
            <div className='flex items-start justify-between mb-3'>
              <div className={cn('p-2.5 rounded-xl ring-1', k.bg, k.ring)}><k.icon className={cn('size-5', k.color)} /></div>
              <div className={cn('size-2 rounded-full mt-1', k.value > 0 ? 'bg-[#059669]' : 'bg-[#E5E7EB]')} title={k.value > 0 ? 'Données disponibles' : 'Aucune donnée'} />
            </div>
            <p className={cn('text-2xl font-bold tracking-tight', k.color)}>{k.value.toLocaleString('fr-FR')}</p>
            <p className='text-[11px] text-[#9CA3AF] mt-1 font-medium'>{k.label}</p>
          </CardContent>
          <div className={cn('absolute bottom-0 left-0 right-0 h-0.5', k.bg.replace('bg-[', 'bg-').replace(']', ''))} style={{ background: k.color.includes('#1E5A8A') ? '#1E5A8A' : k.color.includes('#9CA3AF') ? '#9CA3AF' : k.color.includes('#059669') ? '#059669' : k.color.includes('#C8A45D') ? '#C8A45D' : k.color.includes('#7C3AED') ? '#7C3AED' : '#D97706' }} />
        </Card>
      ))}
    </div>

    {/* Plan Distribution + Top Cabinets */}
    <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
      <Card><CardHeader className='pb-3'><CardTitle className='text-sm font-semibold'>Répartition par forfait</CardTitle></CardHeader><CardContent className='space-y-2.5'>
        {Object.entries(plansMap).sort((a, b) => b[1] - a[1]).map(([plan, count]) => {
          const pct = allTenants.length > 0 ? Math.round((count / allTenants.length) * 100) : 0
          const planColors: Record<string, string> = { starter: 'bg-[#9CA3AF]', standard: 'bg-[#1E5A8A]', premium: 'bg-[#C8A45D]', entreprise: 'bg-[#7C3AED]', professional: 'bg-[#059669]', free: 'bg-[#D1D5DB]' }
          return (<div key={plan} className='flex items-center gap-3'><span className='text-xs text-[#374151] w-28 truncate'>{plan}</span><div className='flex-1 h-2.5 bg-[#F3F4F6] rounded-full overflow-hidden'><div className={cn('h-full rounded-full transition-all', planColors[plan] || 'bg-[#1E5A8A]')} style={{ width: pct + '%' }} /></div><span className='text-xs font-medium text-[#374151] w-16 text-right'>{count} ({pct}%)</span></div>)
        })}
        {Object.keys(plansMap).length === 0 && <p className='text-xs text-[#9CA3AF] text-center py-4'>Aucun cabinet</p>}
      </CardContent></Card>
      <Card><CardHeader className='pb-3'><CardTitle className='text-sm font-semibold'>Top 3 cabinets par dossiers</CardTitle></CardHeader><CardContent className='space-y-3'>
        {topByCases.map((t, i) => (<div key={t.id} className='flex items-center gap-3 p-3 rounded-lg bg-[#F9FAFB]'><div className={cn('flex items-center justify-center size-8 rounded-full text-sm font-bold', i === 0 ? 'bg-[#C8A45D] text-white' : i === 1 ? 'bg-[#9CA3AF] text-white' : 'bg-[#CD7F32] text-white')}>{i + 1}</div><div className='flex-1 min-w-0'><p className='text-sm font-medium text-[#111827] truncate'>{t.name}</p><p className='text-[10px] text-[#9CA3AF]'>{t._count?.users ?? 0} utilisateurs · {t.subscription?.plan?.name || t.plan}</p></div><div className='text-right'><p className='text-lg font-bold text-[#1E5A8A]'>{t._count?.cases ?? 0}</p><p className='text-[10px] text-[#9CA3AF]'>dossiers</p></div></div>))}
        {topByCases.length === 0 && <p className='text-xs text-[#9CA3AF] text-center py-4'>Aucun cabinet</p>}
      </CardContent></Card>
    </div>

    {/* Search + Table */}
    <div className='flex items-center gap-3 flex-wrap'>
      <div className='relative flex-1 min-w-[200px] max-w-sm'><Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9CA3AF]' /><Input placeholder='Rechercher…' value={search} onChange={e => setSearch(e.target.value)} className='pl-9 h-9' /></div>
      <label className='flex items-center gap-2 text-sm text-[#374151] cursor-pointer'><Switch checked={showInactive} onCheckedChange={setShowInactive} /><span>Voir inactifs</span></label>
    </div>
    {isLoading ? <div className='space-y-2'>{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className='h-12' />)}</div> :
    <Card><CardContent className='p-0'><div className='max-h-[480px] overflow-y-auto'><Table><TableHeader><TableRow><TableHead>Nom</TableHead><TableHead className='hidden sm:table-cell'>Abonnement</TableHead><TableHead>Utilisateurs</TableHead><TableHead>Dossiers</TableHead><TableHead className='hidden md:table-cell'>Clients</TableHead><TableHead className='hidden lg:table-cell'>Factures</TableHead><TableHead className='hidden lg:table-cell'>Créé le</TableHead><TableHead className='w-[100px]'>Actions</TableHead></TableRow></TableHeader><TableBody>
      {tenants.length === 0 ? <TableRow><TableCell colSpan={8}><EmptyState icon={BuildingIcon} title='Aucun cabinet' /></TableCell></TableRow> :
      tenants.map(t => (<TenantRow key={t.id} t={t} subDaysLeft={subDaysLeft} openSubDialog={openSubDialog} openEdit={openEdit} delMut={delMut} />))}
    </TableBody></Table></div></CardContent></Card>}
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className='max-w-lg max-h-[90vh] overflow-y-auto'><DialogHeader><DialogTitle>{editing ? 'Modifier le cabinet' : 'Nouveau cabinet'}</DialogTitle></DialogHeader>
      <div className='space-y-3'>
        <div><Label>Nom *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value, slug: genSlug(e.target.value) })} /></div>
        <div><Label>Slug</Label><Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></div>
        <div className='grid grid-cols-2 gap-3'><div><Label>Email</Label><Input type='email' value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div><div><Label>Téléphone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div></div>
        <div><Label>Adresse</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
        <div className='grid grid-cols-2 gap-3'><div><Label>Ville</Label><Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div><div><Label>Pays</Label><Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} /></div></div>
        <div className='grid grid-cols-2 gap-3'><div><Label>NIU</Label><Input value={form.niu} onChange={e => setForm({ ...form, niu: e.target.value })} /></div><div><Label>Plan</Label><Select value={form.plan} onValueChange={v => setForm({ ...form, plan: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value='starter'>Starter</SelectItem><SelectItem value='standard'>Standard</SelectItem><SelectItem value='premium'>Premium</SelectItem><SelectItem value='entreprise'>Entreprise</SelectItem></SelectContent></Select></div></div>
        <div className='grid grid-cols-2 gap-3'><div><Label>Max utilisateurs</Label><Input type='number' value={form.maxUsers} onChange={e => setForm({ ...form, maxUsers: Number(e.target.value) })} /></div><div><Label>Max stockage (Go)</Label><Input type='number' value={form.maxStorageGb} onChange={e => setForm({ ...form, maxStorageGb: Number(e.target.value) })} /></div></div>
        <label className='flex items-center gap-2 cursor-pointer'><Switch checked={form.isActive} onCheckedChange={v => setForm({ ...form, isActive: v })} /><span className='text-sm'>Actif</span></label>
      </div>
      <DialogFooter><Button variant='outline' onClick={() => setDialogOpen(false)}>Annuler</Button><Button className='bg-[#1E5A8A] hover:bg-[#164070] text-white' disabled={!form.name || saveMut.isPending} onClick={() => saveMut.mutate(form)}>{saveMut.isPending ? <RefreshCw className='size-4 animate-spin' /> : (editing ? 'Modifier' : 'Créer')}</Button></DialogFooter>
    </DialogContent></Dialog>
    {/* Subscription Management Dialog */}
    <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}><DialogContent className='max-w-lg max-h-[90vh] overflow-y-auto'><DialogHeader><DialogTitle className='flex items-center gap-2'><CreditCard className='size-5 text-[#1E5A8A]' />Gérer l'abonnement</DialogTitle><DialogDescription>{subTarget?.name}</DialogDescription></DialogHeader>
      {subTarget && (<div className='space-y-4'>
        {/* Current subscription summary */}
        {subTarget.subscription && (<Card className='border border-[#E5E7EB]'><CardContent className='p-3 space-y-2'>
          <div className='flex items-center justify-between'><span className='text-xs text-[#9CA3AF]'>Forfait actuel</span><Badge className='bg-[#E8F0F8] text-[#1E5A8A] text-xs'>{subTarget.subscription.plan.name}</Badge></div>
          <div className='flex items-center justify-between'><span className='text-xs text-[#9CA3AF]'>Statut</span><Badge className={cn('text-xs', subTarget.subscription.status === 'active' ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#991B1B]')}>{subTarget.subscription.status === 'active' ? 'Actif' : subTarget.subscription.status === 'expired' ? 'Expiré' : subTarget.subscription.status}</Badge></div>
          <div className='flex items-center justify-between'><span className='text-xs text-[#9CA3AF]'>Période</span><span className='text-xs font-medium text-[#374151]'>{periodLabels[subTarget.subscription.billingPeriod] || subTarget.subscription.billingPeriod}</span></div>
          {subTarget.subscription.currentPeriodEnd && (<>
            <div className='flex items-center justify-between'><span className='text-xs text-[#9CA3AF]'>Fin le</span><span className='text-xs font-medium text-[#374151]'>{new Date(subTarget.subscription.currentPeriodEnd).toLocaleDateString('fr-FR')}</span></div>
            <div className='flex items-center justify-between'><span className='text-xs text-[#9CA3AF]'>Jours restants</span><span className={cn('text-xs font-bold', (subDaysLeft(subTarget) ?? 0) <= 0 ? 'text-[#DC2626]' : (subDaysLeft(subTarget) ?? 0) <= 15 ? 'text-[#D97706]' : 'text-[#059669]')}>{subDaysLeft(subTarget) !== null ? (subDaysLeft(subTarget)! <= 0 ? 'Expiré' : subDaysLeft(subTarget) + ' jours') : '—'}</span></div>
          </>)}
          {!subTarget.isActive && (<div className='mt-2 p-2 rounded-lg bg-[#FEE2E2] border border-[#FECACA]'><p className='text-xs text-[#991B1B] font-medium flex items-center gap-1.5'><AlertOctagon className='size-3.5' />Ce cabinet est désactivé. Toute action réactivera le cabinet.</p></div>)}
        </CardContent></Card>)}
        {!subTarget.subscription && (<div className='p-3 rounded-lg bg-[#FEF3C7] border border-[#FDE68A]'><p className='text-xs text-[#92400E] flex items-center gap-1.5'><AlertTriangle className='size-3.5' />Aucun abonnement actif. Sélectionnez un forfait ci-dessous.</p></div>)}

        {/* Plan selection */}
        <div className='space-y-1.5'><Label className='text-xs font-medium'>Nouveau forfait</Label><Select value={subPlanId} onValueChange={setSubPlanId}><SelectTrigger className='h-9'><SelectValue placeholder='Sélectionner un forfait…' /></SelectTrigger><SelectContent>{(plans || []).filter(p => p.isActive).map(p => (<SelectItem key={p.id} value={p.id}><div className='flex items-center justify-between gap-4 w-full'><span>{p.name}</span><span className='text-[10px] text-[#9CA3AF]'>{fmtMoney(p.priceAnnual)}/an · {p.maxUsers} users</span></div></SelectItem>))}</SelectContent></Select></div>

        {/* Billing period */}
        <div className='space-y-1.5'><Label className='text-xs font-medium'>Période de facturation</Label><div className='grid grid-cols-2 gap-2'>{Object.entries(periodLabels).map(([k, v]) => (<button key={k} type='button' onClick={() => setSubPeriod(k)} className={cn('p-2.5 rounded-lg border text-xs font-medium transition-all text-center', subPeriod === k ? 'border-[#1E5A8A] bg-[#E8F0F8] text-[#1E5A8A]' : 'border-[#E5E7EB] text-[#6B7280] hover:border-[#9CA3AF]')}>{v}</button>))}</div></div>

        {/* Action buttons */}
        <div className='space-y-2 pt-2'>
          <p className='text-xs text-[#9CA3AF] font-medium'>Choisir une action :</p>
          <div className='grid grid-cols-1 gap-2'>
            <Button className='bg-[#059669] hover:bg-[#047857] text-white w-full justify-start gap-2 h-10' disabled={!subPlanId || subMut.isPending} onClick={() => handleSubAction('renew')}>{subMut.isPending ? <RefreshCw className='size-4 animate-spin' /> : <RefreshCw className='size-4' />}<div className='text-left'><div className='text-sm font-medium'>Renouveler</div><div className='text-[10px] opacity-80'>Prolonge la période actuelle (même forfait, durée ajoutée)</div></div></Button>
            <Button className='bg-[#1E5A8A] hover:bg-[#164070] text-white w-full justify-start gap-2 h-10' disabled={!subPlanId || subMut.isPending} onClick={() => handleSubAction('change')}>{subMut.isPending ? <RefreshCw className='size-4 animate-spin' /> : <ArrowUpDown className='size-4' />}<div className='text-left'><div className='text-sm font-medium'>Changer de forfait</div><div className='text-[10px] opacity-80'>Nouveau forfait, nouvelle période depuis aujourd'hui</div></div></Button>
            <Button className='bg-[#C8A45D] hover:bg-[#B08D3F] text-white w-full justify-start gap-2 h-10' disabled={!subPlanId || subMut.isPending} onClick={() => handleSubAction('upgrade')}>{subMut.isPending ? <RefreshCw className='size-4 animate-spin' /> : <ArrowUpRight className='size-4' />}<div className='text-left'><div className='text-sm font-medium'>Upgrader</div><div className='text-[10px] opacity-80'>Forfait supérieur, période prolongée depuis la fin actuelle</div></div></Button>
          </div>
        </div>
      </div>)}
    </DialogContent></Dialog>
  </div>)
}
