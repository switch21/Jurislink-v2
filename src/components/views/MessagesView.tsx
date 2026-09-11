'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/hooks/use-toast'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/utils'
import { ROLE_LABELS } from '@/lib/constants'
import { fmtDateTime, initials } from '@/lib/helpers'
import type { UserItem, Message } from '@/types'
import { EmptyState } from '@/components/layout/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MessageSquare, Send } from 'lucide-react'

// ==================== MESSAGES VIEW ====================
export default function MessagesView() {
  const { user } = useAppStore()
  const qc = useQueryClient()
  const [selectedContact, setSelectedContact] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { data: contacts } = useQuery({
    queryKey: ['users-contacts', user?.tenantId],
    queryFn: () => fetch(`/api/users?tenantId=${user?.tenantId}`).then(r => r.json()).then(d => Array.isArray(d) ? d : d.users || []),
  })

  const { data: messages } = useQuery({
    queryKey: ['messages', user?.id, selectedContact],
    queryFn: () => {
      const p = new URLSearchParams()
      if (user?.tenantId) p.set('tenantId', user.tenantId)
      if (user?.id) p.set('userId', user.id)
      if (selectedContact) p.set('contactId', selectedContact)
      return fetch(`/api/messages?${p}`).then(r => r.json()).then(d => Array.isArray(d) ? d : [])
    },
    refetchInterval: 5000,
  })

  const sendMut = useMutation({
    mutationFn: (content: string) => fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content, tenantId: user?.tenantId, senderId: user?.id, receiverId: selectedContact }) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['messages'] }); setNewMessage('') },
    onError: () => toast.error("Erreur d'envoi"),
  })

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const contactList = (Array.isArray(contacts) ? contacts : []).filter((c: UserItem) => c.id !== user?.id)
  const chatMessages = selectedContact ? (Array.isArray(messages) ? messages : []) as Message[] : []

  const handleSend = () => {
    if (!newMessage.trim() || !selectedContact) return
    sendMut.mutate(newMessage.trim())
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h2 className="text-lg font-semibold">Messages</h2>
      <Card className="overflow-hidden"><div className="flex h-[500px]">
        <div className="w-64 border-r flex-shrink-0 overflow-y-auto hidden sm:block">
          {contactList.length === 0 ? <p className="text-xs text-[#9CA3AF] p-4 text-center">Aucun contact</p> :
            contactList.map((c: UserItem) => (
              <button key={c.id} className={cn('w-full flex items-center gap-2 p-3 hover:bg-[#F9FAFB] text-left transition-colors', selectedContact === c.id && 'bg-[#E8F0F8]')} onClick={() => setSelectedContact(c.id)}>
                <Avatar className="size-8"><AvatarFallback className="text-[10px] bg-[#F3F4F6]">{initials(c.fullName)}</AvatarFallback></Avatar>
                <div className="min-w-0"><p className="text-sm font-medium truncate">{c.fullName}</p><p className="text-[10px] text-[#9CA3AF]">{ROLE_LABELS[c.role] || c.role}</p></div>
              </button>
            ))}
        </div>
        <div className="flex-1 flex flex-col">
          {!selectedContact ? <div className="flex-1 flex items-center justify-center"><EmptyState icon={MessageSquare} title="Sélectionnez une conversation" description="Choisissez un contact pour commencer" /></div> : (
            <>
              <div className="p-3 border-b"><p className="text-sm font-semibold">{(contacts || []).find((c: UserItem) => c.id === selectedContact)?.fullName || ''}</p></div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && <p className="text-xs text-[#9CA3AF] text-center py-8">Aucun message</p>}
                {chatMessages.map((m: Message) => {
                  const isMine = m.senderId === user?.id
                  return (
                    <div key={m.id} className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
                      <div className={cn('max-w-[75%] rounded-xl px-3 py-2', isMine ? 'bg-[#1E5A8A] text-white' : 'bg-[#F3F4F6] text-[#111827]')}>
                        <p className="text-sm">{m.content}</p>
                        <p className={cn('text-[10px] mt-1', isMine ? 'text-[#E8F0F8]' : 'text-[#9CA3AF]')}>{fmtDateTime(m.createdAt)}</p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-3 border-t flex gap-2">
                <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Écrire un message..." className="text-sm" onKeyDown={e => e.key === 'Enter' && handleSend()} />
                <Button size="icon" onClick={handleSend} disabled={!newMessage.trim() || sendMut.isPending}><Send className="size-4" /></Button>
              </div>
            </>
          )}
        </div>
      </div></Card>
    </div>
  )
}
