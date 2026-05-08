import { useState, useEffect } from 'react'
import { getSettings } from '../data/store'
import { markReviewClicked } from '../utils/reviewRequests'
import { createNotification } from '../utils/notifications'

// ── Emoji feedback map ────────────────────────────────────────────────────────
const EMOJI = {
  1: { icon: '😞', text: "We're sorry to hear that" },
  2: { icon: '😕', text: "We'll work to improve" },
  3: { icon: '😐', text: "Thank you for your feedback" },
  4: { icon: '😊', text: "Great, glad you're happy!" },
  5: { icon: '🌟', text: "Excellent! Thank you!" },
}

// ── Star picker ───────────────────────────────────────────────────────────────
function Stars({ value, onChange, size = 42 }) {
  const [hover, setHover] = useState(0)
  const active = hover || value
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            fontSize: size, lineHeight: 1,
            color: n <= active ? '#f59e0b' : '#d1d5db',
            transform: n <= active ? 'scale(1.18)' : 'scale(1)',
            transition: 'color 0.1s, transform 0.12s',
            display: 'flex', alignItems: 'center',
          }}
          aria-label={`${n} star`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SatisfactionRating({ job, onSubmit, onSkip }) {
  const [overall,       setOverall]       = useState(0)
  const [techStar,      setTechStar]      = useState(0)
  const [feedback,      setFeedback]      = useState('')
  const [submitted,     setSubmitted]     = useState(false)
  const [submittedStar, setSubmittedStar] = useState(0)

  // Block background scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function handleSubmit() {
    if (!overall) return
    const rating = {
      overall,
      technician:  techStar || null,
      feedback:    feedback.trim(),
      submittedAt: Date.now(),
    }
    // Persist rating into the job record
    try {
      const raw  = localStorage.getItem('ff_jobs') || '[]'
      const jobs = JSON.parse(raw)
      const next = jobs.map(j => j.id === job.id ? { ...j, rating } : j)
      localStorage.setItem('ff_jobs', JSON.stringify(next))
    } catch { /* silent */ }

    // Admin notification for low ratings
    if (overall <= 2) {
      try {
        createNotification({
          type: 'warning',
          title: 'Low Rating Alert',
          message: `${job.clientName} gave a ${overall}★ rating on ${job.id}. Please follow up.`,
          entity: 'Jobs', entityId: job.id,
        })
      } catch {}
    }

    setSubmittedStar(overall)
    setSubmitted(true)
    setTimeout(() => onSubmit(rating), overall >= 4 ? 0 : 2200)
  }

  const emotion = overall ? EMOJI[overall] : null

  // ── Thank-you state ──────────────────────────────────────────────────────────
  if (submitted) {
    const reviewUrl = getSettings().reviews?.googleReviewUrl
    const isHigh = submittedStar >= 4
    const isLow  = submittedStar <= 2

    // High rating (4-5★): Google review prompt
    if (isHigh && reviewUrl) {
      return (
        <div style={OVERLAY}>
          <div style={MODAL}>
            <div style={{ textAlign: 'center', padding: '40px 30px 32px' }}>
              <div style={{ fontSize: 52, marginBottom: 10, lineHeight: 1 }}>🌟</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1a1d23', margin: '0 0 10px' }}>
                Thank you for the {submittedStar} stars!
              </h3>
              <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 22px', lineHeight: 1.6 }}>
                Would you mind sharing your experience on Google?<br />
                <strong>It only takes 30 seconds and helps us tremendously.</strong>
              </p>
              <a
                href={reviewUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => { try { markReviewClicked(job.clientId) } catch {} }}
                style={{
                  display: 'inline-block', background: '#2563eb', color: '#fff',
                  padding: '13px 28px', borderRadius: 9, fontSize: 15, fontWeight: 700,
                  textDecoration: 'none', marginBottom: 14,
                }}
              >
                ⭐ Leave a Google Review
              </a>
              <br />
              <button
                onClick={() => onSubmit({ overall: submittedStar })}
                style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 13, cursor: 'pointer', padding: '4px 12px' }}
              >
                No thanks
              </button>
            </div>
          </div>
        </div>
      )
    }

    // Low rating (1-2★): apology + manager follow-up
    if (isLow) {
      return (
        <div style={OVERLAY}>
          <div style={MODAL}>
            <div style={{ textAlign: 'center', padding: '52px 32px' }}>
              <div style={{ fontSize: 52, marginBottom: 14, lineHeight: 1 }}>😞</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#1a1d23', margin: '0 0 10px' }}>We're truly sorry</h3>
              <p style={{ fontSize: 14, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
                Your experience doesn't reflect our standards.<br />
                A manager will reach out to you shortly to make it right.
              </p>
            </div>
          </div>
        </div>
      )
    }

    // Neutral or no review URL — generic thank you
    return (
      <div style={OVERLAY}>
        <div style={MODAL}>
          <div style={{ textAlign: 'center', padding: '52px 32px' }}>
            <div style={{ fontSize: 60, marginBottom: 14, lineHeight: 1 }}>🙏</div>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: '#1a1d23', margin: '0 0 10px' }}>Thank You!</h3>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
              Your feedback helps us improve our service.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Rating form ──────────────────────────────────────────────────────────────
  return (
    <div style={OVERLAY}>
      <div style={MODAL}>
        {/* Header */}
        <div style={{ padding: '24px 24px 20px', textAlign: 'center', borderBottom: '1px solid #f0f1f3' }}>
          <div style={{ fontSize: 36, lineHeight: 1, marginBottom: 10 }}>⭐</div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: '#1a1d23', margin: '0 0 6px', lineHeight: 1.3 }}>
            How satisfied are you with today's service?
          </h2>
          <p style={{ fontSize: 12.5, color: '#9ca3af', margin: 0 }}>
            {job.id} · {job.clientName}
          </p>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* Overall stars */}
          <div style={{ textAlign: 'center' }}>
            <Stars value={overall} onChange={setOverall} size={46} />
            <div style={{ minHeight: 36, marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {emotion ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, animation: 'srFade 0.2s ease' }}>
                  <span style={{ fontSize: 26 }}>{emotion.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{emotion.text}</span>
                </div>
              ) : (
                <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>Tap a star to rate</p>
              )}
            </div>
          </div>

          {/* Technician rating */}
          <div style={{ background: '#f8f9fa', border: '1px solid #e8e9ec', borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 12px', textAlign: 'center' }}>
              How would you rate your technician{job.techName ? ` — ${job.techName}` : ''}?
            </p>
            <Stars value={techStar} onChange={setTechStar} size={36} />
          </div>

          {/* Written feedback */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>
              Tell us more{' '}
              <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span>
            </label>
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              rows={3}
              placeholder="Share your experience with us…"
              style={{
                width: '100%', boxSizing: 'border-box',
                border: '1px solid #e8e9ec', borderRadius: 8,
                padding: '10px 12px', fontSize: 13.5, color: '#374151',
                resize: 'vertical', outline: 'none', lineHeight: 1.6,
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <button
              onClick={handleSubmit}
              disabled={!overall}
              style={{
                width: '100%', height: 46,
                background: overall ? '#2563eb' : '#bfdbfe',
                color: '#fff', border: 'none', borderRadius: 9,
                fontSize: 14.5, fontWeight: 700,
                cursor: overall ? 'pointer' : 'not-allowed',
                transition: 'background 0.15s',
              }}
            >
              Submit Rating
            </button>
            <button
              onClick={onSkip}
              style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 13, cursor: 'pointer', padding: '4px 12px' }}
            >
              Skip
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes srIn   { from { opacity:0; transform:scale(0.95) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes srFade { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  )
}

const OVERLAY = {
  position: 'fixed', inset: 0, zIndex: 3000,
  background: 'rgba(10,15,30,0.55)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
}
const MODAL = {
  background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440,
  boxShadow: '0 24px 60px rgba(0,0,0,0.28)',
  animation: 'srIn 0.22s ease',
  overflow: 'hidden',
}
