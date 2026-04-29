'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, X, Send, User } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

type Discussion = {
  id: string
  user_id: string
  message: string
  created_at: string
  user?: { name: string }
}

type Props = {
  templateId: string
  isOpen: boolean
  onClose: () => void
}

export default function TemplateDiscussion({ templateId, isOpen, onClose }: Props) {
  const [messages, setMessages] = useState<Discussion[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (isOpen && templateId) {
      fetchMessages()
    }
  }, [isOpen, templateId])

  const fetchMessages = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('template_discussions')
      .select('*, user:user_id(name, email)')
      .eq('template_id', templateId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    setLoading(false)
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return
    setSending(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('template_discussions')
      .insert({ template_id: templateId, user_id: user.id, message: newMessage.trim() })

    setNewMessage('')
    await fetchMessages()
    setSending(false)
  }

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
  }

  if (!isOpen) return null

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 998 }} onClick={onClose} />
      <div style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 380,
        height: '100vh',
        background: '#fff',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
        zIndex: 999,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--li-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageCircle size={18} style={{ color: '#0a66c2' }} />
            <span style={{ fontSize: 14, fontWeight: 700 }}>Discussion</span>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-icon">
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#999', padding: 40 }}>Loading...</p>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
              <MessageCircle size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p>No messages yet</p>
              <p style={{ fontSize: 12 }}>Start the discussion</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const name = msg.user?.name || 'Unknown User'
              const initials = getInitials(name)
              const date = new Date(msg.created_at)
              
              return (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0a66c2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                    {initials}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{name}</span>
                      <span style={{ fontSize: 11, color: '#999' }}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ fontSize: 13, color: '#333', lineHeight: 1.5 }}>{msg.message}</div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div style={{ padding: 16, borderTop: '1px solid var(--li-border)', background: '#fafafa' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Write a message..."
              rows={2}
              className="form-textarea"
              style={{ flex: 1, resize: 'none' }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={sendMessage} disabled={sending || !newMessage.trim()} className="btn btn-primary" style={{ padding: '8px 16px' }}>
              <Send size={14} /> {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}