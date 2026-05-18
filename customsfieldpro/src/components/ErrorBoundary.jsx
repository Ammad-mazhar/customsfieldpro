import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { hasError: false, error: null, showDetails: false }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const { error, showDetails } = this.state
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400, padding: 32 }}>
        <div style={{ background: '#fff', border: '1px solid #fee2e2', borderRadius: 14, padding: '32px 36px', maxWidth: 520, width: '100%', boxShadow: '0 4px 24px rgba(220,38,38,0.08)' }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a1d23', margin: '0 0 8px' }}>Something went wrong</h2>
          <p style={{ fontSize: 13.5, color: '#6b7280', margin: '0 0 24px', lineHeight: 1.6 }}>
            This page encountered an unexpected error. Your data is safe — try reloading to continue.
          </p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <button
              onClick={() => window.location.reload()}
              style={{ height: 38, padding: '0 18px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
              Reload Page
            </button>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{ height: 38, padding: '0 18px', background: '#f3f4f6', color: '#374151', border: '1px solid #e8e9ec', borderRadius: 8, fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}>
              Try Again
            </button>
          </div>
          <button
            onClick={() => this.setState(s => ({ showDetails: !s.showDetails }))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, color: '#9ca3af', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: showDetails ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
            {showDetails ? 'Hide' : 'Show'} error details
          </button>
          {showDetails && (
            <pre style={{ marginTop: 10, padding: '10px 14px', background: '#fef2f2', borderRadius: 8, fontSize: 11.5, color: '#7f1d1d', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6 }}>
              {error?.message || String(error)}
              {'\n\n'}
              {error?.stack?.split('\n').slice(1, 5).join('\n')}
            </pre>
          )}
        </div>
      </div>
    )
  }
}
