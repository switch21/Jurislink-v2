'use client'

import { useState, useEffect, useRef, useMemo, useAppStore, cn, Badge, Input, Card, CardContent, Skeleton, Loader2, Briefcase, Users, ClipboardList, FileText, Receipt, MessageSquare, Calendar, Mail, SearchX, EmptyState } from './shared-ui'
import { fmtDate, fmtDateTime, fmtFileSize, taskStatusColor, taskStatusLabel } from './helpers'
import { STATUS_LABELS, TYPE_LABELS, EVENT_TYPE_LABELS, PRIORITY_LABELS } from './constants'

interface SearchResult {
  _type: string
  id: string
  title?: string
  fullName?: string
  fileName?: string
  reference?: string
  email?: string
  company?: string
  status?: string
  priority?: string
  description?: string
  subtitle?: string
  createdAt?: string
  dueDate?: string
  startTime?: string
  fileSize?: number
  eventType?: string
  caseType?: string
}

interface SearchResponse {
  results: Record<string, SearchResult[]>
  counts?: Record<string, number>
}

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string; href: (id: string) => string }> = {
  case: {
    icon: Briefcase, color: 'text-jl-gold', label: 'nav.cases',
    href: () => 'cases',
  },
  client: {
    icon: Users, color: 'text-[var(--success)]', label: 'nav.clients',
    href: () => 'clients',
  },
  task: {
    icon: ClipboardList, color: 'text-jl-blue', label: 'nav.tasks',
    href: () => 'tasks',
  },
  document: {
    icon: FileText, color: 'text-jl-secondary', label: 'nav.documents',
    href: (id) => `/api/documents/${id}/download`,
  },
  event: {
    icon: Calendar, color: 'text-jl-gold', label: 'nav.calendar',
    href: () => 'calendar',
  },
  message: {
    icon: MessageSquare, color: 'text-jl-blue', label: 'nav.messages',
    href: () => 'messages',
  },
  communication: {
    icon: Mail, color: 'text-jl-secondary', label: 'nav.communications',
    href: () => 'communications',
  },
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'common.all' },
  { value: 'cases', label: 'nav.cases' },
  { value: 'clients', label: 'nav.clients' },
  { value: 'tasks', label: 'nav.tasks' },
  { value: 'documents', label: 'nav.documents' },
  { value: 'events', label: 'nav.calendar' },
  { value: 'messages', label: 'nav.messages' },
  { value: 'communications', label: 'nav.communications' },
]

