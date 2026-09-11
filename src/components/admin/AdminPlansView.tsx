'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCard as CreditCardIcon, Edit, Trash2, CheckCircle2, RefreshCw, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { fmtMoney } from '@/lib/helpers'
import { toast } from '@/hooks/use-toast'
import { EmptyState } from '@/components/layout/EmptyState'

export default function AdminPlansView() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [featuresText, setFeaturesText] = useState('')
  const [form, setForm] = useState({ name: '', slug: '', description: '', priceAnnual: 0, priceSemiAnnual: 0, priceQuarterly: 0, priceMonthly: 0, currencyCode: 'XAF', maxUsers: 5, maxStorageGb: 5, hasAI: false, isActive: true, sortOrder: 0 })
  const qc = useQueryClient()
  const { data: plans, isLoading } = useQuery<any[]>({ queryKey: ['admin-plans'], queryFn: () => fetch('/api/subscription-plans').then(r => r.json()) })
  const saveMut = useMutation({
    mutationFn: async (f: any) => {
      const payload = { ...f, features: JSON.stringify(featuresText.split('\n').filter(Boolean)) }
      if (editing) { const r = await fetch(`/api/subscription-plans/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!r.ok) throw new Error(); return r.json() }
      const r = await fetch('/api/subscription-plans', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!r.ok) throw new Error(); return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-plans'] }); toast.success(editing ? 'Forfait modifié' : 'Forfait créé'); setDialogOpen(false) },
    onError: (e: any) => toast.error(e.message || 'Erreur')
  })
  const delMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/subscription-plans/${id}`, { method: 'DELETE' }).then(r => { if (!r.ok) throw new Error('Impossible de supprimer ce forfait (abonnements actifs)'); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-plans'] }); toast.success('Forfait supprimé') },
    onError: (e: Error) => toast.error(e.message)
  })
  const openCreate = () => { setEditing(null); setForm({ name: '', slug: '', description: '', priceAnnual: 0, priceSemiAnnual: 0, priceQuarterly: 0, priceMonthly: 0, currencyCode: 'XAF', maxUsers: 5, maxStorageGb: 5, hasAI: false, isActive: true, sortOrder: 0 }); setFeaturesText(''); setDialogOpen(true) }
  const openEdit = (p: any) => { setEditing(p); setForm({ name: p.name, slug: p.slug, description: p.description || '', priceAnnual: p.priceAnnual || 0, priceSemiAnnual: p.priceSemiAnnual || 0, priceQuarterly: p.priceQuarterly || 0, priceMonthly: p.priceMonthly || 0, currencyCode: p.currencyCode || 'XAF', maxUsers: p.maxUsers || 5, maxStorageGb: p.maxStorageGb || 5, hasAI: p.hasAI || false, isActive: p.isActive ?? true, sortOrder: p.sortOrder || 0 }); try { setFeaturesText((JSON.parse(p.features || '[]') as string[]).join('\n')) } catch { setFeaturesText('') }; setDialogOpen(true) }
  const parseFeatures = (f: string) => { try { return JSON.parse(f || '[]') as string[] } catch { return [] } }
  return (<div className='p-6 space-y-4'>
    <div className='flex items-center justify-between flex-wrap gap-3'>
      <h2 className='text-lg font-bold text-[#111827]'>Abonnements</h2>
      <Button onClick={openCreate} className='bg-[#1E5A8A] hover:bg-[#164070] text-white'><CreditCardIcon className='size-4 mr-2' />Nouveau forfait</Button>
    </div>
    {isLoading ? <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className='h-72 rounded-xl' />)}</div> :
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
      {(plans || []).map((p: any) => (<Card key={p.id} className={cn('p-5 flex flex-col', !p.isActive && 'opacity-60')}><div className='flex items-start justify-between mb-3'><div><h3 className='text-base font-bold text-[#111827]'>{p.name}</h3><p className='text-xs text-[#9CA3AF] mt-0.5'>{p.description || ''}</p></div><div className='flex items-center gap-1'><Button variant='ghost' size='icon' className='size-7' onClick={() => openEdit(p)}><Edit className='size-3.5' /></Button><Button variant='ghost' size='icon' className='size-7 text-[#DC2626]' onClick={() => delMut.mutate(p.id)}><Trash2 className='size-3.5' /></Button></div></div>
        <div className='mb-3'><span className='text-2xl font-bold text-[#1E5A8A]'>{fmtMoney(p.priceAnnual)}</span><span className='text-xs text-[#9CA3AF]'>/an</span></div>
        {p.priceMonthly > 0 && <p className='text-[10px] text-[#9CA3AF] mb-3'>{fmtMoney(p.priceMonthly)}/mois · {fmtMoney(p.priceQuarterly || 0)}/trimestre · {fmtMoney(p.priceSemiAnnual || 0)}/semestre</p>}
        <div className='flex-1 space-y-1.5 mb-4'>{(parseFeatures(p.features) || []).slice(0, 6).map((f: string, i: number) => (<div key={i} className='flex items-center gap-2 text-xs text-[#374151]'><CheckCircle2 className='size-3 text-[#059669] shrink-0' /><span>{f}</span></div>))}</div>
        <div className='flex items-center gap-2 flex-wrap'><Badge className='bg-[#E8F0F8] text-[#1E5A8A] text-[10px]'>{p.maxUsers} utilisateurs</Badge><Badge className='bg-[#F3F4F6] text-[#6B7280] text-[10px]'>{p.maxStorageGb} Go</Badge>{p.hasAI && <Badge className='bg-[#C8A45D] text-white text-[10px]'>IA</Badge>}<Badge className={cn('text-[10px]', p.isActive ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#991B1B]')}>{p.isActive ? 'Actif' : 'Inactif'}</Badge></div>
      </Card>))}
      {(plans || []).length === 0 && <div className='col-span-full'><EmptyState icon={CreditCardIcon} title='Aucun forfait' /></div>}
    </div>}
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className='max-w-lg max-h-[90vh] overflow-y-auto'><DialogHeader><DialogTitle>{editing ? 'Modifier le forfait' : 'Nouveau forfait'}</DialogTitle></DialogHeader>
      <div className='space-y-3'>
        <div className='grid grid-cols-2 gap-3'><div><Label>Nom *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div><div><Label>Slug</Label><Input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></div></div>
        <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} /></div>
        <div className='grid grid-cols-2 gap-3'><div><Label>Prix annuel</Label><Input type='number' value={form.priceAnnual} onChange={e => setForm({ ...form, priceAnnual: Number(e.target.value) })} /></div><div><Label>Devise</Label><Input value={form.currencyCode} onChange={e => setForm({ ...form, currencyCode: e.target.value })} /></div></div>
        <div className='grid grid-cols-3 gap-3'><div><Label>Semi-annuel</Label><Input type='number' value={form.priceSemiAnnual} onChange={e => setForm({ ...form, priceSemiAnnual: Number(e.target.value) })} /></div><div><Label>Trimestriel</Label><Input type='number' value={form.priceQuarterly} onChange={e => setForm({ ...form, priceQuarterly: Number(e.target.value) })} /></div><div><Label>Mensuel</Label><Input type='number' value={form.priceMonthly} onChange={e => setForm({ ...form, priceMonthly: Number(e.target.value) })} /></div></div>
        <div className='grid grid-cols-3 gap-3'><div><Label>Max utilisateurs</Label><Input type='number' value={form.maxUsers} onChange={e => setForm({ ...form, maxUsers: Number(e.target.value) })} /></div><div><Label>Max stockage (Go)</Label><Input type='number' value={form.maxStorageGb} onChange={e => setForm({ ...form, maxStorageGb: Number(e.target.value) })} /></div><div><Label>Ordre</Label><Input type='number' value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) })} /></div></div>
        <label className='flex items-center gap-2 cursor-pointer'><Switch checked={form.hasAI} onCheckedChange={v => setForm({ ...form, hasAI: v })} /><span className='text-sm'>Inclut l'IA</span></label>
        <label className='flex items-center gap-2 cursor-pointer'><Switch checked={form.isActive} onCheckedChange={v => setForm({ ...form, isActive: v })} /><span className='text-sm'>Actif</span></label>
        <div><Label>Fonctionnalités (une par ligne)</Label><Textarea value={featuresText} onChange={e => setFeaturesText(e.target.value)} rows={4} placeholder={'Stockage illimité\nSupport prioritaire'} /></div>
      </div>
      <DialogFooter><Button variant='outline' onClick={() => setDialogOpen(false)}>Annuler</Button><Button className='bg-[#1E5A8A] hover:bg-[#164070] text-white' disabled={!form.name || saveMut.isPending} onClick={() => saveMut.mutate(form)}>{saveMut.isPending ? <RefreshCw className='size-4 animate-spin' /> : (editing ? 'Modifier' : 'Créer')}</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>)
}
