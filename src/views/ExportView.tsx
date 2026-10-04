'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore, cn, t, toast, Button, Card, CardContent, CardHeader, CardTitle, CardDescription, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Skeleton, FileDown, FileSpreadsheet, FileText, Users, Receipt, Banknote, ClipboardList, Calendar, AlertOctagon, TrendingUp, Shield, Download, RefreshCw } from './shared-ui'
import { fetchJson } from '@/lib/api-fetch'

type DatasetKey = 'clients' | 'invoices' | 'payments' | 'tasks' | 'events' | 'unpaid' | 'cad' | 'audit'
type PeriodKey = 'semaine' | 'mois' | 'trimestre' | 'semestre' | 'annee' | 'personnalise'

const DATASETS: { key: DatasetKey; labelKey: string; icon: React.ElementType }[] = [
  { key: 'clients', labelKey: 'export.clients', icon: Users },
  { key: 'invoices', labelKey: 'export.invoices', icon: Receipt },
  { key: 'payments', labelKey: 'export.payments', icon: Banknote },
  { key: 'tasks', labelKey: 'export.tasks', icon: ClipboardList },
  { key: 'events', labelKey: 'export.events', icon: Calendar },
  { key: 'unpaid', labelKey: 'export.unpaid', icon: AlertOctagon },
  { key: 'cad', labelKey: 'export.cad', icon: TrendingUp },
  { key: 'audit', labelKey: 'export.audit', icon: Shield },
]

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'semaine', label: 'Semaine' },
  { key: 'mois', label: 'Mois' },
  { key: 'trimestre', label: 'Trimestre' },
  { key: 'semestre', label: 'Semestre' },
  { key: 'annee', label: 'Année' },
  { key: 'personnalise', label: 'Personnalisé' },
]

interface ExportResponse {
  dataset: string
  period: string
  label: string
  columns: string[]
  rows: (string | number | null)[][]
  total: number
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ExportView() {
  const { user } = useAppStore()
  const [dataset, setDataset] = useState<DatasetKey>('clients')
  const [period, setPeriod] = useState<PeriodKey>('mois')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)

  const params = useMemo(() => {
    const p = new URLSearchParams({ dataset, period })
    if (period === 'personnalise') {
      if (customFrom) p.set('from', customFrom)
      if (customTo) p.set('to', customTo)
    }
    return p
  }, [dataset, period, customFrom, customTo])

  const { data, isLoading, isError, refetch } = useQuery<ExportResponse>({
    queryKey: ['export-preview', dataset, period, customFrom, customTo],
    queryFn: () => fetchJson<ExportResponse>(`/api/export?${params}&format=json`),
    enabled: !!user?.tenantId,
  })

  const downloadFile = async (format: 'csv' | 'pdf') => {
    setDownloading(format)
    try {
      const res = await fetch(`/api/export?${params}&format=${format}`)
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || 'Erreur')
      }
      const blob = await res.blob()
      triggerDownload(blob, `jurislink-${dataset}-${period}.${format}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('export.error'))
    } finally {
      setDownloading(null)
    }
  }

  const downloadExcel = async () => {
    setDownloading('xlsx')
    try {
      const payload = await fetchJson<ExportResponse>(`/api/export?${params}&format=json`)
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      wb.creator = 'JurisLink'
      wb.created = new Date()
      const ws = wb.addWorksheet(t('export.title').slice(0, 28) || 'Export')
      ws.columns = payload.columns.map((c, i) => ({ header: c, key: `c${i}`, width: Math.max(14, c.length + 8) }))
      ws.getRow(1).font = { bold: true }
      for (const row of payload.rows) ws.addRow(row)
      const buf = await wb.xlsx.writeBuffer()
      triggerDownload(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `jurislink-${dataset}-${period}.xlsx`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('export.error'))
    } finally {
      setDownloading(null)
    }
  }

  const previewRows = (data?.rows || []).slice(0, 100)

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2"><FileDown className="size-5 text-jl-blue" />{t('export.title')}</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">{t('export.subtitle')}</p>
      </div>

      {/* Dataset selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {DATASETS.map(d => {
          const Icon = d.icon
          const active = dataset === d.key
          return (
            <button
              key={d.key}
              onClick={() => setDataset(d.key)}
              className={cn(
                'flex items-center gap-2.5 rounded-xl border p-3 text-left text-sm font-medium transition-colors',
                active
                  ? 'border-jl-blue bg-[var(--primary-light)] text-jl-primary'
                  : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]',
              )}
            >
              <Icon className={cn('size-4 shrink-0', active ? 'text-jl-blue' : 'text-jl-muted')} />
              {t(d.labelKey)}
            </button>
          )
        })}
      </div>

      {/* Period + format */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs text-[var(--text-secondary)]">{t('export.period')}</Label>
              <Select value={period} onValueChange={v => setPeriod(v as PeriodKey)}>
                <SelectTrigger className="h-9 w-[150px] mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIODS.map(p => <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {period === 'personnalise' && (
              <div className="flex items-end gap-2">
                <div>
                  <Label className="text-xs text-[var(--text-secondary)]">Du</Label>
                  <Input type="date" className="h-9 mt-1 w-[140px] text-xs px-2" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-[var(--text-secondary)]">Au</Label>
                  <Input type="date" className="h-9 mt-1 w-[140px] text-xs px-2" value={customTo} onChange={e => setCustomTo(e.target.value)} />
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Button size="sm" variant="outline" disabled={downloading === 'csv'} onClick={() => downloadFile('csv')}>
                {downloading === 'csv' ? <RefreshCw className="size-3.5 mr-1.5 animate-spin" /> : <Download className="size-3.5 mr-1.5" />}{t('export.csv')}
              </Button>
              <Button size="sm" variant="outline" disabled={downloading === 'xlsx'} onClick={downloadExcel}>
                {downloading === 'xlsx' ? <RefreshCw className="size-3.5 mr-1.5 animate-spin" /> : <FileSpreadsheet className="size-3.5 mr-1.5" />}{t('export.excel')}
              </Button>
              <Button size="sm" disabled={downloading === 'pdf'} onClick={() => downloadFile('pdf')}>
                {downloading === 'pdf' ? <RefreshCw className="size-3.5 mr-1.5 animate-spin" /> : <FileText className="size-3.5 mr-1.5" />}{t('export.pdf')}
              </Button>
            </div>
          </div>
          {data?.label && <p className="text-xs text-[var(--text-muted)] mt-3">Période appliquée : {data.label} · {data.total} {t('export.total')}</p>}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">{t('export.preview')}</CardTitle>
          <CardDescription className="text-xs">{previewRows.length > 0 ? `${previewRows.length} ${t('export.total')}` : ''}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4"><Skeleton className="h-8 w-full mb-2" /><Skeleton className="h-8 w-full mb-2" /><Skeleton className="h-8 w-2/3" /></div>
          ) : isError ? (
            <div className="p-6 text-center text-sm text-[var(--text-muted)]">{t('export.error')} <Button size="sm" variant="outline" className="ml-2" onClick={() => refetch()}><RefreshCw className="size-3 mr-1" />Réessayer</Button></div>
          ) : previewRows.length === 0 ? (
            <p className="p-6 text-center text-sm text-[var(--text-muted)]">Aucune donnée sur cette période</p>
          ) : (
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {(data?.columns || []).map(c => <TableHead key={c} className="text-xs whitespace-nowrap">{c}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, i) => (
                    <TableRow key={i}>
                      {row.map((cell, j) => <TableCell key={j} className="text-xs whitespace-nowrap py-2">{cell == null ? '' : String(cell)}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
