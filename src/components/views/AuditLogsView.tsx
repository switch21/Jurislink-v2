'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/store/appStore'
import type { AuditLogItem } from '@/types'
import { EmptyState } from '@/components/layout/EmptyState'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Shield } from 'lucide-react'
import { fmtDateTime } from '@/lib/helpers'

// ==================== AUDIT LOGS VIEW ====================
export default function AuditLogsView() {
  const { user } = useAppStore()
  const [resourceType, setResourceType] = useState('all')
  const isAdmin = user?.role === 'root_admin' || user?.role === 'firm_admin' || user?.role === 'associate'

  const { data: logs, isLoading } = useQuery({
    queryKey: ['audit-logs', user?.tenantId, resourceType],
    queryFn: () => {
      const p = new URLSearchParams()
      if (user?.tenantId) p.set('tenantId', user.tenantId)
      if (resourceType !== 'all') p.set('resourceType', resourceType)
      return fetch(`/api/audit-logs?${p}`).then(r => r.json())
    },
    enabled: isAdmin,
  })

  if (!isAdmin) return <div className="p-6"><EmptyState icon={Shield} title="Accès restreint" description="Cette section est réservée aux administrateurs" /></div>

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h2 className="text-lg font-semibold">Journal d'audit</h2>
      <Select value={resourceType} onValueChange={setResourceType}>
        <SelectTrigger className="w-[180px] h-9 text-xs"><SelectValue placeholder="Type de ressource" /></SelectTrigger>
        <SelectContent><SelectItem value="all">Tous</SelectItem><SelectItem value="Case">Dossier</SelectItem><SelectItem value="Client">Client</SelectItem><SelectItem value="User">Utilisateur</SelectItem><SelectItem value="Invoice">Facture</SelectItem><SelectItem value="Document">Document</SelectItem><SelectItem value="Task">Tâche</SelectItem></SelectContent>
      </Select>

      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> :
        (logs || []).length === 0 ? <EmptyState icon={Shield} title="Aucune entrée" /> :
        <Card><CardContent className="p-0"><div className="max-h-[500px] overflow-y-auto">
          <Table><TableHeader><TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Utilisateur</TableHead>
            <TableHead>Action</TableHead>
            <TableHead className="hidden md:table-cell">Ressource</TableHead>
            <TableHead className="hidden lg:table-cell">IP</TableHead>
          </TableRow></TableHeader><TableBody>
            {(logs || []).map((log: AuditLogItem) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs text-[#6B7280]">{fmtDateTime(log.timestamp)}</TableCell>
                <TableCell className="text-sm">{log.user?.fullName || 'Système'}</TableCell>
                <TableCell className="text-sm font-medium">{log.action}</TableCell>
                <TableCell className="hidden md:table-cell"><Badge variant="outline" className="text-[10px]">{log.resourceType || '—'}</Badge></TableCell>
                <TableCell className="hidden lg:table-cell text-xs text-[#9CA3AF]">{log.ipAddress || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody></Table>
        </div></CardContent></Card>}
    </div>
  )
}
