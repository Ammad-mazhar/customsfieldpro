import { useState, useMemo, useRef, useEffect } from 'react'
import {
  getConversations, getClientMessages, markConversationRead,
  addInboxMessage, saveInboxMessages, getInboxMessages,
} from '../data/store'
import {
  sendMessage, logNote, simulateIncomingReply,
  SMS_TEMPLATES, EMAIL_TEMPLATES, fillTemplate,
} from '../utils/inboxManager'
import { useAuth } from '../auth/AuthContext'

// ─── Helpers ───────────────────────────────────────────────────────────────────
function relativeTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(diff / 86400000)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function fmtDay(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

// Generate avatar color from name
function avatarColor(name = '') {
  const colors = ['#2563eb','#7c3aed','#059669','#d97706','#dc2626','#0891b2','#7c3aed','#be185d']
  let h = 0
  for (let i = 0; i < name.length; i++) h = ((h << 5) - h) + name.charCodeAt(i)
  return colors[Math.abs(h) % colors.length]
}

function Avatar({ name, size = 36 }) {
  const initials = (name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  const bg = avatarColor(name)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, flexShrink: 0, letterSpacing: '-0.5px',
    }}>{initials}</div>
  )
}

const CHANNEL_ICONS = {
  sms:    '💬',
  email:  '✉️',
  system: '⚙️',
  note:   '📌',
}

// ─── Template picker modal ────────────────────────────────────────────────────
function TemplatePicker({ channel, clientName, onInsert, onClose }) {
  const [search, setSearch] = useState('')
  const templates = channel === 'email' ? EMAIL_TEMPLATES : SMS_TEMPLATES
  const filtered = templates.filter(t =>
    t.label.toLowerCase().includes(search.toLowerCase()) ||
    t.body.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ position: 'absolute', bottom: '100%', right: 0, marginBottom: 8, background: '#fff', border: '1px solid #e8e9ec', borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', width: 340, zIndex: 100, overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0f1f3' }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1d23', marginBottom: 8 }}>
          {channel === 'email' ? '✉️ Email Templates' : '💬 SMS Templates'}
        </div>
        <input
          autoFocus
          placeholder="Search templates..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '6px 9px', border: '1px solid #d1d5db', borderRadius: 5, fontSize: 12, boxSizing: 'border-box' }}
        />
      </div>
      <div style={{ maxHeight: 280, overflowY: 'auto' }}>
        {filtered.map(t => (
          <button key={t.id} onClick={() => onInsert(t)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: '1px solid #f9fafb',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1a1d23', marginBottom: 3 }}>{t.label}</div>
            <div style={{ fontSize: 11.5, color: '#6b7280', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{t.body}</div>
          </button>
        ))}
        {filtered.length === 0 && <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>No templates found</div>}
      </div>
      <div style={{ padding: '8px 12px', borderTop: '1px solid #f0f1f3' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 12 }}>Close</button>
      </div>
    </div>
  )
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isOutgoing = msg.direction === 'outgoing'
  const isIncoming = msg.direction === 'incoming'
  const isSystem   = msg.direction === 'system'
  const isNote     = msg.direction === 'note'

  if (isSystem) {
    return (
      <div style={{ textAlign: 'center', padding: '4px 0', margin: '6px 0' }}>
        <span style={{ background: '#f3f4f6', color: '#6b7280', fontSize: 11.5, padding: '4px 14px', borderRadius: 12, fontStyle: 'italic' }}>
          {msg.body}
        </span>
      </div>
    )
  }

  if (isNote) {
    return (
      <div style={{ margin: '6px 20px', padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, borderLeft: '3px solid #f59e0b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 12 }}>📌</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#92400e' }}>Internal Note — {msg.sentByName}</span>
          <span style={{ fontSize: 11, color: '#b45309', marginLeft: 'auto' }}>{fmtTime(msg.createdAt)}</span>
        </div>
        <div style={{ fontSize: 13, color: '#78350f', lineHeight: 1.5 }}>{msg.body}</div>
      </div>
    )
  }

  const statusIcon = { sent: '✓', delivered: '✓✓', read: '✓✓', failed: '✗' }[msg.status] || ''
  const statusColor = msg.status === 'read' ? '#3b82f6' : msg.status === 'failed' ? '#dc2626' : '#9ca3af'

  return (
    <div style={{ display: 'flex', justifyContent: isOutgoing ? 'flex-end' : 'flex-start', padding: '3px 16px', margin: '2px 0' }}>
      {isIncoming && (
        <Avatar name={msg.clientName} size={28} />
      )}
      <div style={{ maxWidth: '70%', marginLeft: isIncoming ? 8 : 0, marginRight: isOutgoing ? 0 : 0 }}>
        {/* Email subject line */}
        {msg.channel === 'email' && msg.subject && (
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2, textAlign: isOutgoing ? 'right' : 'left' }}>
            Re: {msg.subject}
          </div>
        )}
        <div style={{
          padding: '9px 14px', borderRadius: isOutgoing ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isOutgoing ? '#2563eb' : '#f3f4f6',
          color: isOutgoing ? '#fff' : '#1a1d23',
          fontSize: 13.5, lineHeight: 1.5,
        }}>
          {msg.body}
        </div>
        {/* Attachments */}
        {msg.attachments?.length > 0 && (
          <div style={{ marginTop: 4 }}>
            {msg.attachments.map((a, i) => (
              <div key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px',
                background: isOutgoing ? 'rgba(255,255,255,0.2)' : '#e8e9ec',
                borderRadius: 4, fontSize: 11, color: isOutgoing ? '#fff' : '#374151', marginRight: 4,
              }}>
                📎 {a.name} <span style={{ color: '#9ca3af' }}>{a.size}</span>
              </div>
            ))}
          </div>
        )}
        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, justifyContent: isOutgoing ? 'flex-end' : 'flex-start' }}>
          {isOutgoing && msg.sentByName && (
            <span style={{ fontSize: 10.5, color: '#9ca3af' }}>{msg.sentByName} ·</span>
          )}
          <span style={{ fontSize: 10.5, color: '#9ca3af' }}>{fmtTime(msg.createdAt)}</span>
          <span style={{ fontSize: 10.5, color: '#9ca3af' }}>via {msg.channel}</span>
          {isOutgoing && statusIcon && (
            <span style={{ fontSize: 10.5, color: statusColor }}>{statusIcon}</span>
          )}
          {msg.linkedJobNumber && (
            <span style={{ fontSize: 10, background: '#eff6ff', color: '#2563eb', padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>
              {msg.linkedJobNumber}
            </span>
          )}
        </div>
      </div>
      {isOutgoing && (
        <div style={{ width: 28, marginLeft: 8 }} />
      )}
    </div>
  )
}

