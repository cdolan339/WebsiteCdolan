import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Calendar, Tag, X, Plus, Check, FolderOpen, ChevronDown, ChevronUp, Sparkles, Save } from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'
import {
  useCustomTestCase,
  updateCustomTestCase,
  createCustomTC,
  type CustomTestCase,
  type CustomTC,
} from '@/lib/customTestCases'
import {
  useTestStatus,
  useExpectedChecked,
  loadExpectedMap,
  type TestStatus,
} from '@/lib/useTestStatus'
import { useProjects, type Project } from '@/lib/projects'
import { getSession } from '@/lib/auth'
import { AIFillPanel, type AIFillResult } from '@/components/AIFillPanel'
import { uploadPreconditionImages, type PendingImage } from '@/components/PreconditionAttachments'
import { LoadingCurtain } from '@/components/LoadingCurtain'
import { Attachments } from '@/components/Attachments'
import { PreconditionAttachments } from '@/components/PreconditionAttachments'
import { AutoGrowTextarea } from '@/components/AutoGrowTextarea'

export const Route = createFileRoute('/test-cases/custom/$id')({
  component: CustomTestCaseDetail,
})

// ── Shared constants ──────────────────────────────────────────────────────────

const PRIORITY_OPTIONS = [
  { value: 'low'      as const, label: 'Low',      color: '#16a34a', bg: '', text: '', style: { background: 'rgba(22,163,74,0.15)',  color: '#16a34a', border: '1px solid rgba(22,163,74,0.3)'  } },
  { value: 'medium'   as const, label: 'Medium',   color: '#ca8a04', bg: '', text: '', style: { background: 'rgba(202,138,4,0.15)',  color: '#ca8a04', border: '1px solid rgba(202,138,4,0.3)'  } },
  { value: 'high'     as const, label: 'High',     color: '#ea580c', bg: '', text: '', style: { background: 'rgba(234,88,12,0.15)',  color: '#ea580c', border: '1px solid rgba(234,88,12,0.3)'  } },
  { value: 'critical' as const, label: 'Critical', color: '#dc2626', bg: '', text: '', style: { background: 'rgba(220,38,38,0.15)',  color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)'  } },
]

const STATUS_STYLES: { [K in TestStatus]: string } = {
  pass:    'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  fail:    'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  blocked: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
}

const STATUS_OPTIONS = [
  { value: 'pass'    as const, label: '✓ Pass',    color: '#16a34a' },
  { value: 'fail'    as const, label: '✕ Fail',    color: '#dc2626' },
  { value: 'pending' as const, label: '◷ Pending', color: '#ca8a04' },
  { value: 'blocked' as const, label: '⊘ Blocked', color: '#ea580c' },
]

const ALL_EXISTING_TAGS: string[] = []

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

// ── Shared small components ───────────────────────────────────────────────────

type DropdownProps = {
  label: string
  options: { value: string; label: string; color: string }[]
  current: string
  badgeClass: string
  badgeStyle?: React.CSSProperties
  onSelect: (v: string) => void
}

function Dropdown({ label, options, current, badgeClass, badgeStyle, onSelect }: DropdownProps) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold uppercase tracking-wide cursor-pointer select-none ${badgeClass}`}
        style={badgeStyle}
      >
        {label}
        <span style={{ fontSize: '10px', opacity: 0.7 }}>▼</span>
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50, minWidth: '140px', borderRadius: '8px', border: '1px solid rgba(120,120,120,0.3)', background: 'var(--card)', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onSelect(opt.value); setOpen(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '9px 14px', background: current === opt.value ? 'rgba(120,120,120,0.1)' : 'transparent', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: current === opt.value ? 600 : 400, color: opt.color, textAlign: 'left' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(120,120,120,0.1)' }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = current === opt.value ? 'rgba(120,120,120,0.1)' : 'transparent' }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: opt.color, flexShrink: 0 }} />
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Project picker ───────────────────────────────────────────────────────────

function ProjectPicker({ projectId, onChange, projects }: { projectId: number | null; onChange: (id: number | null) => void; projects: Project[] }) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const selected = projects.find((p) => p.id === projectId)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={wrapperRef} className="relative" style={{ display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-all cursor-pointer select-none"
        style={{
          background: selected ? 'var(--app-accent-bg)' : 'var(--app-glass)',
          border: '1px solid var(--app-glass-border)',
          color: selected ? 'var(--app-accent-color)' : 'var(--app-text-secondary)',
        }}
      >
        <FolderOpen size={13} style={{ opacity: 0.7 }} />
        <span className="truncate max-w-[180px]">{selected?.name ?? 'No Project'}</span>
        <ChevronDown size={12} className={`opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-full mt-2 z-50 w-64 rounded-xl overflow-hidden"
            style={{
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              background: 'var(--app-overlay)',
              border: '1px solid var(--app-overlay-border)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <button
              onClick={() => { onChange(null); setOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
              style={{
                background: projectId === null ? 'var(--app-accent-bg)' : 'transparent',
                color: projectId === null ? 'var(--app-accent-color)' : 'var(--app-text-secondary)',
                borderBottom: '1px solid var(--app-glass-border)',
                fontWeight: projectId === null ? 600 : 400,
              }}
              onMouseEnter={(e) => { if (projectId !== null) e.currentTarget.style.background = 'var(--app-glass)' }}
              onMouseLeave={(e) => { if (projectId !== null) e.currentTarget.style.background = 'transparent' }}
            >
              <FolderOpen size={14} style={{ opacity: 0.7 }} />
              No Project
            </button>
            <div className="max-h-48 overflow-y-auto">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { onChange(p.id); setOpen(false) }}
                  className="w-full flex items-center px-4 py-2.5 text-sm text-left transition-colors truncate"
                  style={{
                    background: projectId === p.id ? 'var(--app-accent-bg)' : 'transparent',
                    color: 'var(--app-accent-color)',
                    borderBottom: '1px solid var(--app-glass-border)',
                    fontWeight: projectId === p.id ? 600 : 400,
                  }}
                  onMouseEnter={(e) => { if (projectId !== p.id) e.currentTarget.style.background = 'var(--app-glass)' }}
                  onMouseLeave={(e) => { if (projectId !== p.id) e.currentTarget.style.background = projectId === p.id ? 'var(--app-accent-bg)' : 'transparent' }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Expected checkbox row — local pass marker per sub-TC
function ExpectedRow({ storageKey, text, onToggle }: { storageKey: string; text: string; onToggle: (v: boolean) => void }) {
  const { checked, setChecked } = useExpectedChecked(storageKey)
  const toggle = () => { const next = !checked; setChecked(next); onToggle(next) }

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', border: checked ? '1px solid rgba(22,163,74,0.5)' : '1px solid rgba(120,120,120,0.25)', background: checked ? 'rgba(22,163,74,0.15)' : 'transparent', transition: 'background 0.2s, border-color 0.2s' }}>
      <button
        onClick={toggle}
        aria-label="Mark as passed"
        style={{ flexShrink: 0, marginTop: '3px', width: '22px', height: '22px', minWidth: '22px', borderRadius: '5px', border: checked ? '2px solid #16a34a' : '2px solid #6b7280', background: checked ? '#16a34a' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: checked ? '#fff' : 'transparent', padding: '0', transition: 'all 0.15s', outline: 'none', boxSizing: 'border-box' }}
      >
        {checked ? '✓' : ''}
      </button>
      <p style={{ margin: 0, color: checked ? 'var(--app-success)' : undefined, transition: 'color 0.2s', flex: 1 }}>
        <strong>Expected:</strong> {text}
      </p>
    </div>
  )
}

// ── Tag input ─────────────────────────────────────────────────────────────────

function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const suggestions = ALL_EXISTING_TAGS.filter(
    (t) => !tags.includes(t) && t.toLowerCase().includes(input.toLowerCase())
  )

  const add = (tag: string) => {
    const trimmed = tag.trim()
    if (!trimmed || tags.includes(trimmed)) return
    onChange([...tags, trimmed])
    setInput('')
    setOpen(false)
  }

  const remove = (tag: string) => onChange(tags.filter((t) => t !== tag))

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input) }
    else if (e.key === 'Backspace' && !input && tags.length > 0) remove(tags[tags.length - 1])
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-md border border-border bg-background focus-within:ring-1 focus-within:ring-ring">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
            {tag}
            <button type="button" onClick={() => remove(tag)} className="hover:text-destructive transition-colors"><X size={10} /></button>
          </span>
        ))}
        <input ref={inputRef} value={input} onChange={(e) => { setInput(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onKeyDown={handleKeyDown} placeholder={tags.length === 0 ? 'Add tags…' : ''} className="flex-1 min-w-[80px] text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground" />
      </div>
      {open && (input || suggestions.length > 0) && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[180px] max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
          {suggestions.length > 0
            ? suggestions.map((tag) => (
                <button key={tag} type="button" onMouseDown={() => add(tag)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors text-foreground">{tag}</button>
              ))
            : input && (
                <button type="button" onMouseDown={() => add(input)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors text-muted-foreground">Add "{input}"</button>
              )}
        </div>
      )}
    </div>
  )
}

// ── Sub-test case editor ─────────────────────────────────────────────────────

function SubTCEditor({ tc, onChange, onRemove, index, id, parentTcId, onMoveUp, onMoveDown }: { tc: CustomTC; onChange: (tc: CustomTC) => void; onRemove: () => void; index: number; id?: string; parentTcId: string; onMoveUp?: () => void; onMoveDown?: () => void }) {
  const patch = (fields: Partial<CustomTC>) => onChange({ ...tc, ...fields })

  const addStep = () => patch({ steps: [...tc.steps, ''] })
  const updateStep = (i: number, v: string) => { const next = [...tc.steps]; next[i] = v; patch({ steps: next }) }
  const removeStep = (i: number) => patch({ steps: tc.steps.filter((_, idx) => idx !== i) })

  return (
    <div id={id} className="rounded-lg border border-border bg-card p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span style={{
          fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          background: 'var(--app-accent-gradient)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          flexShrink: 0,
        }}>
          Test Case {String(index + 1).padStart(2, '0')}
        </span>
        <div style={{ flex: 1, height: '1px', background: 'var(--app-glass-border)' }} />
        {(onMoveUp || onMoveDown) && (
          <div style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
            <button
              onClick={onMoveUp}
              disabled={!onMoveUp}
              style={{ background: 'transparent', border: 'none', cursor: onMoveUp ? 'pointer' : 'default', color: onMoveUp ? 'var(--app-text-secondary)' : 'var(--app-glass-border)', padding: 4, borderRadius: '6px', transition: 'color 0.15s' }}
              aria-label="Move up"
            >
              <ChevronUp size={16} />
            </button>
            <button
              onClick={onMoveDown}
              disabled={!onMoveDown}
              style={{ background: 'transparent', border: 'none', cursor: onMoveDown ? 'pointer' : 'default', color: onMoveDown ? 'var(--app-text-secondary)' : 'var(--app-glass-border)', padding: 4, borderRadius: '6px', transition: 'color 0.15s' }}
              aria-label="Move down"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        )}
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0" aria-label="Remove test case">
          <X size={14} />
        </button>
      </div>
      <div className="flex items-start gap-3 mb-3">
        <input
          type="text"
          value={tc.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Test case name…"
          className="flex-1 text-sm font-semibold bg-transparent border-b border-border outline-none text-foreground placeholder:text-muted-foreground/50 py-0.5 focus:border-foreground transition-colors"
        />
      </div>

      {/* Priority */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className="text-xs text-muted-foreground">Priority:</span>
        {PRIORITY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => patch({ priority: opt.value })}
            className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize transition-opacity ${tc.priority === opt.value ? 'opacity-100 ring-1 ring-offset-1 ring-current' : 'opacity-40 hover:opacity-70'}`} style={opt.style}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Steps */}
      <div className="mb-3">
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Steps</p>
        <ol className="space-y-1.5">
          {tc.steps.map((step, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-5 flex-shrink-0 text-right">{i + 1}.</span>
              <input
                type="text"
                value={step}
                onChange={(e) => updateStep(i, e.target.value)}
                placeholder="Describe the step…"
                className="flex-1 text-sm bg-transparent border-b border-border outline-none text-foreground placeholder:text-muted-foreground/50 py-0.5 focus:border-foreground transition-colors"
              />
              {tc.steps.length > 1 && (
                <button onClick={() => removeStep(i)} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"><X size={12} /></button>
              )}
            </li>
          ))}
        </ol>
        <button onClick={addStep} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2">
          <Plus size={12} /> Add Step
        </button>
      </div>

      {/* Expected */}
      <div className="mb-3">
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Expected Result</p>
        <input
          type="text"
          value={tc.expected}
          onChange={(e) => patch({ expected: e.target.value })}
          placeholder="What should happen…"
          className="w-full text-sm bg-transparent border-b border-border outline-none text-foreground placeholder:text-muted-foreground/50 py-0.5 focus:border-foreground transition-colors"
        />
      </div>

      {/* Notes */}
      <div className="mb-2">
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Notes</p>
        <AutoGrowTextarea
          value={tc.notes ?? ''}
          onChange={(e) => patch({ notes: e.target.value })}
          placeholder="Add notes, observations, or comments..."
          minHeight={44}
          focusMinHeight={140}
          className="w-full text-sm bg-transparent border-b border-border outline-none text-foreground placeholder:text-muted-foreground/50 py-0.5 focus:border-foreground transition-colors"
          style={{ lineHeight: 1.7, fontFamily: "'Segoe UI', system-ui, sans-serif" }}
        />
      </div>

      {/* Attachments */}
      <Attachments testCaseId={`${parentTcId}__${tc.id}`} />
    </div>
  )
}

// ── Root component — unified inline-editable view ─────────────────────────────

function CustomTestCaseDetail() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { tc, ready } = useCustomTestCase(id)
  const { projects } = useProjects()

  const [draft, setDraft] = useState<CustomTestCase | null>(null)
  const [saved, setSaved] = useState(false)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const slug = tc ? `custom:${tc.id}` : ''
  const { status, setStatus } = useTestStatus(slug)
  const [passedCount, setPassedCount] = useState(0)

  useEffect(() => {
    if (tc && !draft) setDraft(tc)
  }, [tc, draft])

  useEffect(() => {
    if (!tc) return
    const stored = loadExpectedMap()
    const initial = tc.testCases.filter((sub) => Boolean(stored[`${slug}__expected__${sub.id}`])).length
    setPassedCount(initial)
  }, [slug, tc])

  useEffect(() => {
    if (ready && tc === undefined) navigate({ to: '/test-suites' })
  }, [ready, tc, navigate])

  const session = getSession()
  const isOwner = tc ? (!tc.userId || tc.userId === session?.id) : false
  const canEdit = Boolean(isOwner || (tc && tc.projectId))

  const stripVolatile = (t: CustomTestCase) => {
    const { updatedAt: _u, ...rest } = t
    return rest
  }
  const dirty = !!draft && !!tc && JSON.stringify(stripVolatile(draft)) !== JSON.stringify(stripVolatile(tc))

  const patch = useCallback((fields: Partial<CustomTestCase>) => {
    setDraft((d) => d ? { ...d, ...fields } : d)
  }, [])

  const saveDraft = useCallback(() => {
    if (!draft || !canEdit) return
    updateCustomTestCase({ ...draft, updatedAt: new Date().toISOString() })
    setSaved(true)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setSaved(false), 1500)
  }, [draft, canEdit])

  useEffect(() => () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
  }, [])

  const addPrecondition = () => {
    if (!draft) return
    patch({ preconditions: [...draft.preconditions, ''] })
  }
  const updatePrecondition = (i: number, v: string) => {
    if (!draft) return
    const next = [...draft.preconditions]
    next[i] = v
    patch({ preconditions: next })
  }
  const removePrecondition = (i: number) => {
    if (!draft) return
    patch({ preconditions: draft.preconditions.filter((_, idx) => idx !== i) })
  }

  const addSubTC = () => {
    if (!draft) return
    patch({ testCases: [...draft.testCases, createCustomTC()] })
  }
  const updateSubTC = (updated: CustomTC) => {
    if (!draft) return
    patch({ testCases: draft.testCases.map((s) => (s.id === updated.id ? updated : s)) })
  }
  const removeSubTC = (subId: string) => {
    if (!draft) return
    patch({ testCases: draft.testCases.filter((s) => s.id !== subId) })
  }
  const moveSubTC = (from: number, to: number) => {
    if (!draft) return
    const next = [...draft.testCases]
    ;[next[from], next[to]] = [next[to], next[from]]
    patch({ testCases: next })
  }

  const handleAiFill = (result: AIFillResult) => {
    patch({
      title: result.title,
      summary: result.summary,
      objective: result.objective,
      preconditions: result.preconditions,
      tags: result.tags ?? [],
      testCases: result.testCases.map((sub) => ({
        ...createCustomTC(),
        name: sub.name,
        priority: sub.priority ?? 'medium',
        steps: sub.steps,
        expected: sub.expected,
      })),
    })

    if (result.extractedImages && result.extractedImages.length > 0 && tc) {
      const pending: PendingImage[] = result.extractedImages.map((img) => {
        const byteChars = atob(img.data)
        const byteArray = new Uint8Array(byteChars.length)
        for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i)
        const blob = new Blob([byteArray], { type: img.contentType })
        const file = new File([blob], img.name, { type: img.contentType })
        return { file, preview: URL.createObjectURL(blob), name: img.name }
      })
      uploadPreconditionImages(`precond:${tc.id}`, pending).catch(() => {
        console.error('Failed to upload precondition images')
      })
    }
  }

  if (!ready || !tc || !draft) return null

  const statusCurrent = STATUS_OPTIONS.find((o) => o.value === status) ?? STATUS_OPTIONS[2]

  return (
    <div className="min-h-screen text-foreground overflow-hidden relative" style={{ background: 'var(--app-bg)', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        @keyframes movecid2 { from { transform: translate(-10%,-10%); } to { transform: translate(20%,20%); } }
        .blob-cid2 { position:absolute; border-radius:50%; background:var(--app-accent-gradient); filter:blur(80px); opacity:0.18; animation:movecid2 20s infinite alternate; pointer-events:none; }
      `}</style>
      <div className="blob-cid2" style={{ width:400, height:400, top:-100, left:-100 }} />
      <div className="blob-cid2" style={{ width:300, height:300, bottom:-50, right:-50, animationDelay:'-5s' }} />
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-12 relative z-10">

        {/* Header row */}
        <div className="flex items-center justify-between mb-6 gap-2">
          <Link
            to="/test-suites"
            className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
            style={{ background: 'var(--app-btn-primary)', color: 'var(--app-btn-text)', boxShadow: '0 2px 12px var(--app-btn-primary-shadow)' }}
          >
            <ArrowLeft size={14} /> Back to Test Suites
          </Link>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => setAiOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-90"
                style={{ background: 'var(--app-btn-primary)', color: 'var(--app-btn-text)', boxShadow: `0 2px 12px var(--app-btn-primary-shadow)` }}
              >
                <Sparkles size={14} /> AI Generate
              </button>
            )}
            {canEdit && (
              <button
                onClick={saveDraft}
                disabled={!dirty && !saved}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                  background: dirty ? 'var(--app-btn-primary)' : 'var(--app-glass)',
                  color: dirty ? 'var(--app-btn-text)' : 'var(--app-text-secondary)',
                  border: dirty ? 'none' : '1px solid var(--app-glass-border)',
                  opacity: !dirty && !saved ? 0.6 : 1,
                  cursor: !dirty && !saved ? 'default' : 'pointer',
                  boxShadow: dirty ? '0 2px 12px var(--app-btn-primary-shadow)' : 'none',
                }}
              >
                <Save size={14} />
                {saved ? 'Saved' : dirty ? 'Save' : 'Saved'}
              </button>
            )}
          </div>
        </div>

        {/* Title */}
        <input
          type="text"
          value={draft.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Test plan title…"
          readOnly={!canEdit}
          className="w-full text-3xl font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground mb-2 focus:underline decoration-muted-foreground/40"
          style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
        />

        {/* Summary */}
        <AutoGrowTextarea
          value={draft.summary}
          onChange={(e) => patch({ summary: e.target.value })}
          placeholder="Add a description…"
          readOnly={!canEdit}
          minHeight={52}
          focusMinHeight={140}
          className="w-full text-lg text-muted-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50 mb-3 focus:underline decoration-muted-foreground/40"
        />

        {/* Status + passed count + project */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <Dropdown
            label={statusCurrent.label}
            options={STATUS_OPTIONS}
            current={status}
            badgeClass={STATUS_STYLES[status]}
            onSelect={(v) => setStatus(v as TestStatus)}
          />
          {passedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
              <Check size={13} /> {passedCount} passed
            </span>
          )}
          {canEdit ? (
            <ProjectPicker
              projectId={draft.projectId ?? null}
              onChange={(pid) => patch({ projectId: pid })}
              projects={projects}
            />
          ) : draft.projectId ? (
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium" style={{ background: 'var(--app-accent-bg)', border: '1px solid var(--app-glass-border)', color: 'var(--app-accent-color)' }}>
              <FolderOpen size={13} style={{ opacity: 0.7 }} />
              {projects.find((p) => p.id === draft.projectId)?.name ?? 'Project'}
            </span>
          ) : null}
        </div>

        {/* Dates */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
          <span className="flex items-center gap-1"><Calendar size={14} /> Created {formatDate(tc.createdAt)}</span>
          <span className="flex items-center gap-1"><Calendar size={14} /> Updated {formatDate(tc.updatedAt)}</span>
        </div>

        {/* Priority */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">Priority:</span>
          {PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => canEdit && patch({ priority: opt.value })}
              disabled={!canEdit}
              className={`text-xs px-3 py-1 rounded-full font-medium capitalize transition-opacity ${draft.priority === opt.value ? 'opacity-100 ring-2 ring-offset-1 ring-current' : 'opacity-50 hover:opacity-80'}`} style={opt.style}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Tags */}
        <div className="mb-6 flex items-start gap-2">
          <Tag size={14} className="mt-3 text-muted-foreground flex-shrink-0" />
          <div className="flex-1">
            <TagInput tags={draft.tags} onChange={(tags) => patch({ tags })} />
          </div>
        </div>

        <hr className="border-border mb-6" />

        {/* Objective */}
        <section className="mb-6 rounded-lg p-5" style={{ background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)' }}>
          <h2 className="text-base font-semibold mb-3">Objective</h2>
          <AutoGrowTextarea
            value={draft.objective}
            onChange={(e) => patch({ objective: e.target.value })}
            placeholder="Describe the objective of this test plan…"
            readOnly={!canEdit}
            minHeight={80}
            focusMinHeight={180}
            className="w-full text-sm text-foreground bg-transparent outline-none placeholder:text-muted-foreground/60 transition-colors"
          />
        </section>

        {/* Preconditions */}
        <section className="mb-6 rounded-lg p-5" style={{ background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)' }}>
          <h2 className="text-base font-semibold mb-3">Preconditions</h2>
          <ul className="space-y-2 mb-3">
            {draft.preconditions.map((item, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-muted-foreground select-none">•</span>
                <input
                  type="text"
                  value={item}
                  onChange={(e) => updatePrecondition(i, e.target.value)}
                  placeholder="Add a precondition…"
                  readOnly={!canEdit}
                  className="flex-1 text-sm bg-transparent border-b border-border outline-none text-foreground placeholder:text-muted-foreground/50 py-0.5 focus:border-foreground transition-colors"
                />
                {canEdit && (
                  <button onClick={() => removePrecondition(i)} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"><X size={14} /></button>
                )}
              </li>
            ))}
          </ul>
          {canEdit && (
            <button onClick={addPrecondition} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Plus size={14} /> Add Precondition
            </button>
          )}
          <PreconditionAttachments testCaseId={`precond:${tc.id}`} />
        </section>

        {/* Test Cases */}
        <section className="rounded-lg p-5" style={{ background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)' }}>
          <h2 className="text-base font-semibold mb-4">Test Cases</h2>
          {draft.testCases.map((sub, i) => (
            <div key={sub.id}>
              <SubTCEditor
                tc={sub}
                index={i}
                onChange={updateSubTC}
                onRemove={() => removeSubTC(sub.id)}
                parentTcId={tc.id}
                onMoveUp={canEdit && i > 0 ? () => moveSubTC(i, i - 1) : undefined}
                onMoveDown={canEdit && i < draft.testCases.length - 1 ? () => moveSubTC(i, i + 1) : undefined}
              />
              {sub.expected.trim() && (
                <ExpectedRow
                  storageKey={`${slug}__expected__${sub.id}`}
                  text={sub.expected}
                  onToggle={(v) => setPassedCount((c) => (v ? c + 1 : c - 1))}
                />
              )}
            </div>
          ))}
          {canEdit && (
            <button
              onClick={addSubTC}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors w-full justify-center"
            >
              <Plus size={14} /> Add Test Case
            </button>
          )}
        </section>

      </div>

      {/* AI fill panel */}
      {aiOpen && (
        <AIFillPanel
          onFill={handleAiFill}
          onClose={() => setAiOpen(false)}
          onLoading={setAiLoading}
        />
      )}
      <LoadingCurtain visible={aiLoading} message="Generating test cases" transparent />

      {/* Sticky footer save hint */}
      {dirty && canEdit && (
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium"
          style={{ background: 'var(--app-overlay)', border: '1px solid var(--app-overlay-border)', backdropFilter: 'blur(12px)', color: 'var(--app-text)' }}
        >
          Unsaved changes
          <button
            onClick={saveDraft}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'var(--app-btn-primary)', color: 'var(--app-btn-text)' }}
          >
            <Save size={11} /> Save
          </button>
        </div>
      )}
    </div>
  )
}
