'use client'

import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'
import { STATUS_COLORS, STATUS_LABELS, TYPE_LABELS } from '@/lib/constants'
import { fmtDate } from '@/lib/helpers'
import type { CaseItem } from '@/types'
import { EmptyState } from '@/components/layout/EmptyState'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Archive } from 'lucide-react'

// ==================== ARCHIVES VIEW ====================
export default function ArchivesView() {
  const { user } = useAppStore()

  const { data: cases, isLoading } = useQuery({
    queryKey: ['archived-cases', user?.tenantId],
    queryFn: () => fetch(`/api/cases?tenantId=${user?.tenantId}&status=archive`).then(r => r.json()),
  })

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h2 className="text-lg font-semibold">Archives</h2>
      {isLoading ? <div className="flex justify-center py-12"><Skeleton className="h-6 w-48" /></div> :
        (cases || []).length === 0 ? <EmptyState icon={Archive} title="Aucun dossier archivé" /> :
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
          {(cases || []).map((c: CaseItem) => (
            <Card key={c.id} className="opacity-80">
              <CardHeader className="pb-2"><div className="flex items-start justify-between"><CardTitle className="text-sm font-semibold">{c.reference}</CardTitle><Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS.archive)}>{STATUS_LABELS.archive}</Badge></div><CardDescription className="text-xs mt-1 line-clamp-2">{c.title}</CardDescription></CardHeader>
              <CardContent className="p-4 pt-0 space-y-1">
                <p className="text-xs text-[#6B7280]">{c.client?.fullName || '—'}</p>
                <p className="text-xs text-[#9CA3AF]">Type : {TYPE_LABELS[c.caseType] || c.caseType}</p>
                {c.closingDate && <p className="text-xs text-[#9CA3AF]">Clôture : {fmtDate(c.closingDate)}</p>}
              </CardContent>
            </Card>
          ))}
        </div>}
    </div>
  )
}
