/**
 * AIFillPanel
 *
 * A slide-in panel that lets the user paste a business story / BA requirements
 * and have Claude fill out the test case fields automatically.
 *
 * Props:
 *   onFill(result) — called with the AI-generated fields to merge into draft state
 *   onClose       — called when the panel should close
 */

import { useState } from 'react'
import { X, Sparkles, Loader2, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'

export type AIFillResult = {
  title: string
  summary: string
  objective: string
  preconditions: string[]
  tags: string[]
  testCases: {
    name: string
    priority: 'low' | 'medium' | 'high' | 'critical'
    steps: string[]
    expected: string
  }[]
}

type Props = {
  onFill: (result: AIFillResult) => void
  onClose: () => void
  onLoading?: (loading: boolean) => void
}

export function AIFillPanel({ onFill, onClose, onLoading }: Props) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNeedsDetail, setShowNeedsDetail] = useState(false)

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setError(null)
    setShowNeedsDetail(false)
    onLoading?.(true)
    try {
      const result = await api<AIFillResult & { aiMessage?: string }>('/ai/fill-test-case', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      })
      // If the backend sent an aiMessage field, the AI couldn't parse the input
      if (result.aiMessage) {
        setShowNeedsDetail(true)
        return
      }
      console.log('AI result:', result)
      onFill(result)
      onClose()
    } catch (err: unknown) {
      console.error('AI fill error:', err)
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      // Detect when the AI returned a conversational response instead of JSON
      // (backend error will be long or contain AI-like phrasing)
      if (msg.length > 100 || msg.includes('provide') || msg.includes('Please share') || msg.includes('requirement')) {
        setShowNeedsDetail(true)
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
      onLoading?.(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 51,
        width: '420px', maxWidth: '95vw',
        background: 'var(--app-panel-bg)',
        borderLeft: '1px solid var(--app-panel-border)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.3)',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        color: 'var(--app-text)',
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--app-glass-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '8px',
              background: 'var(--app-btn-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 12px var(--app-btn-primary-shadow)',
            }}>
              <Sparkles size={16} color="var(--app-btn-text)" />
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>AI Test Case Generator</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--app-text-secondary)' }}>Powered by Claude</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--app-text-secondary)', padding: 4 }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--app-text-secondary)', marginBottom: '16px', lineHeight: 1.6 }}>
            Paste your business story, user story, or BA requirements below. Claude will generate
            the title, summary, objective, preconditions, and test cases for you.
          </p>

          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--app-text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
            Requirements / Business Story
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Example:\n\nAs a user, I want to be able to log in using my email and password so that I can access my account securely. The system should lock the account after 5 failed attempts and show a clear error message.`}
            rows={12}
            style={{
              width: '100%',
              background: 'var(--app-glass)',
              border: '1px solid var(--app-glass-border)',
              borderRadius: '10px',
              padding: '12px 14px',
              color: 'var(--app-text)',
              fontSize: '0.83rem',
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
              fontFamily: "'Segoe UI', system-ui, sans-serif",
              boxSizing: 'border-box',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--app-input-focus-border)' }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--app-glass-border)' }}
            disabled={loading}
          />

          {error && (
            <div style={{
              marginTop: '12px', padding: '10px 14px', borderRadius: '8px',
              background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)',
              color: '#fca5a5', fontSize: '0.8rem', lineHeight: 1.5,
            }}>
              {error}
            </div>
          )}

          {/* Curated feedback — shown when the AI couldn't generate test cases */}
          {showNeedsDetail && (
            <div style={{
              marginTop: '12px', borderRadius: '10px', overflow: 'hidden',
              border: '1px solid rgba(202,138,4,0.3)',
              background: 'rgba(202,138,4,0.08)',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'rgba(202,138,4,0.12)',
                borderBottom: '1px solid rgba(202,138,4,0.2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={14} style={{ color: '#ca8a04' }} />
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--app-text)' }}>More Detail Needed</span>
                </div>
                <button
                  onClick={() => setShowNeedsDetail(false)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--app-text-secondary)', padding: 2 }}
                  aria-label="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>
              <div style={{ padding: '12px 14px', fontSize: '0.82rem', lineHeight: 1.7, color: 'var(--app-text)' }}>
                <p style={{ margin: '0 0 8px', fontWeight: 600 }}>The AI couldn't generate test cases from your input.</p>
                <p style={{ margin: '0 0 10px', color: 'var(--app-text-secondary)' }}>
                  Your prompt needs to describe a specific feature or requirement. Try including:
                </p>
                <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--app-text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>The feature or user flow being tested</li>
                  <li>Expected behaviors or acceptance criteria</li>
                  <li>Any edge cases or error scenarios</li>
                </ul>
              </div>
            </div>
          )}

          <div style={{
            marginTop: '16px', padding: '12px 14px', borderRadius: '8px',
            background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)',
          }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--app-text-secondary)', margin: 0, lineHeight: 1.6 }}>
              <strong>Note:</strong> AI will fill title, summary, objective,
              preconditions, tags, and test case steps. Notes, attachments, and project are left for you to manage.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--app-glass-border)',
          display: 'flex', gap: '10px',
        }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1, padding: '10px', borderRadius: '8px',
              background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)',
              color: 'var(--app-text-secondary)', fontSize: '0.85rem', fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            style={{
              flex: 2, padding: '10px', borderRadius: '8px',
              background: loading || !prompt.trim()
                ? 'var(--app-glass)'
                : 'var(--app-btn-primary)',
              border: 'none',
              color: loading || !prompt.trim() ? 'var(--app-text-secondary)' : 'var(--app-btn-text)',
              fontSize: '0.85rem', fontWeight: 600,
              cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: loading || !prompt.trim() ? 'none' : '0 2px 16px var(--app-btn-primary-shadow)',
              transition: 'opacity 0.15s',
            }}
          >
            {loading
              ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Generating…</>
              : <><Sparkles size={15} /> Generate Test Case</>
            }
          </button>
        </div>

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </>
  )
}
