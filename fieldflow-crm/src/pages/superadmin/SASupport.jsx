import { useState } from 'react'
import { Badge, Card, CardHeader, Btn, MetricCard } from './SuperAdmin'
import { SA_TICKETS } from './saData'

function PriorityBadge({ priority }) {
  const c = {
    Urgent: { bg: '#7f1d1d', color: '#fca5a5' },
    High:   { bg: '#fee2e2', color: '#dc2626' },
    Medium: { bg: '#fef9c3', color: '#ca8a04' },
    Normal: { bg: '#f3f4f6', color: '#6b7280' },
    Low:    { bg: '#f0fdf4', color: '#16a34a' },
  }[priority] || { bg: '#f3f4f6', color: '#6b7280' }
  return (
    <span style={{ background: c.bg, color: c.color, borderRadius: 99, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>
      {priority}
    </span>
  )
}

function TicketDetail({ ticket, onBack }) {
  const [messages, setMessages] = useState(ticket.messages)
  const [reply, setReply]       = useState('')
  const [note, setNote]         = useState('')
  const [status, setStatus]     = useState(ticket.status)
  const [notes, setNotes]       = useState(ticket.internalNotes)

  function sendReply() {
    if (!reply.trim()) return
    setMessages(m => [...m, { from: 'admin', text: reply, ts: new Date().toLocaleString() }])
    setStatus('In Progress')
    setReply('')
  }
  function addNote() {
    if (!note.trim()) return
    setNotes(n => [...n, { text: note, author: 'superadmin', ts: new Date().toLocaleString() }])
    setNote('')
  }

  const tenant = SA_TICKETS.find(t => t.id === ticket.id)

  return (
    <div>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 16, fontFamily: 'inherit' }}>
        ← Back to Tickets
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>

        {/* Main thread */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Header */}
          <Card>
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <span style={{ fontSize: 12, color: '#9ca3af', marginBottom: 6, display: 'block' }}>{ticket.id}</span>
                  <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#111827' }}>{ticket.subject}</h2>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <PriorityBadge priority={ticket.priority} />
                    <Badge status={status} />
                    <span style={{ fontSize: 12, color: '#9ca3af' }}>{ticket.date}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select value={status} onChange={e => setStatus(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: 7, border: '1.5px solid #d1d5db', fontSize: 13, outline: 'none', background: '#fff' }}>
                    {['Open', 'In Progress', 'Resolved', 'Closed'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </Card>

          {/* Message thread */}
          <Card>
            <CardHeader title="Conversation" />
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.map((m, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 10, flexDirection: m.from === 'admin' ? 'row-reverse' : 'row',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                    background: m.from === 'admin' ? '#2563eb' : '#f3f4f6',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: m.from === 'admin' ? '#fff' : '#374151',
                  }}>
                    {m.from === 'admin' ? 'SA' : ticket.business[0]}
                  </div>
                  <div style={{
                    maxWidth: '75%',
                    background: m.from === 'admin' ? '#eff6ff' : '#f9fafb',
                    borderRadius: m.from === 'admin' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                    padding: '10px 14px', fontSize: 13, color: '#374151',
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 11, color: '#9ca3af', marginBottom: 4 }}>
                      {m.from === 'admin' ? 'Support Team' : ticket.business} · {m.ts}
                    </div>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Reply form */}
            <div style={{ padding: '0 16px 16px' }}>
              <textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                placeholder="Write a reply..."
                rows={3}
                style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <Btn variant="primary" size="sm" onClick={sendReply}>Send Reply</Btn>
                <Btn variant="success" size="sm" onClick={() => setStatus('Resolved')}>Resolve</Btn>
              </div>
            </div>
          </Card>

          {/* Internal notes */}
          <Card>
            <CardHeader title="Internal Notes" sub="Not visible to tenant" />
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notes.map((n, i) => (
                <div key={i} style={{ background: '#fef9c3', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#854d0e' }}>
                  <div style={{ fontWeight: 700, fontSize: 11, marginBottom: 4 }}>{n.author} · {n.ts}</div>
                  {n.text}
                </div>
              ))}
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Add internal note (only visible to admins)..."
                rows={2}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
              />
              <Btn variant="outline" size="xs" onClick={addNote}>Add Note</Btn>
            </div>
          </Card>
        </div>

        {/* Sidebar — tenant info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <CardHeader title="Tenant Info" />
            <div style={{ padding: 16, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Business', ticket.business],
                ['Category', ticket.category],
                ['Submitted', ticket.date],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#6b7280' }}>{k}</span>
                  <span style={{ fontWeight: 600, color: '#111827' }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Btn variant="primary" size="sm" style={{ width: '100%' }}>View Tenant Account</Btn>
                <Btn variant="outline" size="sm" style={{ width: '100%' }}>Impersonate to Help</Btn>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Assign To" />
            <div style={{ padding: 16 }}>
              <select style={{ width: '100%', padding: '8px 12px', borderRadius: 7, border: '1.5px solid #d1d5db', fontSize: 13, outline: 'none', background: '#fff' }}>
                <option>Unassigned</option>
                <option>superadmin@customsfieldpro.com</option>
              </select>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function SASupport() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [tickets, setTickets] = useState(SA_TICKETS)
  const [detail, setDetail]   = useState(null)
  const [search, setSearch]   = useState('')

  if (detail) return <TicketDetail ticket={detail} onBack={() => setDetail(null)} />

  const filtered = tickets.filter(t => {
    const q = search.toLowerCase()
    return (
      (statusFilter === 'all' || t.status === statusFilter) &&
      (!priorityFilter || t.priority === priorityFilter) &&
      (t.subject.toLowerCase().includes(q) || t.business.toLowerCase().includes(q) || t.id.toLowerCase().includes(q))
    )
  })

  const open       = tickets.filter(t => t.status === 'Open').length
  const inProgress = tickets.filter(t => t.status === 'In Progress').length
  const resolved   = tickets.filter(t => t.status === 'Resolved').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <MetricCard label="Open"         value={open}       color="#ca8a04" />
        <MetricCard label="In Progress"  value={inProgress} color="#2563eb" />
        <MetricCard label="Resolved"     value={resolved}   color="#16a34a" />
        <MetricCard label="Total"        value={tickets.length} />
        <MetricCard label="Avg Response" value="4.2h" sub="last 30 days" />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search tickets..."
          style={{ flex: '1 1 200px', padding: '8px 14px', borderRadius: 8, border: '1.5px solid #d1d5db', fontSize: 13, outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {['all', 'Open', 'In Progress', 'Resolved', 'Closed'].map(s => (
            <Btn key={s} variant={statusFilter === s ? 'primary' : 'outline'} size="xs" onClick={() => setStatusFilter(s)}>
              {s === 'all' ? 'All' : s}
            </Btn>
          ))}
        </div>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={{ padding: '7px 12px', borderRadius: 7, border: '1.5px solid #d1d5db', fontSize: 13, outline: 'none', background: '#fff' }}>
          <option value="">All Priorities</option>
          {['Urgent', 'High', 'Medium', 'Normal', 'Low'].map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      <Card>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb', fontSize: 11, color: '#6b7280', textTransform: 'uppercase' }}>
              {['#', 'Business', 'Subject', 'Category', 'Priority', 'Status', 'Date', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }} onClick={() => setDetail(t)}>
                <td style={{ padding: '11px 14px', fontSize: 12, fontWeight: 700, color: '#2563eb' }}>{t.id}</td>
                <td style={{ padding: '11px 14px', fontSize: 13, color: '#111827', fontWeight: 600 }}>{t.business}</td>
                <td style={{ padding: '11px 14px', fontSize: 13, color: '#374151', maxWidth: 280 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</div>
                </td>
                <td style={{ padding: '11px 14px', fontSize: 12, color: '#6b7280' }}>{t.category}</td>
                <td style={{ padding: '11px 14px' }}><PriorityBadge priority={t.priority} /></td>
                <td style={{ padding: '11px 14px' }}><Badge status={t.status} /></td>
                <td style={{ padding: '11px 14px', fontSize: 12, color: '#9ca3af' }}>{t.date}</td>
                <td style={{ padding: '11px 14px' }} onClick={e => e.stopPropagation()}>
                  <Btn variant="primary" size="xs" onClick={() => setDetail(t)}>Open</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 28, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No tickets match your filters</div>
        )}
      </Card>
    </div>
  )
}
