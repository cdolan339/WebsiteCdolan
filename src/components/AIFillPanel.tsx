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
import { X, Sparkles, Loader2 } from 'lucide-react'
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

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    setError(null)
    onLoading?.(true)
    try {
      const result = await api<AIFillResult>('/ai/fill-test-case', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      })
      console.log('AI result:', result)
      onFill(result)
      onClose()
    } catch (err: unknown) {
      console.error('AI fill error:', err)
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      setError(msg)
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
        background: 'linear-gradient(160deg, #130d2e 0%, #0f0c29 100%)',
        borderLeft: '1px solid rgba(106,17,203,0.4)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Poppins', sans-serif",
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '8px',
              background: 'linear-gradient(45deg, #6a11cb, #00d2ff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(106,17,203,0.4)',
            }}>
              <Sparkles size={16} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>AI Test Case Generator</div>
              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>Powered by Claude</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 4 }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)', marginBottom: '16px', lineHeight: 1.6 }}>
            Paste your business story, user story, or BA requirements below. Claude will generate
            the title, summary, objective, preconditions, and test cases for you.
          </p>

          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
            Requirements / Business Story
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Example:\n\nAs a user, I want to be able to log in using my email and password so that I can access my account securely. The system should lock the account after 5 failed attempts and show a clear error message.`}
            rows={12}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '10px',
              padding: '12px 14px',
              color: '#fff',
              fontSize: '0.83rem',
              lineHeight: 1.6,
              resize: 'vertical',
              outline: 'none',
              fontFamily: "'Poppins', sans-serif",
              boxSizing: 'border-box',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(106,17,203,0.6)' }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.12)' }}
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

          <div style={{
            marginTop: '16px', padding: '12px 14px', borderRadius: '8px',
            background: 'rgba(0,210,255,0.06)', border: '1px solid rgba(0,210,255,0.15)',
          }}>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.6 }}>
              <strong style={{ color: 'rgba(0,210,255,0.7)' }}>Note:</strong> AI will fill title, summary, objective,
              preconditions, tags, and test case steps. Notes, attachments, and project are left for you to manage.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', gap: '10px',
        }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1, padding: '10px', borderRadius: '8px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', fontWeight: 600,
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
                ? 'rgba(106,17,203,0.3)'
                : 'linear-gradient(45deg, #6a11cb, #00d2ff)',
              border: 'none',
              color: loading || !prompt.trim() ? 'rgba(255,255,255,0.4)' : '#fff',
              fontSize: '0.85rem', fontWeight: 600,
              cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: loading || !prompt.trim() ? 'none' : '0 2px 16px rgba(106,17,203,0.4)',
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
