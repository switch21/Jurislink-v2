'use client'

import { useState, useEffect, useCallback, useRef, useMemo, useAppStore, cn, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator, Badge, Loader2, Sparkles, Briefcase, Users, ClipboardList, FileText, Receipt, MessageSquare, Calendar, Mail, type ViewName } from './shared-ui'

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
  relevance?: number
  reason?: string
}

const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string; view: ViewName }> = {
  case:        { icon: Briefcase,    color: 'text-jl-gold',      label: 'Dossiers',    view: 'cases' },
  client:      { icon: Users,        color: 'text-[var(--success)]', label: 'Clients', view: 'clients' },
  task:        { icon: ClipboardList, color: 'text-jl-blue',     label: 'Tâches',     view: 'tasks' },
  document:    { icon: FileText,     color: 'text-jl-secondary', label: 'Documents',   view: 'documents' },
  event:       { icon: Calendar,     color: 'text-jl-gold',      label: 'Événements', view: 'calendar' },
  invoice:     { icon: Receipt,      color: 'text-[var(--danger)]',  label: 'Factures', view: 'invoices' },
  message:     { icon: MessageSquare, color: 'text-jl-blue',    label: 'Messages',   view: 'messages' },
  communication: { icon: Mail,       color: 'text-jl-secondary', label: 'Communications', view: 'communications' },
}

interface SearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const { user, setCurrentView } = useAppStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Record<string, SearchResult[]>>({})
  const [loading, setLoading] = useState(false)
  const [aiMode, setAiMode] = useState(false)
  const [interpretation, setInterpretation] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || !user?.tenantId) {
      setResults({})
      setInterpretation('')
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams({
        tenantId: user.tenantId,
        q: q.trim(),
        limit: '10',
      })
      if (aiMode) params.set('type', 'ai')
      const res = await fetch(`/api/search?${params}`)
      const data = await res.json()

      if (data.type === 'ai') {
        setInterpretation(data.interpretation || '')
        // AI results come flat — group them
        const grouped: Record<string, SearchResult[]> = {}
        for (const r of (data.results?.ai || [])) {
          const t = r._type || 'case'
          if (!grouped[t]) grouped[t] = []
          grouped[t].push(r as SearchResult)
        }
        setResults(grouped)
      } else {
        setInterpretation('')
        // Basic results are pre-grouped
        const r = data.results || {}
        setResults(r as Record<string, SearchResult[]>)
      }
    } catch {
      setResults({})
    } finally {
      setLoading(false)
    }
  }, [user, aiMode])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSearch(query), 300)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, doSearch])

  // Reset when dialog opens/closes
  useEffect(() => {
    if (!open) { setQuery(''); setResults({}); setInterpretation(''); }
  }, [open])

  const handleSelect = (type: string, id: string) => {
    const config = CATEGORY_CONFIG[type]
    if (config) setCurrentView(config.view)
    onOpenChange(false)
  }

  const totalResults = useMemo(() =>
    Object.values(results).reduce((sum, arr) => sum + (arr?.length || 0), 0),
    [results]
  )

  const categoryOrder = ['case', 'client', 'task', 'document', 'event', 'invoice', 'message', 'communication']

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="flex items-center border-b px-3 pb-2">
        <CommandInput
          placeholder={t('search.placeholderFull')}
          value={query}
          onValueChange={setQuery}
          className="flex-1 border-0 p-0"
        />
        <button
          onClick={() => setAiMode(!aiMode)}
          className={cn(
            'ml-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0',
            aiMode
              ? 'bg-jl-blue text-white shadow-sm'
              : 'bg-jl-page text-jl-secondary hover:bg-jl-blue-light hover:text-jl-blue border border-jl'
          )}
        >
          <Sparkles className="size-3" />
          <span>Recherche IA</span>
        </button>
      </div>

      {aiMode && interpretation && (
        <div className="px-3 py-2 border-b bg-jl-blue/[0.03]">
          <p className="text-[11px] text-jl-blue flex items-start gap-1.5">
            <Sparkles className="size-3 shrink-0 mt-0.5" />
            <span className="italic">{interpretation}</span>
          </p>
        </div>
      )}

      <CommandList className="max-h-[400px]">
        {loading && (
          <div className="flex items-center justify-center py-8 gap-2">
            <Loader2 className="size-4 animate-spin text-jl-blue" />
            <span className="text-sm text-jl-muted">Recherche{aiMode ? ' IA' : ''} en cours…</span>
          </div>
        )}

        {!loading && query && totalResults === 0 && (
          <CommandEmpty className="py-8">
            <p className="text-sm text-jl-muted">Aucun résultat pour « {query} »</p>
            <p className="text-xs text-jl-muted mt-1">Essayez un autre terme ou activez la recherche IA</p>
          </CommandEmpty>
        )}

        {!loading && categoryOrder.map(cat => {
          const items = results[cat]
          if (!items || items.length === 0) return null
          const config = CATEGORY_CONFIG[cat]
          if (!config) return null
          const CatIcon = config.icon
          return (
            <CommandGroup key={cat} heading={
              <div className="flex items-center gap-2">
                <CatIcon className={cn('size-3.5', config.color)} />
                <span>{config.label}</span>
                <Badge variant="secondary" className="text-[9px] ml-1">{items.length}</Badge>
              </div>
            }>
              {items.slice(0, 10).map((item) => {
                const label = item.title || item.fullName || item.fileName || item.reference || ''
                const sub = item.subtitle || item.reference || item.email || item.company || item.description?.slice(0, 60) || ''
                return (
                  <CommandItem
                    key={`${item.id}`}
                    value={`${cat}-${item.id}`}
                    onSelect={() => handleSelect(cat, item.id)}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <CatIcon className={cn('size-4 shrink-0', config.color)} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{label}</p>
                      <p className="text-xs text-jl-muted truncate">{sub}</p>
                    </div>
                    {item.relevance != null && aiMode && (
                      <Badge variant="outline" className="text-[9px] shrink-0 text-jl-blue border-jl-blue/30">
                        {Math.round(item.relevance * 100)}%
                      </Badge>
                    )}
                    {item.status && cat !== 'communication' && cat !== 'message' && (
                      <Badge variant="outline" className="text-[9px] shrink-0">{item.status}</Badge>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )
        })}

        {!loading && !query && (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="size-10 rounded-xl bg-jl-page flex items-center justify-center mb-3">
              <Briefcase className="size-5 text-jl-muted" />
            </div>
            <p className="text-sm font-medium text-jl-secondary">Recherche globale</p>
            <p className="text-xs text-jl-muted mt-1">Tapez pour rechercher dans tous les dossiers, clients, documents…</p>
            <div className="flex items-center gap-3 mt-3 text-[10px] text-jl-muted">
              <kbd className="px-1.5 py-0.5 rounded bg-jl-page border border-jl font-mono">↑↓</kbd>
              <span>Naviguer</span>
              <kbd className="px-1.5 py-0.5 rounded bg-jl-page border border-jl font-mono">↵</kbd>
              <span>Ouvrir</span>
              <kbd className="px-1.5 py-0.5 rounded bg-jl-page border border-jl font-mono">esc</kbd>
              <span>Fermer</span>
            </div>
          </div>
        )}
      </CommandList>
    </CommandDialog>
  )
}