export function SearchView() {
  const { user, setCurrentView } = useAppStore()
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebouncedQuery(query), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query])

  useEffect(() => {
    if (!debouncedQuery.trim() || !user?.tenantId) {
      setResults(null)
      return
    }

    let cancelled = false
    setLoading(true)

    const params = new URLSearchParams({
      tenantId: user.tenantId,
      q: debouncedQuery.trim(),
      limit: '10',
    })
    if (typeFilter !== 'all') params.set('type', typeFilter)

    fetch(`/api/search?${params}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) setResults(data) })
      .catch(() => { if (!cancelled) setResults(null) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [debouncedQuery, typeFilter, user?.tenantId])

  const handleResultClick = (item: SearchResult) => {
    if (item._type === 'document') return
    const config = TYPE_CONFIG[item._type]
    if (config) setCurrentView(config.href(item.id) as any)
  }

  const totalResults = useMemo(() => {
    if (!results?.results) return 0
    return Object.values(results.results).reduce((sum, arr) => sum + (arr?.length || 0), 0)
  }, [results])

  const counts = results?.counts || {}
  const categoryOrder = ['case', 'client', 'task', 'document', 'event', 'message', 'communication']

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold">{t('search.title')}</h2>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-jl-muted">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Briefcase className="size-4" />}
          </div>
          <Input
            ref={inputRef}
            placeholder={t('search.placeholder')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-10 h-11 text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-jl-muted hover:text-jl-secondary"
            >
              <span className="text-xs">{t('common.close')}</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER_OPTIONS.map(opt => {
          const count = opt.value === 'all' ? totalResults : (counts[opt.value] || 0)
          const active = typeFilter === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => setTypeFilter(opt.value)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                active
                  ? 'bg-jl-blue text-white border-jl-blue shadow-sm'
                  : 'bg-jl-card border-jl text-jl-secondary hover:bg-jl-page'
              )}
            >
              <span>{opt.label}</span>
              {count > 0 && (
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full',
                  active ? 'bg-white/20' : 'bg-jl-page'
                )}>{count}</span>
              )}
            </button>
          )
        })}
      </div>

      {loading && (
        <div className="space-y-3 py-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
              <Skeleton className="size-8 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && debouncedQuery && results && totalResults === 0 && (
        <EmptyState icon={SearchX} title={t('common.noResults')} description={t('search.noResultsFor')} />
      )}

      {!loading && !debouncedQuery && (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="size-16 rounded-2xl bg-jl-blue/10 flex items-center justify-center mb-4">
            <Briefcase className="size-8 text-jl-blue" />
          </div>
          <p className="text-sm font-medium text-jl-primary">{t('search.title')}</p>
          <p className="text-xs text-jl-muted mt-1 max-w-md">
            {t('search.description')}
          </p>
          <p className="text-[10px] text-jl-muted mt-3">
            {t('search.kbdHint')}
          </p>
        </div>
      )}

      {!loading && results && totalResults > 0 && (
        <div className="space-y-6">
          <p className="text-xs text-jl-muted">{totalResults} {t('common.results')}</p>

          {categoryOrder.map(catKey => {
            const apiKey = catKey + 's'
            const items = results.results?.[apiKey]
            if (!items || items.length === 0) return null
            const config = TYPE_CONFIG[catKey]
            if (!config) return null
            const CatIcon = config.icon

            return (
              <div key={catKey}>
                <div className="flex items-center gap-2 mb-3">
                  <CatIcon className={cn('size-4', config.color)} />
                  <h3 className="text-sm font-semibold">{t(config.label)}</h3>
                  <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                </div>
                <div className="space-y-2">
                  {items.map((item) => {
                    const isDoc = catKey === 'document'
                    return (
                      <Card
                        key={item.id}
                        className={cn(
                          'hover:shadow-sm transition-all',
                          isDoc ? 'cursor-default' : 'cursor-pointer'
                        )}
                        onClick={() => handleResultClick(item)}
                      >
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className={cn('shrink-0 p-2 rounded-lg bg-jl-page')}>
                            <CatIcon className={cn('size-4', config.color)} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {item.title || item.fullName || item.fileName || item.reference || '—'}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {item.subtitle && <span className="text-xs text-jl-muted truncate">{item.subtitle}</span>}
                              {!item.subtitle && item.email && <span className="text-xs text-jl-muted truncate">{item.email}</span>}
                              {!item.subtitle && item.company && <span className="text-xs text-jl-muted truncate">{item.company}</span>}
                              {!item.subtitle && item.description && <span className="text-xs text-jl-muted truncate">{item.description.slice(0, 80)}</span>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {item.status && (
                              <Badge variant="outline" className={cn('text-[10px]',
                                catKey === 'task' ? taskStatusColor(item.status) : ''
                              )}>
                                {catKey === 'task' ? taskStatusLabel(item.status) : (statusLabel(item.status))}
                              </Badge>
                            )}
                            {item.priority && catKey === 'task' && (
                              <span className="text-[10px] text-jl-muted">{priorityLabel(item.priority)}</span>
                            )}
                            {item.caseType && <Badge variant="outline" className="text-[10px]">{typeLabel(item.caseType)}</Badge>}
                            {item.eventType && <Badge variant="outline" className="text-[10px]">{EVENT_typeLabel(item.eventType)}</Badge>}
                            {item.fileSize && <span className="text-[10px] text-jl-muted">{fmtFileSize(item.fileSize)}</span>}
                            {item.createdAt && <span className="text-[10px] text-jl-muted">{fmtDate(item.createdAt)}</span>}
                            {item.dueDate && <span className="text-[10px] text-jl-muted">{t('tasks.dueDate')}: {fmtDate(item.dueDate)}</span>}
                            {item.startTime && <span className="text-[10px] text-jl-muted">{fmtDateTime(item.startTime)}</span>}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