// ─── Conversation item ────────────────────────────────────────────────────────
function ConvoItem({ conv, isActive, onClick, filterTab }) {
  const msg = conv.lastMessage
  const unread = conv.unread > 0
  const color = avatarColor(conv.clientName)

  return (
    <div onClick={onClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 14px',
        cursor: 'pointer', borderBottom: '1px solid #f0f1f3',
        background: isActive ? '#eff6ff' : 'transparent',
        borderLeft: `3px solid ${unread ? '#2563eb' : isActive ? '#2563eb' : 'transparent'}`,
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f9fafb' }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}>
      <Avatar name={conv.clientName} size={38} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: unread ? 800 : 600, color: '#1a1d23', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
            {conv.clientName}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 10 }}>{CHANNEL_ICONS[msg?.channel] || ''}</span>
            <span style={{ fontSize: 10.5, color: '#9ca3af', whiteSpace: 'nowrap' }}>{relativeTime(msg?.createdAt)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: unread ? '#374151' : '#6b7280', fontWeight: unread ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>
            {msg?.direction === 'outgoing' ? `↗ ${msg.body}` : msg?.body || ''}
          </div>
          {unread > 0 && (
            <div style={{ background: '#2563eb', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px', flexShrink: 0, marginLeft: 4 }}>
              {conv.unread}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Inbox page ──────────────────────────────────────────────────────────
export default function Inbox({ initialClientId }) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState(() => getConversations())
  const [activeClientId, setActiveClientId] = useState(initialClientId || null)
  const [messages, setMessages] = useState([])
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState('all')
  const [channel, setChannel] = useState('sms')
  const [noteMode, setNoteMode] = useState(false)
  const [body, setBody] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [attachments, setAttachments] = useState([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [sending, setSending] = useState(false)
  const [showSimulate, setShowSimulate] = useState(false)
  const threadRef = useRef(null)

  const activeConv = conversations.find(c => c.clientId === activeClientId)

  function refresh() {
    const convs = getConversations()
    setConversations(convs)
    if (activeClientId) {
      setMessages(getClientMessages(activeClientId))
    }
  }

  function openConversation(clientId) {
    setActiveClientId(clientId)
    markConversationRead(clientId)
    setMessages(getClientMessages(clientId))
    setConversations(getConversations())
    setBody('')
    setEmailSubject('')
    setAttachments([])
    setNoteMode(false)
  }

  useEffect(() => {
    if (initialClientId) openConversation(initialClientId)
  }, [initialClientId])

  // Auto-scroll to bottom of thread
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [messages])

  // Date dividers in thread
  const messagesWithDividers = useMemo(() => {
    const result = []
    let lastDay = null
    messages.forEach(m => {
      const day = fmtDay(m.createdAt)
      if (day !== lastDay) {
        result.push({ type: 'divider', day, id: `div-${m.id}` })
        lastDay = day
      }
      result.push({ type: 'message', ...m })
    })
    return result
  }, [messages])

  // Filter conversations
  const filteredConvs = useMemo(() => {
    const q = search.toLowerCase()
    return conversations.filter(c => {
      if (q && !c.clientName.toLowerCase().includes(q) && !(c.lastMessage?.body || '').toLowerCase().includes(q)) return false
      if (filterTab === 'unread') return c.unread > 0
      if (filterTab === 'sms') return c.lastMessage?.channel === 'sms'
      if (filterTab === 'email') return c.lastMessage?.channel === 'email'
      return true
    })
  }, [conversations, search, filterTab])

  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0)

  function handleSend() {
    if (!body.trim() || !activeClientId) return
    setSending(true)

    if (noteMode) {
      logNote({
        clientId: activeClientId, clientName: activeConv?.clientName || '',
        body, sentBy: user?.id, sentByName: user?.name,
      })
    } else {
      sendMessage({
        clientId: activeClientId, clientName: activeConv?.clientName || '',
        channel, subject: channel === 'email' ? emailSubject : '',
        body, attachments,
        sentBy: user?.id, sentByName: user?.name,
      })
    }

    setTimeout(() => {
      refresh()
      setBody('')
      setEmailSubject('')
      setAttachments([])
      setSending(false)
    }, 300)
  }

  function handleTemplate(tpl) {
    const vars = { clientName: activeConv?.clientName || '' }
    const filled = fillTemplate(tpl.body, vars)
    setBody(filled)
    if (tpl.subject) setEmailSubject(fillTemplate(tpl.subject, vars))
    setShowTemplates(false)
  }

  function handleSimulateReply() {
    const replies = [
      'Thank you for the update!',
      'Sounds good, see you then.',
      'Can you send me the invoice?',
      'When will the parts arrive?',
      'Great, appreciated!',
    ]
    const randomReply = replies[Math.floor(Math.random() * replies.length)]
    simulateIncomingReply({
      clientId: activeClientId, clientName: activeConv?.clientName || '',
      channel, body: randomReply,
    })
    refresh()
    setShowSimulate(false)
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 100px)', background: '#f9fafb', borderRadius: 10, overflow: 'hidden', border: '1px solid #e8e9ec' }}>
      {/* ── Left panel: conversation list ── */}
      <div style={{ width: 280, minWidth: 280, background: '#fff', borderRight: '1px solid #e8e9ec', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid #f0f1f3' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#1a1d23' }}>Inbox</span>
            {totalUnread > 0 && (
              <span style={{ background: '#2563eb', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10 }}>
                {totalUnread} unread
              </span>
            )}
          </div>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input
              placeholder="Search conversations..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '7px 10px 7px 26px', border: '1px solid #e8e9ec', borderRadius: 6, fontSize: 12.5, boxSizing: 'border-box', color: '#374151' }}
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', padding: '0 6px', borderBottom: '1px solid #f0f1f3' }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'unread', label: 'Unread' },
            { key: 'sms', label: 'SMS' },
            { key: 'email', label: 'Email' },
          ].map(t => (
            <button key={t.key} onClick={() => setFilterTab(t.key)}
              style={{
                flex: 1, padding: '8px 4px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 11.5, fontWeight: filterTab === t.key ? 700 : 500,
                color: filterTab === t.key ? '#2563eb' : '#6b7280',
                borderBottom: `2px solid ${filterTab === t.key ? '#2563eb' : 'transparent'}`,
                marginBottom: -1,
              }}>{t.label}</button>
          ))}
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredConvs.map(c => (
            <ConvoItem
              key={c.clientId}
              conv={c}
              isActive={c.clientId === activeClientId}
              onClick={() => openConversation(c.clientId)}
              filterTab={filterTab}
            />
          ))}
          {filteredConvs.length === 0 && (
            <div style={{ padding: 24, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              No conversations found.
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel: thread + compose ── */}
      {activeClientId && activeConv ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Thread header */}
          <div style={{ padding: '12px 18px', background: '#fff', borderBottom: '1px solid #e8e9ec', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name={activeConv.clientName} size={36} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1a1d23' }}>{activeConv.clientName}</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowSimulate(true)}
                style={{ padding: '5px 12px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 5, fontSize: 11.5, cursor: 'pointer', fontWeight: 600 }}>
                Simulate Reply
              </button>
              <button
                onClick={() => { markConversationRead(activeClientId); refresh() }}
                style={{ padding: '5px 12px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 5, fontSize: 11.5, cursor: 'pointer', fontWeight: 600 }}>
                Mark All Read
              </button>
            </div>
          </div>

          {/* Simulate reply modal */}
          {showSimulate && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: '#fff', borderRadius: 10, padding: 24, maxWidth: 360, width: '90%' }}>
                <h3 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 800 }}>Simulate Incoming Reply</h3>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px' }}>
                  This will add a random incoming message from {activeConv.clientName} for demo purposes.
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowSimulate(false)}
                    style={{ flex: 1, padding: '8px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 5, cursor: 'pointer', fontSize: 13 }}>
                    Cancel
                  </button>
                  <button onClick={handleSimulateReply}
                    style={{ flex: 1, padding: '8px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                    Send Reply
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Thread area */}
          <div ref={threadRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 0', background: '#fafafa' }}>
            {messagesWithDividers.map(item => {
              if (item.type === 'divider') {
                return (
                  <div key={item.id} style={{ textAlign: 'center', padding: '10px 0' }}>
                    <span style={{ background: '#e8e9ec', color: '#6b7280', fontSize: 11, padding: '3px 12px', borderRadius: 10 }}>
                      {item.day}
                    </span>
                  </div>
                )
              }
              return <MessageBubble key={item.id} msg={item} />
            })}
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>
                No messages yet. Start the conversation below.
              </div>
            )}
          </div>

          {/* Compose area */}
          <div style={{ background: '#fff', borderTop: '1px solid #e8e9ec', padding: '12px 16px' }}>
            {/* Channel tabs */}
            <div style={{ display: 'flex', gap: 2, marginBottom: noteMode ? 0 : 10, alignItems: 'center' }}>
              {[
                { key: 'sms', label: '💬 SMS' },
                { key: 'email', label: '✉️ Email' },
              ].map(ch => (
                <button key={ch.key} onClick={() => { setChannel(ch.key); setNoteMode(false) }}
                  disabled={noteMode}
                  style={{
                    padding: '5px 12px', borderRadius: '5px 5px 0 0', border: '1px solid',
                    borderColor: !noteMode && channel === ch.key ? '#2563eb' : '#e8e9ec',
                    borderBottom: !noteMode && channel === ch.key ? 'none' : '1px solid #e8e9ec',
                    background: !noteMode && channel === ch.key ? '#fff' : '#f9fafb',
                    color: !noteMode && channel === ch.key ? '#2563eb' : '#6b7280',
                    fontSize: 12, fontWeight: !noteMode && channel === ch.key ? 700 : 500, cursor: 'pointer',
                    marginBottom: -1,
                  }}>{ch.label}</button>
              ))}
              <button onClick={() => { setNoteMode(n => !n) }}
                style={{
                  marginLeft: 4, padding: '5px 12px', border: '1px solid',
                  borderColor: noteMode ? '#f59e0b' : '#e8e9ec',
                  borderRadius: 5, background: noteMode ? '#fffbeb' : '#f9fafb',
                  color: noteMode ? '#92400e' : '#6b7280',
                  fontSize: 12, fontWeight: noteMode ? 700 : 500, cursor: 'pointer',
                }}>
                📌 {noteMode ? 'Note Mode (on)' : 'Internal Note'}
              </button>
              {channel === 'sms' && !noteMode && (
                <span style={{ marginLeft: 'auto', fontSize: 11, color: body.length > 128 ? '#d97706' : '#9ca3af' }}>
                  {body.length}/160
                </span>
              )}
            </div>

            <div style={{
              border: `1px solid ${noteMode ? '#fde68a' : '#d1d5db'}`,
              borderRadius: noteMode ? 8 : '0 8px 8px 8px',
              background: noteMode ? '#fffbeb' : '#fff',
              overflow: 'hidden',
            }}>
              {/* Email subject */}
              {channel === 'email' && !noteMode && (
                <input
                  value={emailSubject}
                  onChange={e => setEmailSubject(e.target.value)}
                  placeholder="Subject..."
                  style={{ width: '100%', padding: '8px 12px', border: 'none', borderBottom: '1px solid #e8e9ec', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
              )}

              {/* Text area */}
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                placeholder={
                  noteMode
                    ? 'Internal note (not visible to client)...'
                    : `Type a message to ${activeConv?.clientName || 'client'}... (Enter to send, Shift+Enter for newline)`
                }
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px', border: 'none', outline: 'none',
                  fontSize: 13.5, resize: 'none', background: 'transparent', boxSizing: 'border-box',
                  color: noteMode ? '#78350f' : '#1a1d23', lineHeight: 1.5,
                }}
              />

              {/* Attachments preview */}
              {attachments.length > 0 && (
                <div style={{ padding: '4px 12px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {attachments.map((a, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f3f4f6', padding: '3px 8px', borderRadius: 4, fontSize: 11 }}>
                      📎 {a.name}
                      <button onClick={() => setAttachments(att => att.filter((_, idx) => idx !== i))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 13, lineHeight: 1, padding: 0 }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderTop: '1px solid #f0f1f3' }}>
                {/* Attach */}
                <button
                  onClick={() => {
                    const name = prompt('Attachment name (demo):')
                    if (name) setAttachments(a => [...a, { name, size: '—' }])
                  }}
                  title="Attach file"
                  style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 14, borderRadius: 4 }}>
                  📎
                </button>

                {/* Templates */}
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowTemplates(t => !t)} title="Templates"
                    style={{ padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 14, borderRadius: 4 }}>
                    📋
                  </button>
                  {showTemplates && (
                    <TemplatePicker
                      channel={noteMode ? 'sms' : channel}
                      clientName={activeConv?.clientName || ''}
                      onInsert={handleTemplate}
                      onClose={() => setShowTemplates(false)}
                    />
                  )}
                </div>

                <div style={{ flex: 1 }} />

                {/* Send buttons */}
                {noteMode ? (
                  <button onClick={handleSend} disabled={!body.trim() || sending}
                    style={{
                      padding: '6px 16px', background: body.trim() ? '#f59e0b' : '#f9fafb',
                      color: body.trim() ? '#fff' : '#9ca3af', border: 'none', borderRadius: 6,
                      fontSize: 12.5, cursor: body.trim() ? 'pointer' : 'default', fontWeight: 700,
                    }}>
                    📌 Save Note
                  </button>
                ) : (
                  <>
                    {channel === 'sms' && (
                      <button onClick={handleSend} disabled={!body.trim() || sending}
                        style={{
                          padding: '6px 16px', background: body.trim() ? '#2563eb' : '#e8e9ec',
                          color: body.trim() ? '#fff' : '#9ca3af', border: 'none', borderRadius: 6,
                          fontSize: 12.5, cursor: body.trim() ? 'pointer' : 'default', fontWeight: 700,
                        }}>
                        {sending ? 'Sending…' : 'Send SMS'}
                      </button>
                    )}
                    {channel === 'email' && (
                      <button onClick={handleSend} disabled={!body.trim() || sending}
                        style={{
                          padding: '6px 16px', background: 'none', color: body.trim() ? '#2563eb' : '#9ca3af',
                          border: `1px solid ${body.trim() ? '#2563eb' : '#e8e9ec'}`,
                          borderRadius: 6, fontSize: 12.5, cursor: body.trim() ? 'pointer' : 'default', fontWeight: 700,
                        }}>
                        {sending ? 'Sending…' : '✉️ Send Email'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
          <div style={{ textAlign: 'center', color: '#9ca3af' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Client Inbox</div>
            <div style={{ fontSize: 13 }}>Select a conversation to view messages</div>
          </div>
        </div>
      )}
    </div>
  )
}
