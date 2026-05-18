import { useState, useRef, useEffect } from 'react'
import { isGoogleMapsConfigured } from '../lib/googleMaps'

const INP = {
  width: '100%', boxSizing: 'border-box', height: 38, border: '1px solid #e8e9ec',
  borderRadius: 7, padding: '0 12px', fontSize: 13.5, color: '#374151',
  outline: 'none', background: '#fff',
}

/**
 * AddressAutocomplete — Google Places-powered address field with structured fill.
 *
 * Props:
 *   value        string   — current street address value
 *   onChange     fn(fields) — called with { address, city, state, zip, lat, lng }
 *   placeholder  string
 *   style        object   — extra styles for the input
 *   error        bool     — red border when true
 */
export default function AddressAutocomplete({ value, onChange, placeholder = 'Start typing an address…', style = {}, error = false }) {
  const [inputVal, setInputVal] = useState(value || '')
  const [suggestions, setSuggestions] = useState([])
  const [open, setOpen] = useState(false)
  const inputRef = useRef(null)
  const sessionToken = useRef(null)
  const configured = isGoogleMapsConfigured()

  // keep controlled value in sync
  useEffect(() => { setInputVal(value || '') }, [value])

  function getAutocompleteService() {
    return window.google?.maps?.places ? new window.google.maps.places.AutocompleteService() : null
  }
  function getPlacesService() {
    const div = document.createElement('div')
    return window.google?.maps?.places ? new window.google.maps.places.PlacesService(div) : null
  }
  function getSessionToken() {
    if (!sessionToken.current && window.google?.maps?.places) {
      sessionToken.current = new window.google.maps.places.AutocompleteSessionToken()
    }
    return sessionToken.current
  }

  function handleInput(e) {
    const q = e.target.value
    setInputVal(q)
    // notify parent that the raw address string changed (city/state/zip stay unchanged)
    onChange({ address: q })

    if (!configured || !q || q.length < 3) { setSuggestions([]); setOpen(false); return }

    const svc = getAutocompleteService()
    if (!svc) return

    svc.getPlacePredictions(
      {
        input: q,
        sessionToken: getSessionToken(),
        componentRestrictions: { country: 'us' },
        types: ['address'],
      },
      (preds, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && preds?.length) {
          setSuggestions(preds)
          setOpen(true)
        } else {
          setSuggestions([])
          setOpen(false)
        }
      }
    )
  }

  function handleSelect(pred) {
    setOpen(false)
    setSuggestions([])
    sessionToken.current = null // consume the session token

    const svc = getPlacesService()
    if (!svc) return

    svc.getDetails(
      { placeId: pred.place_id, fields: ['address_components', 'geometry', 'formatted_address'] },
      (place, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place) return

        let streetNumber = '', route = '', city = '', state = '', zip = '', lat = null, lng = null

        place.address_components.forEach(comp => {
          const types = comp.types
          if (types.includes('street_number'))                        streetNumber = comp.long_name
          if (types.includes('route'))                               route        = comp.long_name
          if (types.includes('locality'))                            city         = comp.long_name
          if (types.includes('administrative_area_level_1'))         state        = comp.short_name
          if (types.includes('postal_code'))                         zip          = comp.long_name
        })

        if (place.geometry?.location) {
          lat = place.geometry.location.lat()
          lng = place.geometry.location.lng()
        }

        const address = [streetNumber, route].filter(Boolean).join(' ')
        setInputVal(address)
        onChange({ address, city, state, zip, lat, lng })
      }
    )
  }

  function handleBlur() {
    // Small delay so click on suggestion registers before blur hides the list
    setTimeout(() => setOpen(false), 150)
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        value={inputVal}
        onChange={handleInput}
        onBlur={handleBlur}
        onFocus={() => suggestions.length && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        style={{ ...INP, borderColor: error ? '#dc2626' : '#e8e9ec', ...style }}
      />
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
          background: '#fff', border: '1px solid #e8e9ec', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.10)', marginTop: 2, overflow: 'hidden',
        }}>
          {suggestions.map((pred, i) => {
            const main = pred.structured_formatting?.main_text || pred.description
            const secondary = pred.structured_formatting?.secondary_text || ''
            return (
              <div
                key={pred.place_id}
                onMouseDown={() => handleSelect(pred)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', cursor: 'pointer',
                  borderBottom: i < suggestions.length - 1 ? '1px solid #f0f1f3' : 'none',
                  background: '#fff',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <div>
                  <div style={{ fontSize: 13.5, color: '#1a1d23', fontWeight: 500 }}>{main}</div>
                  {secondary && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>{secondary}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
