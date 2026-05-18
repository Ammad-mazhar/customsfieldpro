import { useState, useMemo, useRef } from 'react'
import { getLeads, saveLead, deleteLead, generateLeadNumber, saveServiceCall, generateServiceCallId } from '../data/store'
import { useAuth } from '../auth/AuthContext'

// ─── Stage config ──────────────────────────────────────────────────────────────
const STAGES = [
  { code: 'new',        label: 'New Lead',    color: '#6B7280', bg: '#F3F4F6', border: '#e5e7eb' },
  { code: 'contacted',  label: 'Contacted',   color: '#2563EB', bg: '#EFF6FF', border: '#bfdbfe' },
  { code: 'quote_sent', label: 'Quote Sent',  color: '#D97706', bg: '#FFFBEB', border: '#fde68a' },
  { code: 'follow_up',  label: 'Follow Up',   color: '#7C3AED', bg: '#F5F3FF', border: '#ddd6fe' },
  { code: 'won',        label: 'Won',         color: '#059669', bg: '#ECFDF5', border: '#6ee7b7' },
  { code: 'lost',       label: 'Lost',        color: '#DC2626', bg: '#FEF2F2', border: '#fca5a5' },
]
const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.code, s]))
const ACTIVE_STAGES = STAGES.filter(s => s.code !== 'won' && s.code !== 'lost')
const PIPELINE_STAGES = STAGES.filter(s => s.code !== 'won' && s.code !== 'lost')

function stageCfg(code) { return STAGE_MAP[code] || STAGES[0] }

function StageBadge({ code }) {
  const s = stageCfg(code)
  return (
    <span style={{
      display: 'inline-block', fontSize: 11, fontWeight: 700,
      padding: '2px 8px', borderRadius: 3,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap',
    }}>{s.label}</span>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return null
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return String(d) }
}
function isOverdue(ts) {
  if (!ts) return false
  return ts < Date.now()
}
function fullName(lead) {
  const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ')
  return lead.company || name || '—'
}

const SOURCES = ['website', 'phone', 'referral', 'email', 'social', 'other']
const ACTIVITY_TYPES = [
  { code: 'phone', label: 'Phone Call', icon: '📞' },
  { code: 'email', label: 'Email', icon: '✉️' },
  { code: 'meeting', label: 'Meeting', icon: '🤝' },
  { code: 'note', label: 'Note', icon: '📝' },
  { code: 'quote', label: 'Quote Sent', icon: '📄' },
]

const card = {
  background: '#fff',
  border: '1px solid #e8e9ec',
  borderRadius: 8,
  padding: '16px 18px',
  marginBottom: 14,
}

