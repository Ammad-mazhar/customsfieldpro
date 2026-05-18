// CustomsFieldPro — Reusable photo upload with mandatory validation UI
import { useRef, useState } from 'react'

/**
 * Props:
 *  label           string
 *  required        boolean
 *  minPhotos       number (default 1)
 *  photos          string[]   (base64 array)
 *  onPhotosChange  fn(newPhotos)
 *  type            'before' | 'after' | 'diagnosis' | 'parts' | 'general'
 *  attempted       boolean   — show errors even if user hasn't tried submitting
 *  compact         boolean   — smaller layout
 */
export default function PhotoUploadRequired({
  label = 'Photos',
  required = true,
  minPhotos = 1,
  photos = [],
  onPhotosChange,
  type = 'general',
  attempted = false,
  compact = false,
}) {
  const inputRef      = useRef(null)
  const galleryRef    = useRef(null)
  const [drag, setDrag] = useState(false)

  const isSatisfied = photos.length >= minPhotos
  const showError   = required && attempted && !isSatisfied

  const ICON_COLOR = showError ? '#dc2626' : isSatisfied ? '#16a34a' : '#9ca3af'
  const BORDER     = showError
    ? '2px dashed #dc2626'
    : drag
      ? '2px dashed #2563eb'
      : isSatisfied
        ? '2px solid #16a34a'
        : '2px dashed #d1d5db'
  const BG = showError ? '#fef2f2' : drag ? '#eff6ff' : isSatisfied ? '#f0fdf4' : '#fafafa'

  function readFiles(files) {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = e => onPhotosChange([...photos, e.target.result])
      reader.readAsDataURL(file)
    })
  }

  function onDrop(e) {
    e.preventDefault(); setDrag(false)
    readFiles(e.dataTransfer.files)
  }

  function removePhoto(i) {
    onPhotosChange(photos.filter((_, idx) => idx !== i))
  }

  const counterText = isSatisfied
    ? `✅ ${photos.length} photo${photos.length !== 1 ? 's' : ''} added`
    : `${photos.length} of ${minPhotos} required`

  return (
    <div>
      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: 4 }}>
          📸 {label}
          {required && <span style={{ color: '#dc2626' }}>*</span>}
          {isSatisfied && <span style={{ color: '#16a34a', fontSize: 12 }}>✅</span>}
        </span>
        <span style={{
          fontSize: 11.5, fontWeight: 700, padding: '2px 9px', borderRadius: 20,
          background: isSatisfied ? '#f0fdf4' : showError ? '#fef2f2' : '#f3f4f6',
          color:      isSatisfied ? '#16a34a' : showError ? '#dc2626' : '#9ca3af',
        }}>
          {counterText}
        </span>
      </div>

      {/* Drop zone */}
      {photos.length === 0 ? (
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          style={{ border: BORDER, borderRadius: 10, padding: compact ? '14px 10px' : '20px 14px', textAlign: 'center', background: BG, transition: 'all 0.15s', marginBottom: 8 }}>
          {showError && (
            <div style={{ fontSize: 24, marginBottom: 6 }}>⚠️</div>
          )}
          <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke={ICON_COLOR} strokeWidth="1.5" style={{ marginBottom: 6 }}>
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          {showError && (
            <p style={{ fontSize: 13, fontWeight: 700, color: '#dc2626', margin: '0 0 8px' }}>PHOTO REQUIRED</p>
          )}
          <p style={{ fontSize: 12.5, color: showError ? '#dc2626' : '#9ca3af', margin: '0 0 12px', fontWeight: showError ? 600 : 400 }}>
            {showError ? 'This photo is required to continue' : 'Tap to take photo or upload'}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button"
              onClick={() => inputRef.current?.click()}
              style={{ height: 38, padding: '0 14px', background: showError ? '#dc2626' : '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              📷 Take Photo
            </button>
            <button type="button"
              onClick={() => galleryRef.current?.click()}
              style={{ height: 38, padding: '0 14px', background: '#fff', color: '#374151', border: '1px solid #e8e9ec', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              🖼️ Gallery
            </button>
          </div>
          <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple
            style={{ display: 'none' }} onChange={e => readFiles(e.target.files)} />
          <input ref={galleryRef} type="file" accept="image/*" multiple
            style={{ display: 'none' }} onChange={e => readFiles(e.target.files)} />
        </div>
      ) : (
        <div style={{ marginBottom: 8 }}>
          <div style={{
            border: isSatisfied ? '1.5px solid #bbf7d0' : '1.5px dashed #d1d5db',
            borderRadius: 10, padding: 10, background: isSatisfied ? '#f0fdf4' : '#fafafa',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 8 }}>
              {photos.map((src, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 7, overflow: 'hidden', border: '1px solid #e8e9ec' }}>
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button type="button" onClick={() => removePhoto(i)}
                    style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', color: '#fff', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
              ))}
              <button type="button"
                onClick={() => inputRef.current?.click()}
                style={{ aspectRatio: '1', border: '1.5px dashed #d1d5db', borderRadius: 7, background: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: '#9ca3af' }}>
                <span style={{ fontSize: 18 }}>+</span>
                <span style={{ fontSize: 10.5 }}>Add</span>
              </button>
            </div>
            <input ref={inputRef} type="file" accept="image/*" multiple
              style={{ display: 'none' }} onChange={e => readFiles(e.target.files)} />
          </div>
        </div>
      )}

      {/* Status line */}
      {required && (
        <p style={{
          fontSize: 11.5, margin: '4px 0 0',
          color: isSatisfied ? '#16a34a' : showError ? '#dc2626' : '#9ca3af',
          fontWeight: isSatisfied ? 600 : 400,
        }}>
          {isSatisfied
            ? `✅ ${photos.length} photo${photos.length !== 1 ? 's' : ''} — requirement satisfied`
            : showError
              ? `⚠️ ${photos.length}/${minPhotos} required photos added`
              : `${photos.length}/${minPhotos} required`
          }
        </p>
      )}
    </div>
  )
}
