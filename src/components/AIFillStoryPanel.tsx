/**
 * AIFillStoryPanel
 *
 * Slide-in panel that lets the user paste a product brief / meeting notes / doc
 * and have Claude fill out the entire BA Story structure (overview, user stories,
 * requirements, process flows, wireframe descriptions, RTM, RAID, notes).
 */

import { useState, useRef } from 'react'
import { X, Sparkles, Loader2, AlertTriangle, Paperclip, FileText, Image, File, ChevronDown, Lightbulb } from 'lucide-react'
import { apiUpload, ApiError } from '@/lib/api'
import type {
  RaciRole, UserStoryPriority, UserStoryStatus, RequirementType, MoscowPriority,
  RaidType, RaidImpact, RaidStatus, RtmStatus,
} from '@/lib/stories'

export type AIStoryFillResult = {
  title: string
  summary: string
  businessCase: string
  objectives: string[]
  scopeIn: string[]
  scopeOut: string[]
  stakeholders: { name: string; role: string; raci: RaciRole }[]
  userStories: {
    asA: string
    iWant: string
    soThat: string
    priority: UserStoryPriority
    status: UserStoryStatus
    criteria: { given: string; when: string; then: string }[]
  }[]
  requirements: {
    code: string
    type: RequirementType
    description: string
    priority: MoscowPriority
  }[]
  processFlows: {
    name: string
    description: string
    steps: { actor: string; action: string }[]
  }[]
  wireframes: { name: string; notes: string }[]
  rtm: {
    requirementCode: string
    userStoryIndex: number
    testCaseRef: string
    status: RtmStatus
  }[]
  raid: {
    type: RaidType
    description: string
    impact: RaidImpact
    owner: string
    status: RaidStatus
  }[]
  notes: string
}

type Props = {
  onFill: (result: AIStoryFillResult) => void
  onClose: () => void
  onLoading?: (loading: boolean) => void
}

const MAX_CHARS = 20_000
const ACCEPT_EXTENSIONS = '.pdf,.docx,.txt,.md,.csv,.jpg,.jpeg,.png,.webp'

