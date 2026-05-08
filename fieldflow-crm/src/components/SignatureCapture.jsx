import { useRef, useState, useEffect } from 'react'
import SignatureCanvas from 'react-signature-canvas'

const PEN_COLORS = [
  { label: 'Black', value: '#1a1d23' },
  { label: 'Blue',  value: '#1d4ed8' },
  { label: 'Green', value: '#15803d' },
]

const PEN_SIZES = [
  { label: 'Thin',   value: 1.5 },
  { label: 'Medium', value: 2.5 },
  { label: 'Thick',  value: 4 },
]

export default function SignatureCapture({
  title = 'Signature',
  subtitle = 'Sign with finger or mouse',
  required = false,
  onSign,
  onClear,
  existingSignature = '',
  readOnly = false,
  attempted = false,
}) {
  const sigRef           = useRef(null)
  const [empty, setEmpty]       = useState(!existingSignature)
  const [penColor, setPenColor] = useState('#1a1d23')
  const [penSize,  setPenSize]  = useState(2.5)
  const [history,  setHistory]  = useState([])

  useEffect(() => {
    if (existingSignature && sigRef.current) {
      sigRef.current.fromDataURL(existingSignature)
      setEmpty(false)
    }
  }, [existingSignature])

  function handleEnd() {
    if (!sigRef.current || sigRef.current.isEmpty()) return
    const url = sigRef.current.getTrimmedCanvas().toDataURL('image/png')
    const snap = sigRef.current.toData()
    setHistory(h => [...h, snap])
    setEmpty(false)
    onSign?.(url)
  }

  function handleClear() {
    sigRef.current?.clear()
    setEmpty(true)
    setHistory([])
    onClear?.()
    onSign?.(null)
  }

  function handleUndo() {
    if (history.length < 2) {
      handleClear()
      return
    }
    const prev = history.slice(0, -1)
    setHistory(prev)
    sigRef.current?.clear()
    sigRef.current?.fromData(prev[prev.length - 1])
    const url = sigRef.current.getTrimmedCanvas().toDataURL('image/png')
    onSign?.(url)
  }

  const sigOk    = !empty
  const showErr  = required && attempted && !sigOk
  const borderClr = showErr ? '#dc2626' : sigOk ? '#16a34a' : '#d1d5db'

  if (readOnly) {
    return (
      <div style={{ border: '1px solid #e8e9ec', borderRadius: 10, padding: '12px 16px' }}>
        {title && <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px' }}>{title}</p>}
        {existingSignature
          ? <img src={existingSignature} alt="Signature" style={{ maxHeight: 80, maxWidth: 240, border: '1px solid #e8e9ec', borderRadius: 6, background: '#fff', objectFit: 'contain', padding: 4 }} />
          : <p style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>No signature captured</p>
        }
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Label */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>
          {title} {required && <span style={{ color: '#dc2626' }}>*</span>}
          {subtitle && <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 400, marginLeft: 6 }}>{subtitle}</span>}
        </label>

        {/* Pen controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Pen color */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {PEN_COLORS.map(c => (
              <button
                key={c.value}
                title={c.label}
                onClick={() => setPenColor(c.value)}
                style={{
                  width: 18, height: 18, borderRadius: '50%', background: c.value,
                  border: penColor === c.value ? `2px solid ${c.value}` : '2px solid transparent',
                  outline: penColor === c.value ? `2px solid ${c.value}` : 'none',
                  outlineOffset: 1, cursor: 'pointer', padding: 0,
                }}
              />
            ))}
          </div>
          {/* Pen thickness */}
          <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
            {PEN_SIZES.map(s => (
              <button
                key={s.value}
                title={s.label}
                onClick={() => setPenSize(s.value)}
                style={{
                  width: 26, height: 22, borderRadius: 5, border: `1px solid ${penSize === s.value ? '#2563eb' : '#e8e9ec'}`,
                  background: penSize === s.value ? '#eff6ff' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                }}
              >
                <div style={{ width: s.value * 2.5, height: s.value * 2.5, borderRadius: '50%', background: '#374151' }} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div style={{
        position: 'relative',
        border: `2px solid ${borderClr}`,
        borderRadius: 10, background: '#fff', overflow: 'hidden', transition: 'border-color 0.2s',
      }}>
        <SignatureCanvas
          ref={sigRef}
          penColor={penColor}
          minWidth={penSize * 0.6}
          maxWidth={penSize}
          backgroundColor="rgba(255,255,255,1)"
          canvasProps={{
            style: { display: 'block', width: '100%', height: 180, cursor: 'crosshair' },
          }}
          onEnd={handleEnd}
        />
        {empty && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <span style={{ fontSize: 14, color: '#c4c9d4', fontStyle: 'italic' }}>Sign here…</span>
          </div>
        )}
        {/* Baseline */}
        <div style={{ position: 'absolute', bottom: 36, left: 16, right: 16, height: 1, background: '#e8e9ec', pointerEvents: 'none' }} />
      </div>

      {/* Footer controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          {sigOk
            ? <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 500 }}>✓ Signature captured</span>
            : showErr
              ? <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 500 }}>Signature is required</span>
              : <span style={{ fontSize: 12, color: '#9ca3af' }}>Draw your signature above</span>
          }
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            style={{ fontSize: 12, color: history.length === 0 ? '#d1d5db' : '#6b7280', background: 'none', border: '1px solid #e8e9ec', borderRadius: 6, padding: '4px 11px', cursor: history.length === 0 ? 'default' : 'pointer' }}
          >
            Undo
          </button>
          <button
            onClick={handleClear}
            style={{ fontSize: 12, color: '#6b7280', background: 'none', border: '1px solid #e8e9ec', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}
