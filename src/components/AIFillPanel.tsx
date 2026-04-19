/**
 * AIFillPanel
 *
 * A slide-in panel that lets the user paste a business story / BA requirements
 * or upload documents, and have Claude fill out the test case fields automatically.
 *
 * Props:
 *   onFill(result) — called with the AI-generated fields to merge into draft state
 *   onClose       — called when the panel should close
 */

import { useState, useRef } from 'react'
import { X, Sparkles, Loader2, AlertTriangle, Paperclip, FileText, Image, File, ChevronDown, Lightbulb } from 'lucide-react'
import { apiUpload, ApiError } from '@/lib/api'

export type ExtractedImage = {
  data: string      // base64
  contentType: string
  name: string
}

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
  extractedImages?: ExtractedImage[]
}

type Props = {
  onFill: (result: AIFillResult) => void
  onClose: () => void
  onLoading?: (loading: boolean) => void
}

const MAX_CHARS = 10_000

const ACCEPT_EXTENSIONS = '.pdf,.docx,.txt,.md,.csv,.jpg,.jpeg,.png,.webp'

const EXAMPLES: Array<{ title: string; blurb: string; prompt: string }> = [
  {
    title: 'Login with email + password',
    blurb: 'Auth flow — happy path, lockout, validation',
    prompt: `Feature: Users log in to our customer portal with email + password.

Happy path: user enters valid email + password, clicks Submit, lands on /dashboard. A session cookie is set and persists for 30 days unless the user clicks "Sign out".

Security: after 5 consecutive failed attempts in 15 minutes the account is locked for 30 minutes. The lockout message must not reveal whether the email exists. Rate-limit login attempts from the same IP to 20/min.

Validation: email must be a valid RFC-5322 address; password must be 8+ chars. Submit button disabled until both fields are non-empty. Show a clear inline error on 401 (invalid credentials) and a distinct message on 423 (locked).

Edge cases to cover: leading/trailing whitespace on email, Unicode email addresses, extremely long password (>1,000 chars), browser back after login should not expose the login form.`,
  },
  {
    title: 'Checkout — apply promo code',
    blurb: 'E-commerce — validation, stacking rules, edge cases',
    prompt: `Feature: At checkout, a shopper can enter a promo code to get a discount applied to their cart.

Happy path: shopper types code "SAVE10" in the promo field on /checkout, clicks Apply, sees the discount line item appear and the order total update. The Apply button turns into a Remove button.

Business rules: codes are case-insensitive. Only one promo can be active at a time — entering a second code replaces the first after confirmation. Promos cannot be combined with items already on sale (show an inline warning listing which items were excluded). Codes have an expiry date; expired codes show "This code has expired".

Validation: reject empty input, codes over 32 chars, and codes containing whitespace. Show a generic "Invalid code" for codes that don't exist (don't leak valid-but-exhausted codes).

Edge cases: applying a code, emptying the cart, then re-adding items — the code should stay applied if still valid. Promo applied on mobile (narrow viewport) renders without layout shift.`,
  },
  {
    title: 'File upload with virus scan',
    blurb: 'Document handling — size limits, scanning, errors',
    prompt: `Feature: Users upload supporting documents to a claim. Files are virus-scanned before being attached.

Happy path: user drags a PDF onto the dropzone on /claims/:id, sees a progress bar, then a green "Scanned — clean" badge next to the filename. The file appears in the attachments list and is downloadable.

Constraints: accepted types are PDF, JPG, PNG, DOCX. Max file size 20 MB. Max 10 files per claim. Reject everything else with a specific error — don't just say "failed".

Security: infected files are quarantined and the user sees "This file was blocked by our scanner". The file is not downloadable. An audit event is recorded.

Edge cases: uploading multiple files at once where one is infected — the clean ones still upload, only the infected one is blocked. Network drop mid-upload should show a retry button, not silently fail. Same filename uploaded twice gets a " (1)" suffix. Extremely fast double-click on Upload should not create duplicate entries.`,
  },
]

