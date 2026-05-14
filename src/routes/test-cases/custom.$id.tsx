import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Calendar, X, Plus, FolderOpen, ChevronDown, ChevronUp, Sparkles, Target, ListChecks, ClipboardList } from 'lucide-react'
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
  useFailedChecked,
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
import { Pill } from '@/components/design/primitives'

export const Route = createFileRoute('/test-cases/custom/$id')({
  component: CustomTestCaseDetail,
})

// ── Shared constants ──────────────────────────────────────────────────────────

const PRIORITY_OPTIONS = [
  { value: 'low'      as const, label: 'Low',      tone: 'green'  as const },
  { value: 'medium'   as const, label: 'Medium',   tone: 'amber'  as const },
  { value: 'high'     as const, label: 'High',     tone: 'coral'  as const },
  { value: 'critical' as const, label: 'Critical', tone: 'red'    as const },
]

const PRIORITY_TONE: Record<'green' | 'amber' | 'coral' | 'red', { bg: string; fg: string; border: string }> = {
  green:  { bg: 'color-mix(in oklab, var(--green)  12%, transparent)', fg: 'var(--green)',  border: 'color-mix(in oklab, var(--green)  25%, transparent)' },
  amber:  { bg: 'color-mix(in oklab, var(--amber)  14%, transparent)', fg: 'var(--amber)',  border: 'color-mix(in oklab, var(--amber)  30%, transparent)' },
  coral:  { bg: 'color-mix(in oklab, #E05525       14%, transparent)', fg: '#E05525',       border: 'color-mix(in oklab, #E05525       30%, transparent)' },
  red:    { bg: 'color-mix(in oklab, var(--red)    12%, transparent)', fg: 'var(--red)',    border: 'color-mix(in oklab, var(--red)    25%, transparent)' },
}

const STATUS_TONES: Record<TestStatus, { bg: string; fg: string; border: string; icon: 'check-circle' | 'x-circle' | 'clock' | 'alert' }> = {
  pass:    { bg: 'var(--green-soft)',                                          fg: '#0B6F49',     border: 'color-mix(in oklab, var(--green) 30%, transparent)', icon: 'check-circle' },
  fail:    { bg: 'var(--red-soft)',                                            fg: '#9A261F',     border: 'color-mix(in oklab, var(--red) 30%, transparent)',   icon: 'x-circle'     },
  pending: { bg: 'color-mix(in oklab, var(--amber) 14%, transparent)',         fg: '#7A5409',     border: 'color-mix(in oklab, var(--amber) 30%, transparent)', icon: 'clock'        },
  blocked: { bg: 'var(--chip)',                                                fg: 'var(--mute)', border: 'var(--border)',                                       icon: 'alert'        },
}

const STATUS_OPTIONS: Array<{ value: TestStatus; label: string }> = [
  { value: 'pass',    label: 'PASSED'  },
  { value: 'fail',    label: 'FAILED'  },
  { value: 'pending', label: 'PENDING' },
  { value: 'blocked', label: 'BLOCKED' },
]

const ALL_EXISTING_TAGS: string[] = []

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

// ── Shared small components ───────────────────────────────────────────────────

