// FilterDropdown.jsx — Single unified filter button with grouped options panel
import { useState, useEffect, useRef } from 'react'

const GROUP_COLORS = {
  Status:   '#2563eb',
  Priority: '#d97706',
  Type:     '#7c3aed',
  default:  '#6b7280',
}

// Dot colors for priority options
const PRIORITY_DOT = {
  Urgent:  '#dc2626',
  High:    '#ea580c',
  Normal:  '#2563eb',
  Low:     '#9ca3af',
  Open:    '#16a34a',
  Converted:'#7c3aed',
}

export default function FilterDropdown({ groups, values, onChange, onReset }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Count active (non-"All") filters
  const activeCount = Object.values(values).filter(v => v && v !== 'All').length

  // Build summary label for button
  const activeParts = groups
    .map(g => values[g.key] && values[g.key] !== 'All' ? values[g.key] : null)
    .filter(Boolean)

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          height: 36, padding: '0 14px',
          display: 'flex', alignItems: 'center', gap: 7,
          border: `1px solid ${open || activeCount > 0 ? '#2563eb' : '#e8e9ec'}`,
          borderRadius: 8,
          background: open || activeCount > 0 ? '#eff6ff' : '#fff',
          color: activeCount > 0 ? '#2563eb' : '#374151',
          fontSize: 13.5, fontWeight: activeCount > 0 ? 600 : 500,
          cursor: 'pointer', whiteSpace: 'nowrap',
          transition: 'all 0.15s',
        }}>
        {/* Funnel icon */}
        <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
        </svg>

        {activeParts.length > 0 ? activeParts.join(', ') : 'Filter'}

        {/* Active count badge */}
        {activeCount > 0 && (
          <span style={{ background: '#2563eb', color: '#fff', fontSize: 10.5, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>
            {activeCount}
          </span>
        )}

        {/* Chevron */}
        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', opacity: 0.5 }}>
          <polyline points="6 9 12 15 18 9" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 999,
          background: '#fff', border: '1px solid #e8e9ec', borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.13)',
          padding: '14px 16px', minWidth: 280,
          animation: 'filterFadeIn 0.15s ease',
        }}>
          <style>{`@keyframes filterFadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}`}</style>

          {groups.map((group, gi) => {
            const groupColor = GROUP_COLORS[group.label] || GROUP_COLORS.default
            const selectedVal = values[group.key] || 'All'
            return (
              <div key={group.key} style={{ marginBottom: gi < groups.length - 1 ? 14 : 0 }}>
                {/* Group label */}
                <div style={{ fontSize: 10.5, fontWeight: 700, color: groupColor, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                  {group.label}
                </div>
                {/* Option pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {group.options.map(opt => {
                    const isActive = selectedVal === opt.value
                    const dot = PRIORITY_DOT[opt.value]
                    return (
                      <button
                        key={opt.value}
                        onClick={() => { onChange(group.key, opt.value); if (groups.length === 1) setOpen(false) }}
                        style={{
                          height: 28, padding: '0 11px',
                          border: `1px solid ${isActive ? groupColor : '#e8e9ec'}`,
                          borderRadius: 20,
                          background: isActive ? groupColor + '15' : '#f9fafb',
                          color: isActive ? groupColor : '#6b7280',
                          fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 5,
                          transition: 'all 0.12s',
                        }}>
                        {dot && opt.value !== 'All' && (
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot, flexShrink: 0 }} />
                        )}
                        {opt.label || opt.value}
                        {isActive && opt.value !== 'All' && (
                          <span style={{ fontSize: 12, lineHeight: 1, opacity: 0.7 }}>✓</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Divider + reset */}
          {activeCount > 0 && (
            <div style={{ borderTop: '1px solid #f0f1f3', marginTop: 14, paddingTop: 10 }}>
              <button onClick={() => { onReset(); setOpen(false) }}
                style={{ height: 30, padding: '0 12px', border: '1px solid #fecaca', borderRadius: 7, background: '#fff', color: '#dc2626', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round"/><line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round"/></svg>
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