function fileIcon(mime: string) {
  if (mime.startsWith('image/')) return <Image size={14} />
  if (mime === 'application/pdf') return <FileText size={14} />
  return <File size={14} />
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AIFillPanel({ onFill, onClose, onLoading }: Props) {
  const [prompt, setPrompt] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showNeedsDetail, setShowNeedsDetail] = useState(false)
  const [examplesOpen, setExamplesOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const overLimit = prompt.length > MAX_CHARS
  const hasInput = prompt.trim().length > 0 || files.length > 0
  const canGenerate = hasInput && !overLimit && !loading

  const handleFiles = (incoming: FileList | null) => {
    if (!incoming) return
    const added = Array.from(incoming).slice(0, 5 - files.length)
    setFiles((prev) => [...prev, ...added].slice(0, 5))
    // Reset the input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleGenerate = async () => {
    if (!canGenerate) return
    setLoading(true)
    setError(null)
    setShowNeedsDetail(false)
    onLoading?.(true)
    try {
      const formData = new FormData()
      if (prompt.trim()) formData.append('prompt', prompt.trim())
      for (const file of files) {
        formData.append('files', file)
      }

      const result = await apiUpload<AIFillResult & { aiMessage?: string }>('/ai/fill-test-case', formData)

      if (result.aiMessage) {
        setShowNeedsDetail(true)
        return
      }
      console.log('AI result:', result)
      onFill(result)
      onClose()
    } catch (err: unknown) {
      console.error('AI fill error:', err)
      if (err instanceof ApiError && err.aiMessage) {
        setShowNeedsDetail(true)
      } else {
        const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
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
            Paste your business story, user story, or BA requirements below — or upload a document. Claude will generate
            the title, summary, objective, preconditions, and test cases for you.
          </p>

          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--app-text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
            Requirements / Business Story
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Example:\n\nAs a user, I want to be able to log in using my email and password so that I can access my account securely. The system should lock the account after 5 failed attempts and show a clear error message.`}
            rows={10}
            style={{
              width: '100%',
              background: 'var(--app-glass)',
              border: `1px solid ${overLimit ? 'rgba(220,38,38,0.5)' : 'var(--app-glass-border)'}`,
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
            onFocus={(e) => { if (!overLimit) e.target.style.borderColor = 'var(--app-input-focus-border)' }}
            onBlur={(e) => { if (!overLimit) e.target.style.borderColor = 'var(--app-glass-border)' }}
            disabled={loading}
          />
          {/* Character counter */}
          <div style={{
            display: 'flex', justifyContent: 'flex-end', marginTop: '4px',
            fontSize: '0.72rem',
            color: overLimit ? '#dc2626' : prompt.length > MAX_CHARS * 0.9 ? '#ca8a04' : 'var(--app-text-secondary)',
          }}>
            {prompt.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
          </div>

          {/* File upload area */}
          <div style={{ marginTop: '12px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '8px',
            }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--app-text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Attachments
              </label>
              <span style={{ fontSize: '0.72rem', color: 'var(--app-text-secondary)' }}>
                {files.length}/5 files
              </span>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                {files.map((file, i) => (
                  <div
                    key={`${file.name}-${i}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '8px 10px', borderRadius: '8px',
                      background: 'var(--app-glass)',
                      border: '1px solid var(--app-glass-border)',
                      fontSize: '0.8rem',
                    }}
                  >
                    <span style={{ color: 'var(--app-accent-color)', flexShrink: 0 }}>
                      {fileIcon(file.type)}
                    </span>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.name}
                    </span>
                    <span style={{ color: 'var(--app-text-secondary)', fontSize: '0.72rem', flexShrink: 0 }}>
                      {formatSize(file.size)}
                    </span>
                    <button
                      onClick={() => removeFile(i)}
                      disabled={loading}
                      style={{
                        background: 'transparent', border: 'none', cursor: 'pointer',
                        color: 'var(--app-text-secondary)', padding: 2, flexShrink: 0,
                      }}
                      aria-label={`Remove ${file.name}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload button */}
            {files.length < 5 && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px',
                  background: 'transparent',
                  border: '1px dashed var(--app-glass-border)',
                  color: 'var(--app-text-secondary)',
                  fontSize: '0.8rem', fontWeight: 500,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.borderColor = 'var(--app-accent-color)'
                    e.currentTarget.style.color = 'var(--app-accent-color)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--app-glass-border)'
                  e.currentTarget.style.color = 'var(--app-text-secondary)'
                }}
              >
                <Paperclip size={14} />
                Upload document
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_EXTENSIONS}
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              style={{ display: 'none' }}
            />

            <p style={{ fontSize: '0.7rem', color: 'var(--app-text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
              PDF, Word (.docx), text, markdown, CSV, or images (JPG, PNG, WebP). Max 20 MB per file.
            </p>
          </div>

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

          {/* Examples (collapsible) */}
          <div style={{
            marginTop: '12px', borderRadius: '8px', overflow: 'hidden',
            background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)',
          }}>
            <button
              onClick={() => setExamplesOpen((o) => !o)}
              style={{
                width: '100%', padding: '10px 14px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                color: 'var(--app-text)', fontFamily: 'inherit',
              }}
              aria-expanded={examplesOpen}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lightbulb size={14} style={{ color: 'var(--app-accent-color)' }} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Examples</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--app-text-secondary)', fontWeight: 400 }}>
                  (3) — click to use
                </span>
              </span>
              <ChevronDown
                size={16}
                style={{
                  color: 'var(--app-text-secondary)',
                  transition: 'transform 0.2s',
                  transform: examplesOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </button>

            {examplesOpen && (
              <div style={{
                padding: '4px 10px 10px',
                borderTop: '1px solid var(--app-glass-border)',
                display: 'flex', flexDirection: 'column', gap: '6px',
              }}>
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => { setPrompt(ex.prompt); setExamplesOpen(false); setError(null); setShowNeedsDetail(false) }}
                    disabled={loading}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px', borderRadius: '6px',
                      background: 'var(--app-bg)',
                      border: '1px solid var(--app-glass-border)',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      color: 'var(--app-text)', fontFamily: 'inherit',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={(e) => { if (!loading) e.currentTarget.style.borderColor = 'var(--app-accent-color)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--app-glass-border)' }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '2px' }}>{ex.title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--app-text-secondary)', lineHeight: 1.4 }}>
                      {ex.blurb}
                    </div>
                  </button>
                ))}
              </div>
            )}
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
            disabled={!canGenerate}
            style={{
              flex: 2, padding: '10px', borderRadius: '8px',
              background: !canGenerate
                ? 'var(--app-glass)'
                : 'var(--app-btn-primary)',
              border: 'none',
              color: !canGenerate ? 'var(--app-text-secondary)' : 'var(--app-btn-text)',
              fontSize: '0.85rem', fontWeight: 600,
              cursor: !canGenerate ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: !canGenerate ? 'none' : '0 2px 16px var(--app-btn-primary-shadow)',
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
