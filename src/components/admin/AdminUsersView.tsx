'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UsersRound, UserPlus, Search, Crown, Edit, Lock, ArrowUpDown, Trash2, RefreshCw, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ROLE_LABELS } from '@/lib/constants'
import { initials, fmtDateTime } from '@/lib/helpers'
import { toast } from '@/hooks/use-toast'
import type { UserItem, TenantItem } from '@/types'
import { EmptyState } from '@/components/layout/EmptyState'

export default function AdminUsersView() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [pwDialogOpen, setPwDialogOpen] = useState(false)
  const [pwTarget, setPwTarget] = useState<{ id: string; fullName: string } | null>(null)
  const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' })
  const [editing, setEditing] = useState<UserItem & { tenant?: { id: string; name: string } } | null>(null)
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', role: 'lawyer', tenantId: '', password: '', isActive: true })
  const qc = useQueryClient()
  const { data: tenantsData } = useQuery<TenantItem[]>({ queryKey: ['admin-tenants-list'], queryFn: () => fetch('/api/tenants?includeInactive=true').then(r => r.json()).then(d => d.tenants || []) })
  const { data, isLoading } = useQuery<{ users: (UserItem & { tenant?: { id: string; name: string }; lastLogin?: string })[]; total: number }>({ queryKey: ['admin-users', showInactive], queryFn: () => fetch(`/api/users?includeInactive=${showInactive}&includeRootAdmin=true`).then(r => r.json()) })
  const users = (data?.users || []).filter(u => {
    if (search && !u.fullName.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false
    if (roleFilter && u.role !== roleFilter) return false
    return true
  })
  const saveMut = useMutation({
    mutationFn: async (f: typeof form) => {
      const payload: Record<string, unknown> = { ...f }; if (!f.password) delete payload.password; if (!f.tenantId) delete payload.tenantId
      if (editing) { const r = await fetch(`/api/users/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!r.ok) throw new Error(); return r.json() }
      const r = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!r.ok) throw new Error(); return r.json()
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success(editing ? 'Utilisateur modifié' : 'Utilisateur créé'); setDialogOpen(false) },
    onError: () => toast.error('Erreur lors de la sauvegarde')
  })
  const delMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/users/${id}`, { method: 'DELETE' }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Utilisateur supprimé') },
    onError: () => toast.error('Erreur lors de la suppression')
  })
  const toggleMut = useMutation({
    mutationFn: (u: UserItem) => fetch(`/api/users/${u.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !u.isActive }) }).then(r => { if (!r.ok) throw new Error(); }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('Statut modifié') },
    onError: () => toast.error('Erreur')
  })
  const adminChangePw = useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string; newPassword: string }) =>
      fetch(`/api/users/${userId}/password`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ adminOverride: true, newPassword }) }).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Erreur'); return d }),
    onSuccess: () => { toast.success('Mot de passe modifié'); setPwDialogOpen(false); setPwForm({ newPassword: '', confirmPassword: '' }); setPwTarget(null) },
    onError: (e: Error) => toast.error(e.message),
  })
  const openPwDialog = (u: UserItem) => { setPwTarget({ id: u.id, fullName: u.fullName }); setPwForm({ newPassword: '', confirmPassword: '' }); setPwDialogOpen(true) }
  const openCreate = () => { setEditing(null); setForm({ fullName: '', email: '', phone: '', role: 'lawyer', tenantId: '', password: '', isActive: true }); setDialogOpen(true) }
  const openEdit = (u: UserItem & { tenant?: { id: string; name: string } }) => { setEditing(u); setForm({ fullName: u.fullName, email: u.email, phone: u.phone || '', role: u.role, tenantId: u.tenantId || '', password: '', isActive: u.isActive ?? true }); setDialogOpen(true) }
  return (<div className='p-6 space-y-4'>
    <div className='flex items-center justify-between flex-wrap gap-3'>
      <h2 className='text-lg font-bold text-[#111827]'>Utilisateurs</h2>
      <Button onClick={openCreate} className='bg-[#1E5A8A] hover:bg-[#164070] text-white'><UserPlus className='size-4 mr-2' />Nouvel utilisateur</Button>
    </div>
    <div className='flex items-center gap-3 flex-wrap'>
      <div className='relative flex-1 min-w-[200px] max-w-sm'><Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9CA3AF]' /><Input placeholder='Rechercher…' value={search} onChange={e => setSearch(e.target.value)} className='pl-9 h-9' /></div>
      <Select value={roleFilter} onValueChange={v => setRoleFilter(v)}><SelectTrigger className='w-[160px] h-9'><SelectValue placeholder='Rôle' /></SelectTrigger><SelectContent>{Object.entries(ROLE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select>
      <label className='flex items-center gap-2 text-sm text-[#374151] cursor-pointer'><Switch checked={showInactive} onCheckedChange={setShowInactive} /><span>Voir inactifs</span></label>
    </div>
    {isLoading ? <div className='space-y-2'>{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className='h-12' />)}</div> :
    <Card><Table><TableHeader><TableRow><TableHead>Nom</TableHead><TableHead>Email</TableHead><TableHead>Rôle</TableHead><TableHead>Cabinet</TableHead><TableHead>Statut</TableHead><TableHead>Dernière connexion</TableHead><TableHead className='w-[100px]'>Actions</TableHead></TableRow></TableHeader><TableBody>
      {users.length === 0 ? <TableRow><TableCell colSpan={7}><EmptyState icon={UsersRound} title='Aucun utilisateur' /></TableCell></TableRow> :
      users.map(u => (<TableRow key={u.id}><TableCell><div className='flex items-center gap-2'><Avatar className='size-7'><AvatarFallback className='bg-[#1E5A8A] text-white text-[10px]'>{initials(u.fullName)}</AvatarFallback></Avatar><span className='font-medium text-[#111827]'>{u.fullName}</span>{u.role === 'root_admin' && <Crown className='size-3.5 text-[#C8A45D]' />}</div></TableCell><TableCell className='text-[#6B7280]'>{u.email}</TableCell><TableCell><Badge className='bg-[#F3F4F6] text-[#374151] text-xs'>{ROLE_LABELS[u.role] || u.role}</Badge></TableCell><TableCell className='text-[#6B7280]'>{u.tenant?.name || '—'}</TableCell><TableCell><Badge className={cn('text-xs', u.isActive ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#991B1B]')}>{u.isActive ? 'Actif' : 'Inactif'}</Badge></TableCell><TableCell className='text-[#6B7280] text-xs'>{fmtDateTime((u as UserItem & { lastLogin?: string }).lastLogin)}</TableCell><TableCell><div className='flex items-center gap-1'><Button variant='ghost' size='icon' className='size-7' onClick={() => openEdit(u as UserItem & { tenant?: { id: string; name: string } })}><Edit className='size-3.5' /></Button><Button variant='ghost' size='icon' className='size-7 text-[#1E5A8A] hover:text-[#164070]' onClick={() => openPwDialog(u)}><Lock className='size-3.5' /></Button>{u.role !== 'root_admin' && <><Button variant='ghost' size='icon' className={cn('size-7', u.isActive ? 'text-[#F59E0B]' : 'text-[#059669]')} onClick={() => toggleMut.mutate(u)}><ArrowUpDown className='size-3.5' /></Button><Button variant='ghost' size='icon' className='size-7 text-[#DC2626]' onClick={() => delMut.mutate(u.id)}><Trash2 className='size-3.5' /></Button></>}</div></TableCell></TableRow>))}
    </TableBody></Table></Card>}
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className='max-w-lg max-h-[90vh] overflow-y-auto'><DialogHeader><DialogTitle>{editing ? "Modifier l'utilisateur" : 'Nouvel utilisateur'}</DialogTitle></DialogHeader>
      <div className='space-y-3'>
        <div><Label>Nom complet *</Label><Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} /></div>
        <div><Label>Email *</Label><Input type='email' value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
        <div className='grid grid-cols-2 gap-3'><div><Label>Téléphone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div><div><Label>Rôle</Label><Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ROLE_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div></div>
        <div><Label>Cabinet</Label><Select value={form.tenantId} onValueChange={v => setForm({ ...form, tenantId: v })}><SelectTrigger><SelectValue placeholder='Sélectionner…' /></SelectTrigger><SelectContent><SelectItem value=''>Aucun (root_admin)</SelectItem>{(tenantsData || []).map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>
        {!editing && <div><Label>Mot de passe *</Label><Input type='password' value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>}
        <label className='flex items-center gap-2 cursor-pointer'><Switch checked={form.isActive} onCheckedChange={v => setForm({ ...form, isActive: v })} /><span className='text-sm'>Actif</span></label>
      </div>
      <DialogFooter><Button variant='outline' onClick={() => setDialogOpen(false)}>Annuler</Button><Button className='bg-[#1E5A8A] hover:bg-[#164070] text-white' disabled={(!form.fullName || !form.email || (!editing && !form.password)) || saveMut.isPending} onClick={() => saveMut.mutate(form)}>{saveMut.isPending ? <RefreshCw className='size-4 animate-spin' /> : (editing ? 'Modifier' : 'Créer')}</Button></DialogFooter>
    </DialogContent></Dialog>
    <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}><DialogContent className='max-w-sm'><DialogHeader><DialogTitle>Modifier le mot de passe</DialogTitle><DialogDescription>Pour : <span className='font-semibold'>{pwTarget?.fullName}</span></DialogDescription></DialogHeader>
      <div className='space-y-3'>
        <div><Label>Nouveau mot de passe *</Label><Input type='password' value={pwForm.newPassword} onChange={e => setPwForm({ ...pwForm, newPassword: e.target.value })} placeholder='Min. 6 caractères' /></div>
        <div><Label>Confirmer *</Label><Input type='password' value={pwForm.confirmPassword} onChange={e => setPwForm({ ...pwForm, confirmPassword: e.target.value })} placeholder='••••••••' /></div>
        {pwForm.newPassword && pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && <p className='text-xs text-[#DC2626]'>Les mots de passe ne correspondent pas</p>}
      </div>
      <DialogFooter><Button variant='outline' onClick={() => setPwDialogOpen(false)}>Annuler</Button><Button className='bg-[#1E5A8A] hover:bg-[#164070] text-white' disabled={adminChangePw.isPending || !pwForm.newPassword || pwForm.newPassword.length < 6 || pwForm.newPassword !== pwForm.confirmPassword} onClick={() => pwTarget && adminChangePw.mutate({ userId: pwTarget.id, newPassword: pwForm.newPassword })}>{adminChangePw.isPending ? <RefreshCw className='size-4 animate-spin' /> : <Check className='size-4 mr-1.5' />}Modifier</Button></DialogFooter>
    </DialogContent></Dialog>
  </div>)
}
