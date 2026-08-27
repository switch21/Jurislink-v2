'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { User, Edit, Building2, ShieldUser, Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { toast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/layout/EmptyState'
import { InfoRow } from './InfoRow'

export default function PortalProfileView() {
  const { portalUser } = useAppStore()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ phone: '', address: '', city: '', country: '' })
  const { data: profile, isLoading } = useQuery({
    queryKey: ['portal-profile'],
    queryFn: () => fetch('/api/portal/profile').then(r => r.json()),
  })
  const updateProfile = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch('/api/portal/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
    onSuccess: () => { setEditing(false); toast({ title: 'Profil mis à jour' }) },
    onError: () => toast({ title: 'Erreur lors de la mise à jour', variant: 'destructive' }),
  })
  const editForm = editing ? form : (profile ? { phone: profile.phone || '', address: profile.address || '', city: profile.city || '', country: profile.country || '' } : form)
  const handleEdit = () => { if (profile) setForm({ phone: profile.phone || '', address: profile.address || '', city: profile.city || '', country: profile.country || '' }); setEditing(true) }
  if (isLoading) return <div className='p-6'><Skeleton className='h-64 rounded-xl' /></div>
  if (!profile) return <EmptyState icon={User} title='Erreur de chargement' />
  return (
    <div className='p-4 lg:p-6 space-y-4'>
      <h2 className='text-xl font-bold text-[#111827]'>Mon profil</h2>
      <div className='grid md:grid-cols-2 gap-4'>
        <Card className='rounded-xl border border-[#E5E7EB]'>
          <CardHeader className='pb-3'><CardTitle className='text-sm font-semibold flex items-center gap-2'><User className='size-4 text-[#1E5A8A]' />Mes informations</CardTitle></CardHeader>
          <CardContent className='space-y-3'>
            {editing ? (
              <div className='space-y-3'>
                <div><Label className='text-xs'>Téléphone</Label><Input value={editForm.phone} onChange={e => setForm({ ...editForm, phone: e.target.value })} className='h-9 mt-1 rounded-lg' /></div>
                <div><Label className='text-xs'>Adresse</Label><Input value={editForm.address} onChange={e => setForm({ ...editForm, address: e.target.value })} className='h-9 mt-1 rounded-lg' /></div>
                <div className='grid grid-cols-2 gap-2'><div><Label className='text-xs'>Ville</Label><Input value={editForm.city} onChange={e => setForm({ ...editForm, city: e.target.value })} className='h-9 mt-1 rounded-lg' /></div><div><Label className='text-xs'>Pays</Label><Input value={editForm.country} onChange={e => setForm({ ...editForm, country: e.target.value })} className='h-9 mt-1 rounded-lg' /></div></div>
                <div className='flex gap-2 pt-1'><Button size='sm' onClick={() => updateProfile.mutate(editForm)} disabled={updateProfile.isPending} className='bg-[#1E5A8A] hover:bg-[#164070]'>{updateProfile.isPending ? <Loader2 className='size-4 animate-spin' /> : 'Enregistrer'}</Button><Button size='sm' variant='outline' onClick={() => setEditing(false)}>Annuler</Button></div>
              </div>
            ) : (
              <>
                <InfoRow label='Nom complet' value={profile.fullName} />
                <InfoRow label='Société' value={profile.company} />
                <InfoRow label='Email' value={profile.email} />
                <InfoRow label='Téléphone' value={profile.phone} />
                <InfoRow label='NIU' value={profile.niu} />
                <InfoRow label='Adresse' value={[profile.address, profile.city, profile.country].filter(Boolean).join(', ')} />
                <Button size='sm' variant='outline' onClick={handleEdit} className='mt-2'><Edit className='size-3.5 mr-1.5' />Modifier</Button>
              </>
            )}
          </CardContent>
        </Card>
        <div className='space-y-4'>
          <Card className='rounded-xl border border-[#E5E7EB]'>
            <CardHeader className='pb-3'><CardTitle className='text-sm font-semibold flex items-center gap-2'><Building2 className='size-4 text-[#C8A45D]' />Mon cabinet</CardTitle></CardHeader>
            <CardContent className='space-y-2'>
              <InfoRow label='Nom' value={profile.tenant?.name} />
              <InfoRow label='Email' value={profile.tenant?.email} />
              <InfoRow label='Téléphone' value={profile.tenant?.phone} />
              <InfoRow label='Adresse' value={[profile.tenant?.address, profile.tenant?.city, profile.tenant?.country].filter(Boolean).join(', ')} />
              <InfoRow label='NIU' value={profile.tenant?.niu} />
            </CardContent>
          </Card>
          {profile.responsibleLawyer && (
            <Card className='rounded-xl border border-[#E5E7EB]'>
              <CardHeader className='pb-3'><CardTitle className='text-sm font-semibold flex items-center gap-2'><ShieldUser className='size-4 text-[#059669]' />Mon avocat</CardTitle></CardHeader>
              <CardContent className='space-y-2'>
                <InfoRow label='Nom' value={profile.responsibleLawyer.fullName} />
                <InfoRow label='Email' value={profile.responsibleLawyer.email} />
                <InfoRow label='Téléphone' value={profile.responsibleLawyer.phone} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}