const EXAMPLES: Array<{ title: string; blurb: string; prompt: string }> = [
  {
    title: 'Self-service password reset',
    blurb: 'Small internal tool — reduces support ticket load',
    prompt: `We need a self-service password reset flow for our customer portal. Current support tickets show ~200 password-reset requests per month, eating roughly 15 hours of agent time.

Users should be able to request a reset by entering their email, receive a time-limited link, and set a new password. Security team requires: reset link expires after 15 minutes, old password invalidated immediately on reset, and all reset events audit-logged.

Admins need a dashboard to see reset events (user, timestamp, IP address) for the last 90 days. Out of scope: SSO integration, SMS-based reset, and password policy changes.

Stakeholders: Maria (Product), Dan (Security lead), Priya (Customer Support manager), Alex (Engineering).`,
  },
  {
    title: 'Multi-tenant billing export',
    blurb: 'Compliance-driven — finance + legal stakeholders',
    prompt: `Finance needs to export monthly billing data per tenant to their accounting system (NetSuite). Today this is a manual CSV pull by a data analyst — it takes 2 days at month-end and has caused three reconciliation errors in the past year.

We want a scheduled job that runs on the 1st of each month, generates a per-tenant CSV with columns (tenant_id, invoice_id, line_item, amount, currency, tax, period_start, period_end), and uploads it to a designated SFTP. Finance users should be able to re-trigger an export for a given tenant/month from an admin UI.

Constraints: SOC 2 requires audit logs for every export, PII must be excluded from line_item descriptions, and the SFTP credentials live in AWS Secrets Manager. Out of scope: real-time streaming, tenant-facing export UI.

Stakeholders: CFO (accountable), Finance Ops lead (responsible), Security/Compliance (consulted), Eng Platform team (responsible).`,
  },
  {
    title: 'Mobile onboarding redesign',
    blurb: 'User-facing — growth metrics drive scope',
    prompt: `Growth team wants to redesign the mobile app onboarding. Current funnel: 62% of new installs complete signup, but only 28% complete the first "aha moment" action (connecting a bank account) within 7 days. Target: lift 7-day connection rate to 45%.

New flow should: let users skip bank connection and explore the app first, progressively prompt for connection at 3 trigger points (after adding a goal, after viewing dashboard twice, on day 3 via push), and support Plaid OAuth for top 20 US banks.

Wireframes exist in Figma for the new welcome carousel, goal-setting screen, and deferred-connection prompt. A/B test must run for 4 weeks against the control funnel before rolling out.

Known risks: Plaid API rate limits during peak install hours, App Store review delay on the new push copy, and potential confusion from users who skip connection then hit a paywall.

Stakeholders: Head of Growth (accountable), Mobile PM (responsible), Design lead (responsible), Data Science (consulted for A/B test design), Compliance (consulted — Plaid terms).`,
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

export function AIFillStoryPanel({ onFill, onClose, onLoading }: Props) {
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
      for (const file of files) formData.append('files', file)

      const result = await apiUpload<AIStoryFillResult & { aiMessage?: string }>(
        '/ai/fill-story',
        formData
      )

      if ((result as any).aiMessage) {
        setShowNeedsDetail(true)
        return
      }
      console.log('AI story result:', result)
      onFill(result)
      onClose()
    } catch (err: unknown) {
      console.error('AI fill-story error:', err)
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
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
        }}
      />

      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 51,
        width: '460px', maxWidth: '95vw',
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
              <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>AI BA Story Generator</div>
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
            Paste a product brief, meeting notes, email thread, or existing spec — or upload a document.
            Claude will generate the full BA artifact: business case, stakeholders, user stories with
            acceptance criteria, requirements (FR/NFR), process flows, wireframe descriptions, RTM, and
            a RAID log.
          </p>

          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--app-text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
            Brief / Notes / Requirements
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Example:\n\nWe need a self-service password reset flow. Current support tickets show ~200 password-reset requests per month, eating 15 hours of agent time. Users should be able to reset via email link. Security team requires the reset link to expire after 15 minutes and the old password to be invalidated immediately on reset. Admins need a dashboard to see reset events.`}
            rows={12}
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
          <div style={{
            display: 'flex', justifyContent: 'flex-end', marginTop: '4px',
            fontSize: '0.72rem',
            color: overLimit ? '#dc2626' : prompt.length > MAX_CHARS * 0.9 ? '#ca8a04' : 'var(--app-text-secondary)',
          }}>
            {prompt.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
          </div>

          {/* File upload */}
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--app-text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Attachments
              </label>
              <span style={{ fontSize: '0.72rem', color: 'var(--app-text-secondary)' }}>{files.length}/5 files</span>
            </div>

            {files.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                {files.map((file, i) => (
                  <div key={`${file.name}-${i}`} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 10px', borderRadius: '8px',
                    background: 'var(--app-glass)',
                    border: '1px solid var(--app-glass-border)',
                    fontSize: '0.8rem',
                  }}>
                    <span style={{ color: 'var(--app-accent-color)', flexShrink: 0 }}>{fileIcon(file.type)}</span>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.name}
                    </span>
                    <span style={{ color: 'var(--app-text-secondary)', fontSize: '0.72rem', flexShrink: 0 }}>{formatSize(file.size)}</span>
                    <button
                      onClick={() => removeFile(i)}
                      disabled={loading}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--app-text-secondary)', padding: 2, flexShrink: 0 }}
                      aria-label={`Remove ${file.name}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

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
                <p style={{ margin: '0 0 8px', fontWeight: 600 }}>The AI couldn't generate a BA story from your input.</p>
                <p style={{ margin: '0 0 10px', color: 'var(--app-text-secondary)' }}>
                  Add more context. Try including:
                </p>
                <ul style={{ margin: 0, paddingLeft: '18px', color: 'var(--app-text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <li>What problem are we solving and for whom?</li>
                  <li>Who are the key stakeholders or user roles?</li>
                  <li>Any known constraints (compliance, integrations, deadlines)?</li>
                  <li>What's explicitly out of scope?</li>
                </ul>
              </div>
            </div>
          )}

          <div style={{
            marginTop: '16px', padding: '12px 14px', borderRadius: '8px',
            background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)',
          }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--app-text-secondary)', margin: 0, lineHeight: 1.6 }}>
              <strong>Merge behavior:</strong> scalar fields (title, summary, business case, notes) only fill
              if empty. Lists (user stories, requirements, stakeholders, flows, RAID, RTM, wireframes) are
              <strong> appended</strong> — your existing work is preserved.
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
              background: !canGenerate ? 'var(--app-glass)' : 'var(--app-btn-primary)',
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
              : <><Sparkles size={15} /> Generate BA Story</>
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
