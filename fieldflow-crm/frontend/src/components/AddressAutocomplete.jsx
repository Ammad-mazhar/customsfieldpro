import { useEffect, useRef, useState } from 'react'
import { loadGoogleMaps } from '../lib/googleMaps'

/**
 * Address autocomplete input backed by Google Places.
 * Falls back to a plain <input> if Google Maps is unavailable.
 *
 * Props:
 *   value      — controlled value (street address line)
 *   onChange   — called with new string value on every keystroke
 *   onSelect   — called with { address, city, state, zip } when a place is chosen
 *   placeholder, error, style — passed through to the <input>
 */
export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Start typing address…',
  error = false,
  style = {},
}) {
  const inputRef        = useRef(null)
  const autocompleteRef = useRef(null)
  const [googleReady, setGoogleReady] = useState(!!window.google?.maps?.places)

  // Load Google Maps SDK once on mount
  useEffect(() => {
    if (googleReady) return
    loadGoogleMaps().then(ok => setGoogleReady(ok))
  }, [])

  // Attach Places Autocomplete once SDK is ready
  useEffect(() => {
    if (!googleReady || !inputRef.current || autocompleteRef.current) return

    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
      fields: ['address_components', 'formatted_address'],
    })
    autocompleteRef.current = ac

    ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      if (!place.address_components) return

      const get      = type => place.address_components.find(c => c.types.includes(type))?.long_name  || ''
      const getShort = type => place.address_components.find(c => c.types.includes(type))?.short_name || ''

      const streetNumber = get('street_number')
      const streetName   = get('route')
      const address      = [streetNumber, streetName].filter(Boolean).join(' ')
      const city         = get('locality') || get('sublocality') || get('administrative_area_level_3')
      const state        = getShort('administrative_area_level_1')
      const zip          = get('postal_code')

      if (onChange) onChange(address || place.formatted_address || '')
      if (onSelect) onSelect({ address: address || place.formatted_address || '', city, state, zip })
    })

    return () => {
      if (window.google?.maps?.event && autocompleteRef.current) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current)
      }
      autocompleteRef.current = null
    }
  }, [googleReady])

  const baseStyle = {
    width: '100%',
    boxSizing: 'border-box',
    height: 38,
    border: `1px solid ${error ? '#dc2626' : '#e8e9ec'}`,
    borderRadius: 7,
    padding: '0 12px',
    fontSize: 13.5,
    color: '#374151',
    outline: 'none',
    background: '#fff',
    ...style,
  }

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={e => onChange && onChange(e.target.value)}
      placeholder={placeholder}
      style={baseStyle}
      autoComplete="off"
    />
  )
}
