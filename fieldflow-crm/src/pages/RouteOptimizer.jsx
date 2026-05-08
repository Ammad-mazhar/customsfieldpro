import { useState, useEffect, useCallback } from 'react'
import { GoogleMap, DirectionsRenderer, Marker } from '@react-google-maps/api'
import { getJobs, getSettings } from '../data/store'
import { optimizeRoute } from '../utils/routeOptimizer'
import { isGoogleMapsConfigured } from '../lib/googleMaps'

const TODAY = new Date().toISOString().slice(0, 10)

const MAP_STYLE = { width: '100%', height: '100%' }
const MAP_OPTIONS = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function kmToMiles(km) { return Math.round(km * 0.621371 * 10) / 10 }

function TechBadge({ color, name }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color || '#2563eb', flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: '#374151' }}>{name}</span>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RouteOptimizer() {
  const settings     = getSettings()
  const allJobs      = getJobs()
  const techs        = settings.technicians || []
  const company      = settings.company || {}

  // ── State ─────────────────────────────────────────────────────────────────
  const [date,           setDate]           = useState(TODAY)
  const [selectedTech,   setSelectedTech]   = useState('all')
  const [optimizing,     setOptimizing]     = useState(false)
  const [result,         setResult]         = useState(null)   // { jobs, method, directionsResult }
  const [error,          setError]          = useState('')
  const [mapCenter]                         = useState({ lat: 38.84, lng: -77.43 }) // default NOVA

  const configured = isGoogleMapsConfigured()

  // Jobs for the selected date + tech
  const todaysJobs = allJobs.filter(j => {
    const dateMatch = j.startDate === date
    const techMatch = selectedTech === 'all' || j.techName === selectedTech || j.technicianId === selectedTech
    return dateMatch && techMatch && j.status !== 'Cancelled' && j.status !== 'Completed'
  })

  // Origin = company address or fallback coords
  const origin = {
    address: [company.address, company.city, company.state].filter(Boolean).join(', ') || '38.8404,-77.4291',
    lat: company.lat || 38.8404,
    lng: company.lng || -77.4291,
  }

  async function handleOptimize() {
    if (!todaysJobs.length) { setError('No jobs found for this date/tech selection.'); return }
    setOptimizing(true)
    setError('')
    setResult(null)
    try {
      const res = await optimizeRoute(origin, todaysJobs)
      setResult(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setOptimizing(false)
    }
  }

  // Total distance/duration from result
  const totalKm = result?.jobs?.reduce((s, j) => s + (j.distFromPrev || 0), 0) || 0
  const totalMin = result?.jobs?.reduce((s, j) => s + (j.durationFromPrev || 0), 0) || 0

  return (
    <div style={{ display: 'flex', gap: 0, height: 'calc(100vh - 120px)', minHeight: 500 }}>

      {/* ── Left panel ────────────────────────────────────────────────────── */}
      <div style={{ width: 360, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid #e8e9ec', background: '#fff', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #e8e9ec' }}>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: '#1a1d23', margin: '0 0 4px' }}>Route Optimizer</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Plan the most efficient daily route</p>
        </div>

        {/* Filters */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f1f3', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={LB}>Date</label>
            <input type="date" value={date} onChange={e => { setDate(e.target.value); setResult(null) }} style={INP} />
          </div>
          <div>
            <label style={LB}>Technician</label>
            <select value={selectedTech} onChange={e => { setSelectedTech(e.target.value); setResult(null) }} style={SEL}>
              <option value="all">All Technicians</option>
              {techs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12.5, color: '#6b7280' }}>{todaysJobs.length} job{todaysJobs.length !== 1 ? 's' : ''} found</span>
            <button
              onClick={handleOptimize}
              disabled={optimizing || !todaysJobs.length}
              style={{
                height: 36, padding: '0 16px', background: optimizing || !todaysJobs.length ? '#f3f4f6' : '#2563eb',
                color: optimizing || !todaysJobs.length ? '#9ca3af' : '#fff', border: 'none', borderRadius: 8,
                fontSize: 13, fontWeight: 600, cursor: optimizing || !todaysJobs.length ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {optimizing
                ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Optimizing…</>
                : 'Optimize Route'
              }
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ margin: '12px 20px 0', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
            {error}
          </div>
        )}

        {/* Summary */}
        {result && (
          <div style={{ padding: '14px 20px', background: '#f8faff', borderBottom: '1px solid #e8e9ec', display: 'flex', gap: 16 }}>
            <div>
              <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase' }}>Distance</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: 0 }}>{kmToMiles(totalKm)} mi</p>
            </div>
            {totalMin > 0 && (
              <div>
                <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase' }}>Drive Time</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: 0 }}>
                  {totalMin >= 60 ? `${Math.floor(totalMin / 60)}h ${Math.round(totalMin % 60)}m` : `${Math.round(totalMin)}m`}
                </p>
              </div>
            )}
            <div>
              <p style={{ fontSize: 11.5, color: '#9ca3af', margin: '0 0 2px', fontWeight: 600, textTransform: 'uppercase' }}>Method</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: result.method === 'google' ? '#16a34a' : '#d97706', margin: 0, textTransform: 'capitalize' }}>{result.method}</p>
            </div>
          </div>
        )}

        {/* Job list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {/* Origin */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 8, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
              <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#2563eb', border: '3px solid #fff', boxShadow: '0 0 0 2px #2563eb', flexShrink: 0 }} />
              <div style={{ width: 2, height: 28, background: '#e8e9ec', marginTop: 3 }} />
            </div>
            <div style={{ paddingBottom: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', margin: '0 0 1px', textTransform: 'uppercase' }}>Start — Office</p>
              <p style={{ fontSize: 12.5, color: '#9ca3af', margin: 0 }}>{origin.address || 'Company address not set'}</p>
            </div>
          </div>

          {/* Optimized jobs */}
          {(result ? result.jobs : todaysJobs).map((job, i) => {
            const isLast = i === (result ? result.jobs : todaysJobs).length - 1
            const tech = techs.find(t => t.id === job.technicianId || t.name === job.techName)
            return (
              <div key={job.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 3 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: tech?.color || '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#fff' }}>{i + 1}</span>
                  </div>
                  {!isLast && <div style={{ width: 2, flex: 1, background: '#e8e9ec', marginTop: 3, minHeight: 24 }} />}
                </div>
                <div style={{ paddingBottom: 16 }}>
                  {job.distText && (
                    <p style={{ fontSize: 11, color: '#2563eb', margin: '0 0 2px', fontWeight: 600 }}>
                      ↑ {job.distText} · {job.durationText}
                    </p>
                  )}
                  {job.distFromPrev && !job.distText && (
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 2px' }}>
                      ~{kmToMiles(job.distFromPrev)} mi
                    </p>
                  )}
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1d23', margin: '0 0 2px' }}>{job.clientName}</p>
                  <p style={{ fontSize: 12.5, color: '#6b7280', margin: '0 0 3px' }}>{job.title}</p>
                  {job.clientAddress && <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 3px' }}>{job.clientAddress}</p>}
                  {tech && <TechBadge color={tech.color} name={tech.name} />}
                </div>
              </div>
            )
          })}

          {!todaysJobs.length && !result && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
              <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 10px', display: 'block' }}><path d="M3 12h3l3-9 6 18 3-9h3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <p style={{ fontSize: 13.5, margin: 0 }}>No jobs for this date</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Right panel — Map ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', background: '#f8f9fa' }}>
        {configured ? (
          <GoogleMap
            mapContainerStyle={MAP_STYLE}
            center={mapCenter}
            zoom={11}
            options={MAP_OPTIONS}
          >
            {/* Origin marker */}
            <Marker
              position={{ lat: origin.lat, lng: origin.lng }}
              label={{ text: 'S', color: '#fff', fontWeight: 'bold', fontSize: '13px' }}
              title="Start — Office"
            />

            {/* Directions */}
            {result?.directionsResult && (
              <DirectionsRenderer
                directions={result.directionsResult}
                options={{ suppressMarkers: false, polylineOptions: { strokeColor: '#2563eb', strokeWeight: 4 } }}
              />
            )}

            {/* Fallback markers when no directions */}
            {result && !result.directionsResult && result.jobs.map((job, i) => {
              if (!job.lat || !job.lng) return null
              return (
                <Marker
                  key={job.id}
                  position={{ lat: job.lat, lng: job.lng }}
                  label={{ text: String(i + 1), color: '#fff', fontWeight: 'bold', fontSize: '12px' }}
                  title={`${i + 1}. ${job.clientName}`}
                />
              )
            })}
          </GoogleMap>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, padding: 40, textAlign: 'center' }}>
            <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="#d1d5db" strokeWidth="1.3"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#1a1d23', margin: '0 0 6px' }}>Google Maps not configured</p>
              <p style={{ fontSize: 13.5, color: '#9ca3af', margin: '0 0 16px', maxWidth: 340 }}>
                Add your Google Maps API key in <strong>Settings → Integrations</strong> to see the map and use Google-powered route optimization.
              </p>
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
                Route optimization still works without a key — it uses haversine distance calculation instead.
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const LB  = { display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }
const INP = { width: '100%', boxSizing: 'border-box', height: 38, border: '1px solid #e8e9ec', borderRadius: 7, padding: '0 12px', fontSize: 13.5, color: '#374151', outline: 'none', background: '#fff' }
const SEL = { width: '100%', height: 38, border: '1px solid #e8e9ec', borderRadius: 7, padding: '0 12px', fontSize: 13.5, color: '#374151', background: '#fff' }
