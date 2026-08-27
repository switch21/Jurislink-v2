'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Send, Loader2 } from 'lucide-react'
import type { PortalCaseItem, PortalCommunication } from '@/types'
import { cn } from '@/lib/utils'
import { fmtDateTime } from '@/lib/helpers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/layout/EmptyState'

export default function PortalMessagesView() {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState('')
  const [subject, setSubject] = useState('')
  const [selectedCaseId, setSelectedCaseId] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { data: communications, isLoading } = useQuery({
    queryKey: ['portal-communications'],
    queryFn: () => fetch('/api/portal/communications').then(r => r.json()),
  })
  const { data: cases } = useQuery({
    queryKey: ['portal-cases-mini'],
    queryFn: () => fetch('/api/portal/cases').then(r => r.json()).then(d => (d || []).map((c: PortalCaseItem) => ({ id: c.id, reference: c.reference, title: c.title }))),
  })
  const sendMessage = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/portal/communications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: subject || null, content: message, caseId: selectedCaseId || null }) })
      if (!res.ok) throw new Error('Erreur')
      return res.json()
    },
    onSuccess: () => { setMessage(''); setSubject(''); setSelectedCaseId(''); queryClient.invalidateQueries({ queryKey: ['portal-communications'] }) },
  })
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [communications])
  if (isLoading) return <div className='p-6'><Skeleton className='h-96 rounded-xl' /></div>
  const comms = (communications || []).reverse() as PortalCommunication[]
  return (
    <div className='flex flex-col h-[calc(100vh-8rem)]'>
      <div className='px-4 lg:px-6 pb-3'><h2 className='text-xl font-bold text-[#111827]'>Messagerie</h2><p className='text-sm text-[#6B7280]'>Échangez avec votre cabinet</p></div>
      <div className='flex-1 overflow-y-auto px-4 lg:px-6 space-y-3 custom-scrollbar'>
        {comms.length === 0 && <EmptyState icon={MessageSquare} title='Aucun message' description='Envoyez votre premier message à votre cabinet' />}
        {comms.map(comm => {
          const isMe = !comm.sentBy
          return (
            <div key={comm.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
              <div className={cn('max-w-[75%] rounded-2xl px-4 py-2.5', isMe ? 'bg-[#1E5A8A] text-white rounded-br-md' : 'bg-[#F3F4F6] text-[#111827] rounded-bl-md')}>
                {!isMe && comm.sentBy && <p className='text-xs font-semibold text-[#C8A45D] mb-0.5'>{comm.sentBy.fullName}</p>}
                {comm.subject && <p className='text-xs font-semibold mb-1 opacity-80'>{comm.subject}</p>}
                <p className='text-sm whitespace-pre-wrap'>{comm.content}</p>
                <div className='flex items-center gap-2 mt-1'><p className='text-[10px] opacity-60'>{fmtDateTime(comm.createdAt)}</p>{comm.case && <span className='text-[10px] opacity-60'>· {comm.case.reference}</span>}{comm.type === 'portal_message' && <span className='text-[10px] px-1.5 py-0.5 rounded-full bg-white/20'>vous</span>}</div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>
      <div className='border-t border-[#E5E7EB] p-3 space-y-2 bg-white'>
        <div className='flex gap-2'><Input placeholder='Sujet (optionnel)' value={subject} onChange={e => setSubject(e.target.value)} className='h-8 text-sm rounded-lg border-[#E5E7EB]' />
          {cases && cases.length > 0 && <Select value={selectedCaseId} onValueChange={setSelectedCaseId}><SelectTrigger className='w-40 h-8 text-sm rounded-lg'><SelectValue placeholder='Dossier...' /></SelectTrigger><SelectContent>{cases.map((c: { id: string; reference: string | null; title: string }) => <SelectItem key={c.id} value={c.id}>{c.reference || c.title}</SelectItem>)}</SelectContent></Select>}
        </div>
        <div className='flex gap-2'>
          <Textarea placeholder='Votre message...' value={message} onChange={e => setMessage(e.target.value)} className='min-h-[60px] text-sm rounded-lg border-[#E5E7EB] resize-none' onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (message.trim()) { sendMessage.mutate(); } } }} />
          <Button onClick={() => message.trim() && sendMessage.mutate()} disabled={!message.trim() || sending} className='self-end bg-[#1E5A8A] hover:bg-[#164070] text-white h-10 w-10 p-0 rounded-lg shrink-0'>{sending ? <Loader2 className='size-4 animate-spin' /> : <Send className='size-4' />}</Button>
        </div>
      </div>
    </div>
  )
}