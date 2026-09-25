'use client'

import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'
import { STATUS_COLORS, STATUS_LABELS, TYPE_LABELS, RISK_COLORS } from '@/lib/constants'
import { fmtDate, fmtMoney, initials } from '@/lib/helpers'
import type { Client, CaseItem, Invoice } from '@/types'
import { EmptyState } from '@/components/layout/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from '@/components/ui/alert-dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Plus, Search, Edit, Trash2, Users, Mail, Phone, MapPin, Building2, Briefcase, Receipt, Globe, KeyRound, ShieldCheck, ShieldX, Copy, Check, MoreVertical, Loader2 } from 'lucide-react'

interface PortalAccount {
  id: string
  email: string
  isActive: boolean
  clientId: string
  tenantId: string
  createdAt: string
  client?: { id: string; fullName: string; company?: string; email?: string }
  generatedPassword?: string
}

export default function ClientsView() {
  const { user, setCurrentView } = useAppStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [form, setForm] = useState({ fullName: '', company: '', email: '', phone: '', address: '', city: '', country: 'Cameroun', notes: '', clientType: 'particulier', niu: '', riskLevel: 'faible', source: '', isActive: true })

  // Portal state
  const [credentialsOpen, setCredentialsOpen] = useState(false)
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const [resetPwOpen, setResetPwOpen] = useState(false)
  const [resetPwResult, setResetPwResult] = useState<string>('')
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [deactivateClientId, setDeactivateClientId] = useState<string>('')
  const [copied, setCopied] = useState(false)

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients', user?.tenantId, search],
    queryFn: () => {
      const p = new URLSearchParams()
      if (user?.tenantId) p.set('tenantId', user.tenantId)
      if (search) p.set('search', search)
      return fetch(`/api/clients?${p}`).then(r => r.json())
    },
  })

  const { data: clientDetail } = useQuery({
    queryKey: ['client-detail', selectedClient?.id],
    queryFn: () => fetch(`/api/clients/${selectedClient!.id}?tenantId=${user?.tenantId}`).then(r => r.json()),
    enabled: !!selectedClient?.id && detailOpen,
  })

  // Fetch portal accounts
  const { data: portalAccounts } = useQuery({
    queryKey: ['client-portals', user?.tenantId],
    queryFn: () => fetch(`/api/clients/portal?tenantId=${user?.tenantId}`).then(r => r.json()) as Promise<PortalAccount[]>,
    enabled: !!user?.tenantId,
  })

  // Map clientId -> portal account for quick lookup
  const portalMap = useMemo(() => {
    const map = new Map<string, PortalAccount>()
    if (portalAccounts && Array.isArray(portalAccounts)) {
      for (const p of portalAccounts) {
        map.set(p.clientId, p)
      }
    }
    return map
  }, [portalAccounts])

  const createMut = useMutation({
    mutationFn: (body: Record<string, unknown>) => fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, tenantId: user?.tenantId }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Client créé'); setDialogOpen(false); resetForm() },
    onError: () => toast.error('Erreur lors de la création'),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, ...body }: Record<string, unknown>) => fetch(`/api/clients/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Client mis à jour'); setDialogOpen(false); resetForm() },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => fetch(`/api/clients/${id}`, { method: 'DELETE' }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); toast.success('Client supprimé') },
    onError: () => toast.error('Erreur lors de la suppression'),
  })

  // Activate portal mutation
  const activatePortalMut = useMutation({
    mutationFn: ({ clientId }: { clientId: string }) =>
      fetch('/api/clients/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, tenantId: user?.tenantId }),
      }).then(r => { if (!r.ok) return r.json().then(d => Promise.reject(d)); return r.json() }),
    onSuccess: (data: PortalAccount & { generatedPassword?: string }) => {
      qc.invalidateQueries({ queryKey: ['client-portals'] })
      setCredentials({ email: data.email, password: data.generatedPassword || '' })
      setCredentialsOpen(true)
      toast.success('Portail activé')
    },
    onError: (err: { error?: string }) => {
      toast.error(err?.error || "Erreur lors de l'activation du portail")
    },
  })

  // Reset password mutation
  const resetPwMut = useMutation({
    mutationFn: ({ clientId }: { clientId: string }) =>
      fetch('/api/clients/portal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, resetPassword: true }),
      }).then(r => { if (!r.ok) return r.json().then(d => Promise.reject(d)); return r.json() }),
    onSuccess: (data: { success: boolean; generatedPassword?: string }) => {
      qc.invalidateQueries({ queryKey: ['client-portals'] })
      setResetPwResult(data.generatedPassword || '')
      setResetPwOpen(true)
      toast.success('Mot de passe réinitialisé')
    },
    onError: (err: { error?: string }) => {
      toast.error(err?.error || 'Erreur lors de la réinitialisation')
    },
  })

  // Deactivate portal mutation
  const deactivatePortalMut = useMutation({
    mutationFn: ({ clientId }: { clientId: string }) =>
      fetch(`/api/clients/portal?clientId=${clientId}`, { method: 'DELETE' })
        .then(r => { if (!r.ok) return r.json().then(d => Promise.reject(d)); return r.json() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client-portals'] })
      toast.success('Portail désactivé')
    },
    onError: (err: { error?: string }) => {
      toast.error(err?.error || 'Erreur lors de la désactivation')
    },
  })

  const resetForm = () => { setForm({ fullName: '', company: '', email: '', phone: '', address: '', city: '', country: 'Cameroun', notes: '', clientType: 'particulier', niu: '', riskLevel: 'faible', source: '', isActive: true }); setEditing(null) }
  const openEdit = (c: Client) => { setEditing(c); setForm({ fullName: c.fullName, company: c.company || '', email: c.email || '', phone: c.phone || '', address: c.address || '', city: c.city || '', country: c.country || 'Cameroun', notes: c.notes || '', clientType: c.clientType || 'particulier', niu: c.niu || '', riskLevel: c.riskLevel || 'faible', source: c.source || '', isActive: c.isActive }); setDialogOpen(true) }
  const handleSubmit = () => {
    if (!form.fullName.trim()) return
    const payload = { ...form, company: form.company || null, email: form.email || null, phone: form.phone || null, address: form.address || null, city: form.city || null, niu: form.niu || null, notes: form.notes || null, source: form.source || null }
    if (editing) { updateMut.mutate({ id: editing.id, ...payload }) } else { createMut.mutate(payload) }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const selectedClientPortal = selectedClient ? portalMap.get(selectedClient.id) : null

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold">Clients</h2>
        <Button onClick={() => { resetForm(); setDialogOpen(true) }} size="sm"><Plus className="size-4 mr-1" />Nouveau client</Button>
      </div>

      <div className="relative max-w-xs"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-[#9CA3AF]" /><Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9 text-xs" /></div>

      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> :
        (clients || []).length === 0 ? <EmptyState icon={Users} title="Aucun client" description="Ajoutez votre premier client" /> :
        <Card><CardContent className="p-0"><div className="max-h-[500px] overflow-y-auto">
          <Table><TableHeader><TableRow>
            <TableHead>Nom</TableHead>
            <TableHead className="hidden md:table-cell">Type</TableHead>
            <TableHead className="hidden lg:table-cell">Ville</TableHead>
            <TableHead className="hidden md:table-cell">Risque</TableHead>
            <TableHead className="hidden sm:table-cell">Dossiers</TableHead>
            <TableHead className="hidden md:table-cell">Portail</TableHead>
            <TableHead className="w-28">Actions</TableHead>
          </TableRow></TableHeader><TableBody>
            {(clients || []).map((c: Client, i: number) => {
              const portal = portalMap.get(c.id)
              return (
                <TableRow key={c.id} className={cn(i % 2 === 1 && 'bg-[#F9FAFB]', 'cursor-pointer')} onClick={() => { setSelectedClient(c); setDetailOpen(true) }}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7"><AvatarFallback className="text-[10px] bg-[#F3F4F6]">{initials(c.fullName)}</AvatarFallback></Avatar>
                      <div><p className="text-sm font-medium">{c.fullName}</p>{c.company && <p className="text-[10px] text-[#9CA3AF]">{c.company}</p>}</div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell"><Badge variant="outline" className="text-[10px]">{c.clientType === 'entreprise' ? 'Entreprise' : 'Particulier'}</Badge></TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-[#6B7280]">{c.city || '—'}</TableCell>
                  <TableCell className="hidden md:table-cell"><Badge variant="outline" className={cn('text-[10px]', RISK_COLORS[c.riskLevel || 'faible'])}>{c.riskLevel === 'eleve' ? 'Élevé' : c.riskLevel === 'moyen' ? 'Moyen' : 'Faible'}</Badge></TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-[#6B7280]">{c._count?.cases || 0}</TableCell>
                  {/* Portal status column */}
                  <TableCell className="hidden md:table-cell" onClick={e => e.stopPropagation()}>
                    {portal ? (
                      <Badge className={cn('text-[10px] cursor-default', portal.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-100')}>
                        <ShieldCheck className="size-3 mr-0.5" />
                        {portal.isActive ? 'Activé' : 'Inactif'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-gray-400 cursor-default">Désactivé</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="size-7" onClick={() => openEdit(c)}><Edit className="size-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="size-7 text-[#EF4444] hover:text-[#DC2626]" onClick={() => deleteMut.mutate(c.id)}><Trash2 className="size-3.5" /></Button>
                      {/* Portal action button */}
                      {portal ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-7" title="Portail"><Globe className="size-3.5 text-emerald-600" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => resetPwMut.mutate({ clientId: c.id })} disabled={resetPwMut.isPending}>
                              <KeyRound className="size-3.5 mr-2" />
                              Réinitialiser mot de passe
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onClick={() => { setDeactivateClientId(c.id); setDeactivateOpen(true) }}>
                              <ShieldX className="size-3.5 mr-2" />
                              Désactiver le portail
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <Button variant="ghost" size="icon" className="size-7" title="Activer le portail" onClick={() => activatePortalMut.mutate({ clientId: c.id })} disabled={activatePortalMut.isPending}>
                          {activatePortalMut.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Globe className="size-3.5 text-[#9CA3AF]" />}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody></Table>
        </div></CardContent></Card>}

      {/* Create/Edit client dialog */}
      <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm() }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Modifier le client' : 'Nouveau client'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nom complet *</Label><Input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} /></div>
            <div><Label>Société</Label><Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div><Label>Téléphone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div><Label>Adresse</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Ville</Label><Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
              <div><Label>Pays</Label><Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Type</Label><Select value={form.clientType} onValueChange={v => setForm(f => ({ ...f, clientType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="particulier">Particulier</SelectItem><SelectItem value="entreprise">Entreprise</SelectItem></SelectContent></Select></div>
              <div><Label>NIU</Label><Input value={form.niu} onChange={e => setForm(f => ({ ...f, niu: e.target.value }))} placeholder="Numéro d'Identification Unique" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Niveau de risque</Label><Select value={form.riskLevel} onValueChange={v => setForm(f => ({ ...f, riskLevel: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="faible">Faible</SelectItem><SelectItem value="moyen">Moyen</SelectItem><SelectItem value="eleve">Élevé</SelectItem></SelectContent></Select></div>
              <div><Label>Source</Label><Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="bouche_a_oreille">Bouche à oreille</SelectItem><SelectItem value="internet">Internet</SelectItem><SelectItem value="recommandation">Recommandation</SelectItem><SelectItem value="autre">Autre</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button><Button onClick={handleSubmit} disabled={!form.fullName.trim() || createMut.isPending || updateMut.isPending}>{editing ? 'Enregistrer' : 'Créer'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Client detail dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Avatar className="size-10"><AvatarFallback className="bg-[#1E5A8A] text-white text-sm">{initials(selectedClient?.fullName || '')}</AvatarFallback></Avatar>
              <div><div>{selectedClient?.fullName}{selectedClient?.company && <span className="text-[#6B7280] font-normal"> — {selectedClient.company}</span>}</div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px]">{selectedClient?.clientType === 'entreprise' ? 'Entreprise' : 'Particulier'}</Badge>
                <Badge variant="outline" className={cn('text-[10px]', RISK_COLORS[selectedClient?.riskLevel || 'faible'])}>{selectedClient?.riskLevel === 'eleve' ? 'Élevé' : selectedClient?.riskLevel === 'moyen' ? 'Moyen' : 'Faible'}</Badge>
                {/* Portal status in detail view */}
                {selectedClientPortal ? (
                  <Badge className={cn('text-[10px]', selectedClientPortal.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-100')}>
                    <Globe className="size-3 mr-0.5" />
                    Portail {selectedClientPortal.isActive ? 'activé' : 'inactif'}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] text-gray-400">Portail désactivé</Badge>
                )}
              </div></div>
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2 text-xs text-[#6B7280] px-1 py-2">
            {selectedClient?.email && <div className="flex items-center gap-1.5"><Mail className="size-3" />{selectedClient.email}</div>}
            {selectedClient?.phone && <div className="flex items-center gap-1.5"><Phone className="size-3" />{selectedClient.phone}</div>}
            {selectedClient?.address && <div className="flex items-center gap-1.5"><MapPin className="size-3" />{selectedClient.address}</div>}
            {selectedClient?.city && <div className="flex items-center gap-1.5"><MapPin className="size-3" />{selectedClient.city}{selectedClient?.country ? `, ${selectedClient.country}` : ''}</div>}
            {selectedClient?.niu && <div className="flex items-center gap-1.5"><Building2 className="size-3" />NIU: {selectedClient.niu}</div>}
          </div>
          {/* Portal quick actions in detail */}
          {selectedClient && (
            <div className="px-1 pb-2 flex items-center gap-2">
              {selectedClientPortal ? (
                <>
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => resetPwMut.mutate({ clientId: selectedClient.id })} disabled={resetPwMut.isPending}>
                    <KeyRound className="size-3 mr-1" />
                    {resetPwMut.isPending ? 'Réinitialisation...' : 'Réinitialiser mot de passe portail'}
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs h-7 text-[#EF4444] hover:text-[#DC2626] border-[#EF4444]/30" onClick={() => { setDeactivateClientId(selectedClient.id); setDeactivateOpen(true) }}>
                    <ShieldX className="size-3 mr-1" />
                    Désactiver le portail
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" className="text-xs h-7 text-emerald-600 border-emerald-300 hover:bg-emerald-50" onClick={() => activatePortalMut.mutate({ clientId: selectedClient.id })} disabled={activatePortalMut.isPending}>
                  {activatePortalMut.isPending ? <Loader2 className="size-3 mr-1 animate-spin" /> : <Globe className="size-3 mr-1" />}
                  Activer le portail
                </Button>
              )}
            </div>
          )}
          <Tabs defaultValue="dossiers" className="flex-1 overflow-hidden">
            <TabsList className="w-full"><TabsTrigger value="dossiers">Dossiers ({(clientDetail?.cases || []).length})</TabsTrigger><TabsTrigger value="factures">Factures ({(clientDetail?.invoices || []).length})</TabsTrigger><TabsTrigger value="notes">Notes</TabsTrigger></TabsList>
            <TabsContent value="dossiers" className="mt-3 overflow-y-auto max-h-[45vh]">
              {(clientDetail?.cases || []).length === 0 ? <p className="text-sm text-[#9CA3AF] text-center py-8">Aucun dossier</p> :
              <div className="space-y-2">{(clientDetail?.cases || []).map((c: CaseItem) => (
                <div key={c.id} className="flex items-center gap-3 p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] cursor-pointer" onClick={() => { setDetailOpen(false); setCurrentView('cases') }}>
                  <Briefcase className="size-4 text-[#C8A45D] shrink-0" />
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium">{c.reference} — {c.title}</p><p className="text-[10px] text-[#9CA3AF]">{TYPE_LABELS[c.caseType] || c.caseType} • Créé le {fmtDate(c.createdAt)}</p></div>
                  <Badge variant="outline" className={cn('text-[10px] shrink-0', STATUS_COLORS[c.status])}>{STATUS_LABELS[c.status] || c.status}</Badge>
                </div>
              ))}</div>}
            </TabsContent>
            <TabsContent value="factures" className="mt-3 overflow-y-auto max-h-[45vh]">
              {(clientDetail?.invoices || []).length === 0 ? <p className="text-sm text-[#9CA3AF] text-center py-8">Aucune facture</p> :
              <div className="space-y-2">{(clientDetail?.invoices || []).map((inv: Invoice) => (
                <div key={inv.id} className="flex items-center gap-3 p-2 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] cursor-pointer" onClick={() => { setDetailOpen(false); setCurrentView('invoices') }}>
                  <Receipt className="size-4 text-[#926B2D] shrink-0" />
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium">{inv.id.slice(0,8)}{inv.case?.reference ? ` — ${inv.case.reference}` : ''}</p><p className="text-[10px] text-[#9CA3AF]">{fmtDate(inv.createdAt)}</p></div>
                  <span className="text-sm font-semibold shrink-0">{fmtMoney(inv.amount, inv.currency?.code || 'XAF')}</span>
                  <Badge variant="outline" className={cn('text-[10px] shrink-0', STATUS_COLORS[inv.status])}>{STATUS_LABELS[inv.status] || inv.status}</Badge>
                </div>
              ))}</div>}
            </TabsContent>
            <TabsContent value="notes" className="mt-3 overflow-y-auto max-h-[45vh]">
              <div className="p-4 border rounded-lg bg-[#F9FAFB]">
                <p className="text-sm text-[#6B7280] whitespace-pre-wrap">{selectedClient?.notes || clientDetail?.notes || 'Aucune note'}</p>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Credentials dialog (shown after activating portal) */}
      <Dialog open={credentialsOpen} onOpenChange={setCredentialsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-600" />
              Portail activé
            </DialogTitle>
            <DialogDescription>
              Transmettez ces identifiants au client de manière sécurisée.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#6B7280]">Email de connexion</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={credentials?.email || ''} className="font-mono text-sm bg-[#F9FAFB]" />
                <Button variant="outline" size="icon" className="size-9 shrink-0" onClick={() => credentials?.email && copyToClipboard(credentials.email)}>
                  {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-[#6B7280]">Mot de passe généré</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={credentials?.password || ''} className="font-mono text-sm bg-[#F9FAFB]" />
                <Button variant="outline" size="icon" className="size-9 shrink-0" onClick={() => credentials?.password && copyToClipboard(credentials.password)}>
                  {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                </Button>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <ShieldCheck className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">Ce mot de passe ne sera plus affiché. Assurez-vous de le copier maintenant.</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setCredentialsOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password result dialog */}
      <Dialog open={resetPwOpen} onOpenChange={setResetPwOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-5 text-[#1E5A8A]" />
              Mot de passe réinitialisé
            </DialogTitle>
            <DialogDescription>
              Le nouveau mot de passe a été généré. Transmettez-le au client de manière sécurisée.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-[#6B7280]">Nouveau mot de passe</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={resetPwResult} className="font-mono text-sm bg-[#F9FAFB]" />
                <Button variant="outline" size="icon" className="size-9 shrink-0" onClick={() => resetPwResult && copyToClipboard(resetPwResult)}>
                  {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                </Button>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <ShieldCheck className="size-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">Ce mot de passe ne sera plus affiché. Assurez-vous de le copier maintenant.</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setResetPwOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate portal confirm dialog */}
      <AlertDialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Désactiver le portail client ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le client perdra l&apos;accès à son portail. Il ne pourra plus consulter ses dossiers, factures ou documents en ligne. Cette action peut être annulée en réactivant le portail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#EF4444] hover:bg-[#DC2626] text-white"
              onClick={() => {
                if (deactivateClientId) {
                  deactivatePortalMut.mutate({ clientId: deactivateClientId })
                }
                setDeactivateOpen(false)
                setDeactivateClientId('')
              }}
            >
              Désactiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