// ─── Tab 1: Kanban ─────────────────────────────────────────────────────────────
function KanbanCard({ lead, onClick, onStageChange }) {
  const overdue = isOverdue(lead.nextFollowUp) && lead.stage !== 'won' && lead.stage !== 'lost'
  const s = stageCfg(lead.stage)

  return (
    <div onClick={() => onClick(lead)}
      style={{
        background: '#fff', border: '1px solid #e8e9ec', borderRadius: 6,
        padding: '10px 12px', cursor: 'pointer', marginBottom: 8,
        borderLeft: `3px solid ${s.color}`,
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.10)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1d23', marginBottom: 2 }}>{fullName(lead)}</div>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 5 }}>{lead.serviceInterested} · {lead.equipmentType}</div>
      {lead.potentialValue > 0 && (
        <div style={{ fontSize: 12, fontWeight: 700, color: '#059669' }}>${lead.potentialValue.toLocaleString()}</div>
      )}
      {lead.nextFollowUp && (
        <div style={{ marginTop: 5, fontSize: 11, color: overdue ? '#dc2626' : '#6b7280', fontWeight: overdue ? 700 : 400 }}>
          {overdue ? '⚠ Overdue: ' : '↪ Follow up: '}{fmtDate(lead.nextFollowUp)}
        </div>
      )}
      <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {PIPELINE_STAGES.map(st => (
          <button key={st.code} onClick={e => { e.stopPropagation(); onStageChange(lead, st.code) }}
            style={{
              padding: '1px 6px', fontSize: 10, borderRadius: 3, border: '1px solid',
              background: lead.stage === st.code ? st.bg : '#fff',
              color: lead.stage === st.code ? st.color : '#9ca3af',
              borderColor: lead.stage === st.code ? st.border : '#e5e7eb',
              cursor: 'pointer', fontWeight: lead.stage === st.code ? 700 : 400,
            }}>{st.label}</button>
        ))}
      </div>
    </div>
  )
}

function Kanban({ leads, onDetail, onRefresh }) {
  function handleStageChange(lead, newStage) {
    const updated = { ...lead, stage: newStage, updatedAt: new Date().toISOString() }
    saveLead(updated)
    onRefresh()
  }

  const byStage = useMemo(() => {
    const m = {}
    STAGES.forEach(s => { m[s.code] = [] })
    leads.forEach(l => { if (m[l.stage]) m[l.stage].push(l) })
    return m
  }, [leads])

  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
      {STAGES.map(s => {
        const colLeads = byStage[s.code] || []
        const colVal = colLeads.reduce((t, l) => t + (l.potentialValue || 0), 0)
        return (
          <div key={s.code} style={{ minWidth: 200, flex: 1 }}>
            <div style={{
              padding: '7px 10px', borderRadius: '6px 6px 0 0',
              background: s.bg, borderBottom: `2px solid ${s.color}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 6,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.label}</span>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {colVal > 0 && <span style={{ fontSize: 10, color: '#059669', fontWeight: 700 }}>${colVal.toLocaleString()}</span>}
                <span style={{ background: s.color, color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px' }}>{colLeads.length}</span>
              </div>
            </div>
            <div style={{ minHeight: 60 }}>
              {colLeads.map(l => (
                <KanbanCard key={l.id} lead={l} onClick={onDetail} onStageChange={handleStageChange} />
              ))}
              {colLeads.length === 0 && (
                <div style={{ padding: '14px 10px', textAlign: 'center', fontSize: 11, color: '#d1d5db', border: '1px dashed #e5e7eb', borderRadius: 5 }}>
                  No leads
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Tab 2: Table ──────────────────────────────────────────────────────────────
function LeadsTable({ leads, onDetail }) {
  const [sort, setSort] = useState({ col: 'createdAt', dir: 'desc' })

  function toggleSort(col) {
    setSort(s => s.col === col ? { col, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'asc' })
  }

  const sorted = useMemo(() => {
    const arr = [...leads]
    arr.sort((a, b) => {
      let av = a[sort.col], bv = b[sort.col]
      if (sort.col === 'potentialValue') { av = av || 0; bv = bv || 0 }
      if (sort.col === 'createdAt' || sort.col === 'nextFollowUp') { av = av || 0; bv = bv || 0 }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1
      if (av > bv) return sort.dir === 'asc' ? 1 : -1
      return 0
    })
    return arr
  }, [leads, sort])

  const SortTh = ({ col, children }) => (
    <th onClick={() => toggleSort(col)} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 11.5, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
      {children} {sort.col === col ? (sort.dir === 'asc' ? '▲' : '▼') : ''}
    </th>
  )

  return (
    <div style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 8, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e8e9ec' }}>
            <SortTh col="leadNumber">Lead #</SortTh>
            <SortTh col="lastName">Name / Company</SortTh>
            <th style={{ padding: '9px 12px', fontSize: 11.5, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'left' }}>Service</th>
            <SortTh col="potentialValue">Value</SortTh>
            <SortTh col="stage">Stage</SortTh>
            <SortTh col="source">Source</SortTh>
            <SortTh col="nextFollowUp">Follow Up</SortTh>
            <SortTh col="createdAt">Created</SortTh>
            <th style={{ padding: '9px 12px', fontSize: 11.5, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: 'left' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((l, i) => {
            const overdue = isOverdue(l.nextFollowUp) && l.stage !== 'won' && l.stage !== 'lost'
            return (
              <tr key={l.id} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa', borderBottom: '1px solid #f0f1f3' }}>
                <td style={{ padding: '8px 12px', fontWeight: 700, color: '#2563eb', cursor: 'pointer' }} onClick={() => onDetail(l)}>{l.leadNumber}</td>
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ fontWeight: 600, color: '#1a1d23' }}>{fullName(l)}</div>
                  <div style={{ fontSize: 11, color: '#6b7280' }}>{l.phone}</div>
                </td>
                <td style={{ padding: '8px 12px', color: '#374151' }}>
                  {l.serviceInterested}
                  {l.equipmentType && <span style={{ color: '#9ca3af' }}> · {l.equipmentType}</span>}
                </td>
                <td style={{ padding: '8px 12px', fontWeight: 700, color: '#059669' }}>
                  {l.potentialValue ? `$${l.potentialValue.toLocaleString()}` : '—'}
                </td>
                <td style={{ padding: '8px 12px' }}><StageBadge code={l.stage} /></td>
                <td style={{ padding: '8px 12px', color: '#6b7280', textTransform: 'capitalize' }}>{l.source || '—'}</td>
                <td style={{ padding: '8px 12px', color: overdue ? '#dc2626' : '#6b7280', fontWeight: overdue ? 700 : 400 }}>
                  {l.nextFollowUp ? (overdue ? '⚠ ' : '') + fmtDate(l.nextFollowUp) : '—'}
                </td>
                <td style={{ padding: '8px 12px', color: '#6b7280' }}>{fmtDate(l.createdAt)}</td>
                <td style={{ padding: '8px 12px' }}>
                  <button onClick={() => onDetail(l)}
                    style={{ padding: '4px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                    View
                  </button>
                </td>
              </tr>
            )
          })}
          {sorted.length === 0 && (
            <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No leads found.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// ─── Tab 3: Lead Detail ────────────────────────────────────────────────────────
function LeadDetail({ lead: initialLead, onBack, onRefresh }) {
  const { user } = useAuth()
  const [lead, setLead] = useState(initialLead)
  const [activityType, setActivityType] = useState('note')
  const [activityDesc, setActivityDesc] = useState('')
  const [activityOutcome, setActivityOutcome] = useState('')
  const [showConvert, setShowConvert] = useState(false)
  const [showLost, setShowLost] = useState(false)
  const [lostReason, setLostReason] = useState('')
  const [newNote, setNewNote] = useState('')
  const [followUpDate, setFollowUpDate] = useState(
    lead.nextFollowUp ? new Date(lead.nextFollowUp).toISOString().slice(0, 10) : ''
  )
  const [editingStage, setEditingStage] = useState(false)

  function save(changes, logEntry) {
    const updated = {
      ...lead, ...changes,
      updatedAt: new Date().toISOString(),
      activityLog: logEntry
        ? [...(lead.activityLog || []), { id: `al-${Date.now()}`, ...logEntry, by: user?.name || 'User', at: new Date().toISOString() }]
        : lead.activityLog,
    }
    saveLead(updated)
    setLead(updated)
    onRefresh()
  }

  function addActivity() {
    if (!activityDesc.trim()) return
    save({}, { type: activityType, description: activityDesc.trim(), outcome: activityOutcome.trim() })
    setActivityDesc('')
    setActivityOutcome('')
  }

  function addNote() {
    if (!newNote.trim()) return
    const note = { id: `n-${Date.now()}`, text: newNote.trim(), by: user?.name || 'User', at: new Date().toISOString() }
    save({ notes: [...(lead.notes || []), note] }, null)
    setNewNote('')
  }

  function setStage(stage) {
    save({ stage }, { type: 'note', description: `Stage changed to ${stageCfg(stage).label}` })
    setEditingStage(false)
  }

  function saveFollowUp() {
    const ts = followUpDate ? new Date(followUpDate).getTime() : null
    save({ nextFollowUp: ts }, ts ? { type: 'note', description: `Follow-up set for ${fmtDate(ts)}` } : null)
  }

  function convertToClient() {
    // Create a minimal service call
    const scId = generateServiceCallId()
    const sc = {
      id: scId, callId: scId,
      clientName: fullName(lead), customer: fullName(lead),
      phone: lead.phone, email: lead.email, address: lead.address,
      serviceNeeded: lead.serviceInterested,
      equipmentType: lead.equipmentType, equipmentBrand: '',
      description: lead.problemDescription,
      status: '01',
      csr: user?.name || 'Admin', csrId: user?.id || 'user-1',
      communicationLog: [],
      createdDate: new Date().toISOString().slice(0, 10),
      scheduledDate: '', techName: '', techId: null, dispatchNumber: '',
    }
    saveServiceCall(sc)
    save({
      stage: 'won',
      convertedAt: new Date().toISOString(),
      convertedServiceCallId: scId,
    }, { type: 'note', description: `Lead converted to client. Service call ${scId} created.` })
    setShowConvert(false)
  }

  function markLost() {
    if (!lostReason.trim()) return
    save({ stage: 'lost', lostReason: lostReason.trim() }, { type: 'note', description: `Lead marked lost. Reason: ${lostReason.trim()}` })
    setShowLost(false)
  }

  const s = stageCfg(lead.stage)
  const overdue = isOverdue(lead.nextFollowUp) && lead.stage !== 'won' && lead.stage !== 'lost'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <button onClick={onBack}
          style={{ padding: '6px 12px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
          ← All Leads
        </button>
        <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1a1d23', margin: 0 }}>{lead.leadNumber} — {fullName(lead)}</h2>
        <StageBadge code={lead.stage} />
        <div style={{ flex: 1 }} />
        {lead.stage !== 'won' && lead.stage !== 'lost' && (
          <>
            <button onClick={() => setShowConvert(true)}
              style={{ padding: '6px 14px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
              Convert to Client
            </button>
            <button onClick={() => setShowLost(true)}
              style={{ padding: '6px 14px', background: '#fff', color: '#dc2626', border: '1px solid #dc2626', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
              Mark Lost
            </button>
          </>
        )}
      </div>

      {/* Convert modal */}
      {showConvert && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 28, maxWidth: 420, width: '90%' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800 }}>Convert to Client</h3>
            <p style={{ fontSize: 13, color: '#374151', marginBottom: 16 }}>
              This will create a new Service Call for <strong>{fullName(lead)}</strong> and mark this lead as Won.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowConvert(false)}
                style={{ padding: '7px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                Cancel
              </button>
              <button onClick={convertToClient}
                style={{ padding: '7px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
                Convert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lost modal */}
      {showLost && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 28, maxWidth: 420, width: '90%' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 800, color: '#dc2626' }}>Mark as Lost</h3>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Reason for losing this lead *</label>
            <input value={lostReason} onChange={e => setLostReason(e.target.value)}
              placeholder="e.g. Went with competitor, No budget, Not responding..."
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
              <button onClick={() => setShowLost(false)}
                style={{ padding: '7px 16px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
                Cancel
              </button>
              <button onClick={markLost}
                style={{ padding: '7px 16px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
                Confirm Lost
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Left */}
        <div>
          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Contact Info</div>
            {[
              ['Lead #', lead.leadNumber],
              ['Name', fullName(lead)],
              ['Phone', lead.phone || '—'],
              ['Email', lead.email || '—'],
              ['Address', lead.address || '—'],
              ['Source', lead.source ? lead.source.charAt(0).toUpperCase() + lead.source.slice(1) : '—'],
              ['Referral', lead.referralSource || '—'],
              ['Assigned To', lead.assignedToName || '—'],
              ['Created', fmtDate(lead.createdAt)],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                <span style={{ color: '#6b7280', fontWeight: 600 }}>{k}</span>
                <span style={{ color: '#1a1d23', fontWeight: 500, textAlign: 'right', maxWidth: 220 }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Service Details</div>
            {[
              ['Service', lead.serviceInterested || '—'],
              ['Equipment', lead.equipmentType || '—'],
              ['Potential Value', lead.potentialValue ? `$${lead.potentialValue.toLocaleString()}` : '—'],
              ...(lead.quoteNumber ? [['Quote #', lead.quoteNumber]] : []),
              ...(lead.convertedAt ? [['Converted', fmtDate(lead.convertedAt)]] : []),
              ...(lead.convertedServiceCallId ? [['Service Call', lead.convertedServiceCallId]] : []),
              ...(lead.lostReason ? [['Lost Reason', lead.lostReason]] : []),
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}>
                <span style={{ color: '#6b7280', fontWeight: 600 }}>{k}</span>
                <span style={{ color: '#1a1d23', fontWeight: 500, textAlign: 'right', maxWidth: 220 }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Problem Description</div>
              <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{lead.problemDescription || '—'}</p>
            </div>
          </div>

          {/* Stage + Follow-up */}
          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Pipeline Stage</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {STAGES.map(st => (
                <button key={st.code} onClick={() => setStage(st.code)}
                  style={{
                    padding: '4px 10px', borderRadius: 4, border: '1px solid',
                    background: lead.stage === st.code ? st.bg : '#fff',
                    color: lead.stage === st.code ? st.color : '#9ca3af',
                    borderColor: lead.stage === st.code ? st.border : '#e5e7eb',
                    cursor: 'pointer', fontSize: 12, fontWeight: lead.stage === st.code ? 700 : 400,
                  }}>{st.label}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, color: '#374151', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Next Follow-up Date {overdue && <span style={{ color: '#dc2626' }}>⚠ OVERDUE</span>}
                </label>
                <input type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)}
                  style={{ width: '100%', padding: '7px 8px', border: `1px solid ${overdue ? '#dc2626' : '#d1d5db'}`, borderRadius: 5, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              <button onClick={saveFollowUp}
                style={{ padding: '7px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                Save
              </button>
            </div>
          </div>

          {/* Notes */}
          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Notes</div>
            {(lead.notes || []).map(n => (
              <div key={n.id} style={{ marginBottom: 8, padding: '8px 10px', background: '#fffbeb', borderRadius: 5, fontSize: 13, borderLeft: '3px solid #fbbf24' }}>
                <div style={{ color: '#374151' }}>{n.text}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{n.by} · {fmtDate(n.at)}</div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a note..."
                style={{ flex: 1, padding: '7px 9px', border: '1px solid #d1d5db', borderRadius: 5, fontSize: 13 }}
                onKeyDown={e => e.key === 'Enter' && addNote()} />
              <button onClick={addNote}
                style={{ padding: '7px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Right */}
        <div>
          {/* Log activity */}
          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>Log Activity</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {ACTIVITY_TYPES.map(at => (
                <button key={at.code} onClick={() => setActivityType(at.code)}
                  style={{
                    padding: '4px 10px', borderRadius: 4, border: '1px solid',
                    background: activityType === at.code ? '#eff6ff' : '#fff',
                    color: activityType === at.code ? '#2563eb' : '#6b7280',
                    borderColor: activityType === at.code ? '#bfdbfe' : '#e5e7eb',
                    cursor: 'pointer', fontSize: 12, fontWeight: activityType === at.code ? 700 : 400,
                  }}>{at.label}</button>
              ))}
            </div>
            <textarea value={activityDesc} onChange={e => setActivityDesc(e.target.value)}
              placeholder="Describe the activity..."
              rows={3}
              style={{ width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 5, fontSize: 13, resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={activityOutcome} onChange={e => setActivityOutcome(e.target.value)}
                placeholder="Outcome (optional)"
                style={{ flex: 1, padding: '7px 9px', border: '1px solid #d1d5db', borderRadius: 5, fontSize: 13 }} />
              <button onClick={addActivity}
                style={{ padding: '7px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                Log
              </button>
            </div>
          </div>

          {/* Activity timeline */}
          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Activity Timeline</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {(lead.activityLog || []).slice().reverse().map((entry, i) => {
                const at = ACTIVITY_TYPES.find(a => a.code === entry.type) || ACTIVITY_TYPES[3]
                return (
                  <div key={entry.id || i} style={{ display: 'flex', gap: 10, paddingBottom: 12, borderLeft: '2px solid #e8e9ec', marginLeft: 10, paddingLeft: 14, position: 'relative' }}>
                    <div style={{ position: 'absolute', left: -8, top: 3, width: 14, height: 14, borderRadius: '50%', background: '#fff', border: '2px solid #2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8 }}>
                      {at.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, color: '#374151' }}>{entry.description}</div>
                      {entry.outcome && <div style={{ fontSize: 11, color: '#059669', fontWeight: 600, marginTop: 2 }}>→ {entry.outcome}</div>}
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{entry.by} · {fmtDate(entry.at)}</div>
                    </div>
                  </div>
                )
              })}
              {(!lead.activityLog || lead.activityLog.length === 0) && (
                <div style={{ fontSize: 13, color: '#9ca3af', padding: '10px 0' }}>No activity yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab 4: Add Lead ───────────────────────────────────────────────────────────
const EMPTY_LEAD_FORM = {
  firstName: '', lastName: '', company: '',
  phone: '', email: '', address: '',
  serviceInterested: '', equipmentType: '',
  problemDescription: '', potentialValue: '',
  source: 'website', referralSource: '',
  stage: 'new',
  nextFollowUp: '',
}

function AddLead({ onCreated }) {
  const { user } = useAuth()
  const [form, setForm] = useState(EMPTY_LEAD_FORM)
  const [errors, setErrors] = useState({})
  const [saved, setSaved] = useState(false)

  function setF(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function validate() {
    const e = {}
    if (!form.firstName.trim() && !form.company.trim()) e.firstName = 'First name or company required'
    if (!form.phone.trim() && !form.email.trim()) e.phone = 'Phone or email required'
    if (!form.serviceInterested.trim()) e.serviceInterested = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSave() {
    if (!validate()) return
    const leadNumber = generateLeadNumber()
    const id = `lead-${Date.now()}`
    const lead = {
      ...form,
      id, leadNumber,
      potentialValue: parseFloat(form.potentialValue) || 0,
      nextFollowUp: form.nextFollowUp ? new Date(form.nextFollowUp).getTime() : null,
      quoteId: null, quoteNumber: null,
      convertedToClientId: null, convertedAt: null, lostReason: null,
      activityLog: [{ id: `al-${Date.now()}`, type: 'note', description: 'Lead created', by: user?.name || 'User', at: new Date().toISOString() }],
      notes: [],
      assignedTo: user?.id || 'user-1', assignedToName: user?.name || 'Admin',
      createdBy: user?.id || 'user-1',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    }
    saveLead(lead)
    setSaved(true)
    setTimeout(() => { setSaved(false); onCreated(lead) }, 1200)
  }

  const inp = (extra = {}) => ({
    style: { width: '100%', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', ...extra.style },
    ...extra,
  })

  const fieldErr = k => errors[k] ? <div style={{ color: '#dc2626', fontSize: 11, marginTop: 2 }}>{errors[k]}</div> : null

  return (
    <div style={{ maxWidth: 720 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1d23', marginBottom: 20 }}>New Lead</h2>

      {saved && (
        <div style={{ background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 6, padding: '10px 16px', marginBottom: 16, color: '#065f46', fontWeight: 600, fontSize: 13 }}>
          Lead saved successfully.
        </div>
      )}

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Contact</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>First Name</label>
            <input {...inp()} value={form.firstName} onChange={e => setF('firstName', e.target.value)} />
            {fieldErr('firstName')}
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Last Name</label>
            <input {...inp()} value={form.lastName} onChange={e => setF('lastName', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Company</label>
            <input {...inp()} value={form.company} onChange={e => setF('company', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Phone</label>
            <input {...inp()} value={form.phone} onChange={e => setF('phone', e.target.value)} />
            {fieldErr('phone')}
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Email</label>
            <input {...inp()} type="email" value={form.email} onChange={e => setF('email', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Source</label>
            <select value={form.source} onChange={e => setF('source', e.target.value)} style={{ ...inp().style }}>
              {SOURCES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Address</label>
          <input {...inp()} value={form.address} onChange={e => setF('address', e.target.value)} />
        </div>
        {form.source === 'referral' && (
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Referred By</label>
            <input {...inp()} value={form.referralSource} onChange={e => setF('referralSource', e.target.value)} />
          </div>
        )}
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Service Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Service Type *</label>
            <input {...inp()} value={form.serviceInterested} onChange={e => setF('serviceInterested', e.target.value)} placeholder="e.g. HVAC, Plumbing" />
            {fieldErr('serviceInterested')}
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Equipment Type</label>
            <input {...inp()} value={form.equipmentType} onChange={e => setF('equipmentType', e.target.value)} placeholder="e.g. AC Unit" />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Potential Value ($)</label>
            <input {...inp()} type="number" min="0" value={form.potentialValue} onChange={e => setF('potentialValue', e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Problem Description</label>
          <textarea {...inp()} rows={3} value={form.problemDescription} onChange={e => setF('problemDescription', e.target.value)}
            style={{ ...inp().style, resize: 'vertical' }} />
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pipeline</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Initial Stage</label>
            <select value={form.stage} onChange={e => setF('stage', e.target.value)} style={{ ...inp().style }}>
              {ACTIVE_STAGES.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Next Follow-up Date</label>
            <input {...inp()} type="date" value={form.nextFollowUp} onChange={e => setF('nextFollowUp', e.target.value)} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleSave}
          style={{ padding: '8px 22px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
          Save Lead
        </button>
      </div>
    </div>
  )
}

// ─── Main Leads page ───────────────────────────────────────────────────────────
const TABS = ['Kanban Pipeline', 'Table View', 'Add Lead']

export default function Leads() {
  const [tab, setTab] = useState(0)
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('')
  const [detailLead, setDetailLead] = useState(null)
  const [leads, setLeads] = useState(() => getLeads())

  function refresh() { setLeads(getLeads()) }

  function handleDetail(lead) {
    setDetailLead(lead)
  }

  function handleCreated(lead) {
    refresh()
    setDetailLead(lead)
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return leads.filter(l => {
      if (stageFilter && l.stage !== stageFilter) return false
      if (q) {
        return (
          fullName(l).toLowerCase().includes(q) ||
          (l.leadNumber || '').toLowerCase().includes(q) ||
          (l.phone || '').includes(q) ||
          (l.email || '').toLowerCase().includes(q) ||
          (l.serviceInterested || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [leads, search, stageFilter])

  const pipelineValue = useMemo(() =>
    leads.filter(l => l.stage !== 'lost').reduce((s, l) => s + (l.potentialValue || 0), 0),
    [leads])

  const overdueCount = useMemo(() =>
    leads.filter(l => isOverdue(l.nextFollowUp) && l.stage !== 'won' && l.stage !== 'lost').length,
    [leads])

  if (detailLead) {
    return (
      <div>
        <LeadDetail
          lead={detailLead}
          onBack={() => setDetailLead(null)}
          onRefresh={() => {
            refresh()
            // re-find the updated lead
            const updated = getLeads().find(l => l.id === detailLead.id)
            if (updated) setDetailLead(updated)
          }}
        />
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#1a1d23', margin: 0 }}>Lead Management</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 13 }}>
          <span style={{ color: '#059669', fontWeight: 700 }}>Pipeline: ${pipelineValue.toLocaleString()}</span>
          {overdueCount > 0 && (
            <span style={{ background: '#fef2f2', color: '#dc2626', padding: '3px 10px', borderRadius: 12, fontWeight: 700, fontSize: 12 }}>
              ⚠ {overdueCount} overdue
            </span>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 16 }}>
        {STAGES.map(s => {
          const count = leads.filter(l => l.stage === s.code).length
          return (
            <div key={s.code} style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 7, padding: '10px 12px', borderTop: `3px solid ${s.color}`, cursor: 'pointer' }}
              onClick={() => setStageFilter(v => v === s.code ? '' : s.code)}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{count}</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
            </div>
          )
        })}
      </div>

      {/* Tab bar + filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, borderBottom: '2px solid #e8e9ec', marginBottom: 16 }}>
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            style={{
              padding: '9px 20px', background: 'none', border: 'none',
              borderBottom: tab === i ? '2px solid #2563eb' : '2px solid transparent',
              marginBottom: -2,
              color: tab === i ? '#2563eb' : '#6b7280',
              fontWeight: tab === i ? 700 : 500, fontSize: 13, cursor: 'pointer',
            }}>{t}</button>
        ))}
        {tab !== 2 && (
          <div style={{ flex: 1, display: 'flex', gap: 8, justifyContent: 'flex-end', paddingBottom: 6 }}>
            <input placeholder="Search leads..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, width: 200 }} />
            <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }}>
              <option value="">All Stages</option>
              {STAGES.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {tab === 0 && <Kanban leads={filtered} onDetail={handleDetail} onRefresh={refresh} />}
      {tab === 1 && <LeadsTable leads={filtered} onDetail={handleDetail} />}
      {tab === 2 && <AddLead onCreated={handleCreated} />}
    </div>
  )
}
