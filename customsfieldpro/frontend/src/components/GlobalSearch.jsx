import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getClients as storeGetClients, getJobs as storeGetJobs, getInvoices as storeGetInvoices } from '../data/store'
import * as clientsApi from '../api/clients'
import * as jobsApi from '../api/jobs'
import * as invoicesApi from '../api/invoices'
import { useApiData } from '../api/hooks'

export default function GlobalSearch() {
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const inputRef = useRef(null)
  const navigate = useNavigate()

  // Pre-load data for instant search (API with localStorage fallback)
  const { data: allClients }  = useApiData(clientsApi.getClients,   storeGetClients)
  const { data: allJobs }     = useApiData(jobsApi.getJobs,         storeGetJobs)
  const { data: allInvoices } = useApiData(invoicesApi.getInvoices, storeGetInvoices)

  // Listen for Ctrl+K event dispatched by App.jsx
  useEffect(() => {
    function handler() { setOpen(o => !o) }
    window.addEventListener('customsfieldpro:search', handler)
    return () => window.removeEventListener('customsfieldpro:search', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60)
    else { setQuery(''); setResults([]) }
  }, [open])

  // Escape to close
  useEffect(() => {
    function handler() { setOpen(false) }
    window.addEventListener('customsfieldpro:escape', handler)
    return () => window.removeEventListener('customsfieldpro:escape', handler)
  }, [])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    const q = query.toLowerCase()
    const hits = []
    allClients.forEach(c => {
      if (c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q)) {
        hits.push({ type: 'client', icon: '👤', label: c.name, sub: c.email || c.phone || '', path: '/clients', id: c.id })
      }
    })
    allJobs.forEach(j => {
      if (j.id?.toLowerCase().includes(q) || j.clientName?.toLowerCase().includes(q) || j.title?.toLowerCase().includes(q) || j.type?.toLowerCase().includes(q)) {
        hits.push({ type: 'job', icon: '🔧', label: `${j.id} — ${j.clientName}`, sub: `${j.type} · ${j.status}`, path: '/jobs', id: j.id })
      }
    })
    allInvoices.forEach(inv => {
      if (inv.id?.toLowerCase().includes(q) || inv.clientName?.toLowerCase().includes(q)) {
        hits.push({ type: 'invoice', icon: '📄', label: `${inv.id} — ${inv.clientName}`, sub: `$${(inv.total||0).toFixed(2)} · ${inv.status}`, path: '/invoices', id: inv.id })
      }
    })
    setResults(hits.slice(0, 8))
  }, [query, allClients, allJobs, allInvoices])

  function select(r) {
    setOpen(false)
    navigate(r.path)
  }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9998, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80 }}
      onClick={e => e.target === e.currentTarget && setOpen(false)}>
      <div style={{ width: '100%', maxWidth: 560, background: '#fff', borderRadius: 14, boxShadow: '0 20px 60px rgba(0,0,0,0.22)', overflow: 'hidden' }}>
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderBottom: results.length ? '1px solid #f0f1f3' : 'none' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Escape' && setOpen(false)}
            placeholder="Search clients, jobs, invoices…"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: '#1a1d23', background: 'transparent' }}
          />
          <span style={{ fontSize: 11, color: '#9ca3af', background: '#f3f4f6', padding: '2px 7px', borderRadius: 5, flexShrink: 0 }}>Esc</span>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {results.map((r, i) => (
              <button key={i} onClick={() => select(r)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', background: 'none', border: 'none', borderBottom: '1px solid #f8f9fa', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{r.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1d23', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>{r.sub}</div>
                </div>
                <span style={{ fontSize: 11, color: '#c4c9d4', background: '#f3f4f6', padding: '2px 7px', borderRadius: 5, flexShrink: 0, textTransform: 'capitalize' }}>{r.type}</span>
              </button>
            ))}
          </div>
        )}

        {query && !results.length && (
          <div style={{ padding: '24px 18px', textAlign: 'center', color: '#9ca3af', fontSize: 13.5 }}>No results for "{query}"</div>
        )}

        {/* Footer shortcuts */}
        <div style={{ padding: '10px 18px', background: '#f8f9fa', display: 'flex', gap: 16, borderTop: '1px solid #f0f1f3' }}>
          {[['Ctrl+N', 'New Job'], ['Ctrl+I', 'New Invoice'], ['Ctrl+K', 'Search']].map(([key, label]) => (
            <span key={key} style={{ fontSize: 11.5, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 4 }}>
              <kbd style={{ background: '#fff', border: '1px solid #e8e9ec', borderRadius: 4, padding: '1px 5px', fontSize: 10.5, fontFamily: 'monospace', color: '#6b7280' }}>{key}</kbd>
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