function StatusSelect({ value, onChange, disabled }: { value: TestStatus; onChange: (v: TestStatus) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const tone = STATUS_TONES[value]

  return (
    <div ref={wrapperRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '5px 10px 5px 10px',
          borderRadius: 999,
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          color: 'var(--ink)',
          fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
          cursor: disabled ? 'default' : 'pointer',
          fontFamily: 'inherit',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: tone.fg, flexShrink: 0, display: 'inline-block' }} />
        {STATUS_OPTIONS.find((o) => o.value === value)?.label ?? value.toUpperCase()}
        <ChevronDown size={11} style={{ opacity: 0.5, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>

      {open && (
        <div
          className="panel"
          style={{
            position: 'absolute', left: 0, top: 'calc(100% + 5px)', zIndex: 60,
            minWidth: 150, padding: 4,
            boxShadow: '0 12px 36px rgba(20,20,40,0.18)',
          }}
        >
          {STATUS_OPTIONS.map((o) => {
            const t = STATUS_TONES[o.value]
            const active = o.value === value
            return (
              <button
                key={o.value}
                onMouseDown={() => { onChange(o.value); setOpen(false) }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                  padding: '8px 10px', borderRadius: 8, border: 'none',
                  background: active ? 'var(--chip)' : 'transparent',
                  color: 'var(--ink)',
                  fontSize: 12, fontWeight: active ? 600 : 500,
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                }}
              >
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: t.fg, flexShrink: 0, display: 'inline-block' }} />
                {o.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Controlled failed row (no hook — state managed by SubTCResultRows)
function FailedRow({ checked, onToggle, text, onTextChange }: { checked: boolean; onToggle: () => void; text: string; onTextChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 14px', borderRadius: '8px', marginBottom: '12px', border: checked ? '1px solid rgba(220,38,38,0.45)' : '1px solid rgba(120,120,120,0.25)', background: checked ? 'rgba(220,38,38,0.1)' : 'transparent', transition: 'background 0.2s, border-color 0.2s' }}>
      <button
        onClick={onToggle}
        aria-label="Mark as failed"
        style={{ flexShrink: 0, width: '20px', height: '20px', minWidth: '20px', borderRadius: '5px', border: checked ? '2px solid #dc2626' : '2px solid #6b7280', background: checked ? '#dc2626' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', padding: '0', transition: 'all 0.15s', outline: 'none', boxSizing: 'border-box' }}
      >
        {checked ? '✗' : ''}
      </button>
      <span style={{ fontSize: 12, fontWeight: 700, color: checked ? '#dc2626' : 'var(--mute)', flexShrink: 0, letterSpacing: '0.02em' }}>Failed:</span>
      <input
        type="text"
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="This failed because…"
        style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: checked ? '#dc2626' : 'var(--ink)', fontFamily: 'inherit', transition: 'color 0.2s' }}
      />
    </div>
  )
}

// Wrapper that owns both hooks and enforces mutual exclusivity
function SubTCResultRows({
  slug, subId, expected, failedReason,
  onExpectedChange, onFailedReasonChange,
  onPassCountChange, onFailCountChange,
}: {
  slug: string; subId: string; expected: string; failedReason: string;
  onExpectedChange: (v: string) => void; onFailedReasonChange: (v: string) => void;
  onPassCountChange: (delta: number) => void; onFailCountChange: (delta: number) => void;
}) {
  const { checked: passChecked, setChecked: setPass } = useExpectedChecked(`${slug}__expected__${subId}`)
  const { checked: failChecked, setChecked: setFail } = useFailedChecked(`${slug}__failed__${subId}`)

  const handlePassToggle = () => {
    const next = !passChecked
    setPass(next)
    onPassCountChange(next ? 1 : -1)
    if (next && failChecked) { setFail(false); onFailCountChange(-1) }
  }

  const handleFailToggle = () => {
    const next = !failChecked
    setFail(next)
    onFailCountChange(next ? 1 : -1)
    if (next && passChecked) { setPass(false); onPassCountChange(-1) }
  }

  return (
    <>
      <ExpectedRow checked={passChecked} onToggle={handlePassToggle} text={expected} onTextChange={onExpectedChange} />
      <FailedRow checked={failChecked} onToggle={handleFailToggle} text={failedReason} onTextChange={onFailedReasonChange} />
    </>
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
    <div ref={wrapperRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontSize: 12, fontWeight: 500,
          padding: '5px 12px',
          borderRadius: 999,
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          color: selected ? 'var(--ink)' : 'var(--mute)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          boxShadow: 'var(--shadow-xs)',
          letterSpacing: '0.005em',
        }}
      >
        <FolderOpen size={12} />
        <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.name ?? 'No project'}
        </span>
        <ChevronDown size={11} style={{ opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>

      {open && (
        <div
          className="panel"
          style={{
            position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 50,
            width: 260, padding: 4,
            boxShadow: '0 20px 50px rgba(20,20,40,0.18)',
          }}
        >
          <button
            onMouseDown={() => { onChange(null); setOpen(false) }}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 10px',
              borderRadius: 8,
              fontSize: 13, fontWeight: projectId === null ? 600 : 500,
              color: projectId === null ? 'var(--ink)' : 'var(--mute)',
              background: projectId === null ? 'var(--chip)' : 'transparent',
              border: 'none', cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <FolderOpen size={13} style={{ opacity: 0.7 }} />
            No project
          </button>
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {projects.map((p) => {
              const active = projectId === p.id
              return (
                <button
                  key={p.id}
                  onMouseDown={() => { onChange(p.id); setOpen(false) }}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px',
                    borderRadius: 8,
                    fontSize: 13, fontWeight: active ? 600 : 500,
                    color: 'var(--ink)',
                    background: active ? 'var(--chip)' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// Controlled expected row (no hook — state managed by SubTCResultRows)
function ExpectedRow({ checked, onToggle, text, onTextChange }: { checked: boolean; onToggle: () => void; text: string; onTextChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '9px 14px', borderRadius: '8px', marginBottom: '6px', border: checked ? '1px solid rgba(22,163,74,0.5)' : '1px solid rgba(120,120,120,0.25)', background: checked ? 'rgba(22,163,74,0.15)' : 'transparent', transition: 'background 0.2s, border-color 0.2s' }}>
      <button
        onClick={onToggle}
        aria-label="Mark as passed"
        style={{ flexShrink: 0, width: '20px', height: '20px', minWidth: '20px', borderRadius: '5px', border: checked ? '2px solid #16a34a' : '2px solid #6b7280', background: checked ? '#16a34a' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', padding: '0', transition: 'all 0.15s', outline: 'none', boxSizing: 'border-box' }}
      >
        {checked ? '✓' : ''}
      </button>
      <span style={{ fontSize: 12, fontWeight: 700, color: checked ? '#16a34a' : 'var(--mute)', flexShrink: 0, letterSpacing: '0.02em' }}>Expected:</span>
      <input
        type="text"
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="What should happen…"
        style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: checked ? '#16a34a' : 'var(--ink)', fontFamily: 'inherit', transition: 'color 0.2s' }}
      />
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
  const [expanded, setExpanded] = useState(true)
  const patch = (fields: Partial<CustomTC>) => onChange({ ...tc, ...fields })

  const addStep = () => patch({ steps: [...tc.steps, ''] })
  const updateStep = (i: number, v: string) => { const next = [...tc.steps]; next[i] = v; patch({ steps: next }) }
  const removeStep = (i: number) => patch({ steps: tc.steps.filter((_, idx) => idx !== i) })

  const tcCode = `TC-${String(index + 1).padStart(2, '0')}`

  return (
    <div
      id={id}
      style={{
        border: '1px solid var(--border)',
        borderRadius: 12,
        background: 'var(--panel-2)',
        marginBottom: 10,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          background: 'color-mix(in oklab, var(--purple) 5%, var(--panel-2))',
          borderBottom: expanded ? '1px solid var(--border)' : 'none',
        }}
      >
        <span
          className="tz-mono"
          style={{
            fontSize: 11, fontWeight: 600, color: 'var(--purple)',
            background: 'color-mix(in oklab, var(--purple) 12%, var(--panel))',
            border: '1px solid color-mix(in oklab, var(--purple) 25%, var(--border))',
            padding: '3px 9px', borderRadius: 6, letterSpacing: '0.05em',
          }}
        >
          {tcCode}
        </span>
        <input
          type="text"
          value={tc.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Test case name…"
          style={{
            flex: 1, minWidth: 0,
            background: 'transparent', border: 'none', outline: 'none',
            fontSize: 13, fontWeight: 600, color: 'var(--ink)',
            fontFamily: 'inherit',
          }}
        />
        {(onMoveUp || onMoveDown) && (
          <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
            <button
              onClick={onMoveUp}
              disabled={!onMoveUp}
              className="tz-btn tz-btn-ghost"
              style={{ padding: 4, color: onMoveUp ? 'var(--mute)' : 'var(--border-strong)', cursor: onMoveUp ? 'pointer' : 'default' }}
              aria-label="Move up"
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={onMoveDown}
              disabled={!onMoveDown}
              className="tz-btn tz-btn-ghost"
              style={{ padding: 4, color: onMoveDown ? 'var(--mute)' : 'var(--border-strong)', cursor: onMoveDown ? 'pointer' : 'default' }}
              aria-label="Move down"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        )}
        <button
          className="tz-btn tz-btn-ghost"
          style={{ padding: 4 }}
          onClick={() => setExpanded((e) => !e)}
          aria-label="Toggle expand"
        >
          <ChevronDown
            size={14}
            style={{ transform: expanded ? 'none' : 'rotate(-90deg)', transition: 'transform .15s', color: 'var(--mute)' }}
          />
        </button>
        <button
          onClick={onRemove}
          className="tz-btn tz-btn-ghost"
          style={{ padding: 4, color: 'var(--mute)' }}
          aria-label="Remove test case"
        >
          <X size={13} />
        </button>
      </div>

      {expanded && (
        <div style={{ padding: 14 }}>
          {/* Priority */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <span
              className="tz-mono"
              style={{ fontSize: 10.5, color: 'var(--mute)', letterSpacing: '0.08em', fontWeight: 600 }}
            >
              PRIORITY
            </span>
            <div style={{ display: 'flex', gap: 5 }}>
              {PRIORITY_OPTIONS.map((opt) => {
                const active = tc.priority === opt.value
                const tone = PRIORITY_TONE[opt.tone]
                return (
                  <button
                    key={opt.value}
                    onClick={() => patch({ priority: opt.value })}
                    style={{
                      background: active ? tone.bg : 'var(--chip)',
                      color: active ? tone.fg : 'var(--mute)',
                      border: `1px solid ${active ? tone.border : 'var(--border)'}`,
                      borderRadius: 999,
                      padding: '4px 11px',
                      fontSize: 12,
                      fontWeight: active ? 600 : 500,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all .15s',
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Steps */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
              <span
                className="tz-mono"
                style={{ fontSize: 10.5, color: 'var(--mute)', letterSpacing: '0.08em', fontWeight: 600 }}
              >
                STEPS
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {tc.steps.map((step, i) => (
                <div
                  key={i}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '32px 1fr 28px',
                    gap: 8,
                    alignItems: 'center',
                    padding: '7px 10px',
                    background: 'var(--panel)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                  }}
                >
                  <span
                    className="tz-mono"
                    style={{ fontSize: 11, color: 'var(--mute)', textAlign: 'center' }}
                  >
                    {i + 1}.
                  </span>
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => updateStep(i, e.target.value)}
                    placeholder="Describe the step…"
                    style={{
                      background: 'transparent', border: 'none', outline: 'none',
                      fontSize: 13, color: 'var(--ink)', fontFamily: 'inherit',
                    }}
                  />
                  {tc.steps.length > 1 && (
                    <button
                      onClick={() => removeStep(i)}
                      className="tz-btn tz-btn-ghost"
                      style={{ padding: 4, color: 'var(--mute)' }}
                      aria-label="Remove step"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addStep}
                className="tz-btn tz-btn-ghost"
                style={{ alignSelf: 'flex-start', padding: '5px 10px', fontSize: 12, marginTop: 2 }}
              >
                <Plus size={11} /> Add step
              </button>
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 12 }}>
            <div
              className="tz-mono"
              style={{ fontSize: 10.5, color: 'var(--mute)', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 5 }}
            >
              NOTES
            </div>
            <AutoGrowTextarea
              value={tc.notes ?? ''}
              onChange={(e) => patch({ notes: e.target.value })}
              placeholder="Add notes, observations, or comments…"
              minHeight={56}
              focusMinHeight={140}
              className="tz-input tz-textarea"
              style={{ fontSize: 13 }}
            />
          </div>

          {/* Attachments */}
          <div
            className="tz-mono"
            style={{ fontSize: 10.5, color: 'var(--mute)', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 6 }}
          >
            # ATTACHMENTS
          </div>
          <Attachments testCaseId={`${parentTcId}__${tc.id}`} />

        </div>
      )}
    </div>
  )
}

// ── Section card with colored icon header ─────────────────────────────────────

function SectionCard({ icon, gradient, title, children }: { icon: React.ReactNode; gradient: string; title: string; children: React.ReactNode }) {
  return (
    <section className="panel" style={{ padding: 22, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span
          className={`section-icon ${gradient}`}
          style={{ width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center', color: 'white' }}
        >
          {icon}
        </span>
        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{title}</div>
      </div>
      {children}
    </section>
  )
}

// ── Root component — unified inline-editable view ─────────────────────────────

function CustomTestCaseDetail() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { tc, ready } = useCustomTestCase(id)
  const { projects } = useProjects()

  const [draft, setDraft] = useState<CustomTestCase | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  // Refs used by the flush-on-unmount effect (avoids stale closure)
  const pendingSaveRef = useRef<CustomTestCase | null>(null)
  const canEditRef = useRef(false)
  const isInitialDraftRef = useRef(true)

  const slug = tc ? `custom:${tc.id}` : ''
  const { status, setStatus } = useTestStatus(slug)
  const [passedCount, setPassedCount] = useState(0)
  const [failedCount, setFailedCount] = useState(0)

  useEffect(() => {
    if (tc && !draft) setDraft(tc)
  }, [tc, draft])

  useEffect(() => {
    if (!tc) return
    const stored = loadExpectedMap()
    const initialPassed = tc.testCases.filter((sub) => Boolean(stored[`${slug}__expected__${sub.id}`])).length
    const initialFailed = tc.testCases.filter((sub) => Boolean(stored[`${slug}__failed__${sub.id}`])).length
    setPassedCount(initialPassed)
    setFailedCount(initialFailed)
  }, [slug, tc])

  useEffect(() => {
    if (ready && tc === undefined) navigate({ to: '/test-suites' })
  }, [ready, tc, navigate])

  const session = getSession()
  const isOwner = tc ? (!tc.userId || tc.userId === session?.id) : false
  const canEdit = Boolean(isOwner || (tc && tc.projectId))
  // Keep refs current every render so unmount cleanup sees the latest values
  canEditRef.current = canEdit

  // Debounce: persist to server 600ms after the last change
  useEffect(() => {
    // Skip the very first time draft is set from tc (initial load)
    if (isInitialDraftRef.current) {
      if (draft !== null) isInitialDraftRef.current = false
      return
    }
    if (!draft || !canEditRef.current) return
    const timer = setTimeout(() => {
      updateCustomTestCase({ ...draft, updatedAt: new Date().toISOString() })
      pendingSaveRef.current = null
    }, 600)
    return () => clearTimeout(timer)
  }, [draft])

  // Flush any pending save immediately when the component unmounts
  // (prevents losing edits made < 600ms before navigating away)
  useEffect(() => {
    return () => {
      if (pendingSaveRef.current && canEditRef.current) {
        updateCustomTestCase({ ...pendingSaveRef.current, updatedAt: new Date().toISOString() })
      }
    }
  }, [])

  const patch = useCallback((fields: Partial<CustomTestCase>) => {
    setDraft((d) => {
      if (!d) return d
      const next = { ...d, ...fields }
      pendingSaveRef.current = next // track latest for flush-on-unmount
      return next
    })
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

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <div className="page-atmos" aria-hidden />
      <div className="shell" style={{ paddingTop: 28 }}>

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <Link to="/test-suites" style={{ textDecoration: 'none' }}>
            <button className="tz-btn tz-btn-ghost">
              <ArrowLeft size={13} /> Back to Test Suites
            </button>
          </Link>
          <span style={{ flex: 1 }} />
          {canEdit && (
            <button onClick={() => setAiOpen(true)} className="tz-btn tz-btn-gradient">
              <Sparkles size={14} /> AI Generate
            </button>
          )}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <StatusSelect
            value={status}
            onChange={(v) => setStatus(v)}
            disabled={!canEdit}
          />
          {passedCount > 0 && (
            <Pill tone="green" icon="check">{passedCount} passed</Pill>
          )}
          {failedCount > 0 && (
            <Pill tone="red" icon="x-circle">{failedCount} failed</Pill>
          )}
          {canEdit ? (
            <ProjectPicker
              projectId={draft.projectId ?? null}
              onChange={(pid) => patch({ projectId: pid })}
              projects={projects}
            />
          ) : draft.projectId ? (() => {
              const proj = projects.find((p) => p.id === draft.projectId)
              return (
                <Pill tone="neutral" icon="folder" style={proj?.color ? {
                  background: `color-mix(in oklab, ${proj.color} 15%, transparent)`,
                  color: `color-mix(in oklab, ${proj.color} 70%, var(--ink))`,
                } : {}}>
                  {proj?.name ?? 'Project'}
                </Pill>
              )
            })() : null}
        </div>

        {/* Dates */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
          <span className="flex items-center gap-1"><Calendar size={14} /> Created {formatDate(tc.createdAt)}</span>
          <span className="flex items-center gap-1"><Calendar size={14} /> Updated {formatDate(tc.updatedAt)}</span>
        </div>

        {/* Priority */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <span className="tz-mono" style={{ fontSize: 10.5, color: 'var(--mute)', letterSpacing: '0.08em', fontWeight: 600 }}>PRIORITY</span>
          <div style={{ display: 'flex', gap: 5 }}>
            {PRIORITY_OPTIONS.map((opt) => {
              const active = draft.priority === opt.value
              const tone = PRIORITY_TONE[opt.tone]
              return (
                <button
                  key={opt.value}
                  onClick={() => canEdit && patch({ priority: opt.value })}
                  disabled={!canEdit}
                  style={{
                    background: active ? tone.bg : 'var(--chip)',
                    color: active ? tone.fg : 'var(--mute)',
                    border: `1px solid ${active ? tone.border : 'var(--border)'}`,
                    borderRadius: 999,
                    padding: '4px 11px',
                    fontSize: 12,
                    fontWeight: active ? 600 : 500,
                    cursor: canEdit ? 'pointer' : 'default',
                    fontFamily: 'inherit',
                    transition: 'all .15s',
                    opacity: canEdit ? 1 : 0.7,
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tags */}
        <div
          style={{
            marginBottom: 18,
            padding: '10px 12px',
            background: 'var(--panel-2)',
            border: '1px solid var(--border)',
            borderRadius: 12,
          }}
        >
          <TagInput tags={draft.tags} onChange={(tags) => patch({ tags })} />
        </div>

        {/* Objective */}
        <SectionCard icon={<Target size={16} />} gradient="grad-purple" title="Objective">
          <AutoGrowTextarea
            value={draft.objective}
            onChange={(e) => patch({ objective: e.target.value })}
            placeholder="Describe the objective of this test plan…"
            readOnly={!canEdit}
            minHeight={80}
            focusMinHeight={180}
            className="w-full text-sm text-foreground bg-transparent outline-none placeholder:text-muted-foreground/60 transition-colors"
          />
        </SectionCard>

        {/* Preconditions */}
        <SectionCard icon={<ListChecks size={16} />} gradient="grad-blue" title="Preconditions">
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
        </SectionCard>

        {/* Test Cases */}
        <SectionCard icon={<ClipboardList size={16} />} gradient="grad-orange" title="Test Cases">
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
              <SubTCResultRows
                slug={slug}
                subId={sub.id}
                expected={sub.expected}
                failedReason={sub.failedReason ?? ''}
                onExpectedChange={(v) => updateSubTC({ ...sub, expected: v })}
                onFailedReasonChange={(v) => updateSubTC({ ...sub, failedReason: v })}
                onPassCountChange={(delta) => setPassedCount((c) => c + delta)}
                onFailCountChange={(delta) => setFailedCount((c) => c + delta)}
              />
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
        </SectionCard>

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

    </div>
  )
}
