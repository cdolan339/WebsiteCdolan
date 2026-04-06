import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Calendar, Tag, Pencil, X, Plus, Check, FolderOpen, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
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

function save(tc: CustomTestCase, patch: Partial<CustomTestCase>) {
  updateCustomTestCase({ ...tc, ...patch, updatedAt: new Date().toISOString() })
}

// ── Shared small components ───────────────────────────────────────────────────

// Dropdown used for status and priority in view mode
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
          background: 'rgba(0,210,255,0.12)',
          border: '1px solid rgba(0,210,255,0.3)',
          color: selected ? '#00d2ff' : 'rgba(255,255,255,0.5)',
        }}
      >
        <FolderOpen size={13} className="opacity-60" />
        <span className="truncate max-w-[180px]">{selected?.name ?? 'No Project'}</span>
        <ChevronDown size={12} className={`opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-full mt-2 z-50 w-64 rounded-xl overflow-hidden"
            style={{
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              background: 'rgba(15,12,41,0.97)',
              border: '1px solid rgba(0,210,255,0.25)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <button
              onClick={() => { onChange(null); setOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
              style={{
                background: projectId === null ? 'rgba(0,210,255,0.15)' : 'transparent',
                color: projectId === null ? '#00d2ff' : 'rgba(255,255,255,0.7)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
              onMouseEnter={(e) => { if (projectId !== null) e.currentTarget.style.background = 'rgba(0,210,255,0.08)' }}
              onMouseLeave={(e) => { if (projectId !== null) e.currentTarget.style.background = 'transparent' }}
            >
              <FolderOpen size={14} style={{ color: '#00d2ff', opacity: 0.7 }} />
              No Project
            </button>
            <div className="max-h-48 overflow-y-auto">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { onChange(p.id); setOpen(false) }}
                  className="w-full flex items-center px-4 py-2.5 text-sm text-left transition-colors truncate"
                  style={{
                    background: projectId === p.id ? 'rgba(0,210,255,0.15)' : 'transparent',
                    color: projectId === p.id ? '#00d2ff' : 'rgba(255,255,255,0.7)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}
                  onMouseEnter={(e) => { if (projectId !== p.id) e.currentTarget.style.background = 'rgba(0,210,255,0.08)' }}
                  onMouseLeave={(e) => { if (projectId !== p.id) e.currentTarget.style.background = projectId === p.id ? 'rgba(0,210,255,0.15)' : 'transparent' }}
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

// Expected checkbox row (view mode)
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
      <p style={{ margin: 0, color: checked ? '#4ade80' : undefined, transition: 'color 0.2s', flex: 1 }}>
        <strong>Expected:</strong> {text}
      </p>
    </div>
  )
}

// ── Tag input (edit mode) ─────────────────────────────────────────────────────

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

// ── Sub-test case editor (edit mode) ─────────────────────────────────────────

function SubTCEditor({ tc, onChange, onRemove, index }: { tc: CustomTC; onChange: (tc: CustomTC) => void; onRemove: () => void; index: number }) {
  const patch = (fields: Partial<CustomTC>) => onChange({ ...tc, ...fields })

  const addStep = () => patch({ steps: [...tc.steps, ''] })
  const updateStep = (i: number, v: string) => { const next = [...tc.steps]; next[i] = v; patch({ steps: next }) }
  const removeStep = (i: number) => patch({ steps: tc.steps.filter((_, idx) => idx !== i) })

  return (
    <div className="rounded-lg border border-border bg-card p-4 mb-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <input
          type="text"
          value={tc.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder={`TC-0${index + 1} — Test case name`}
          className="flex-1 text-sm font-semibold bg-transparent border-b border-border outline-none text-foreground placeholder:text-muted-foreground/50 py-0.5 focus:border-foreground transition-colors"
        />
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 mt-0.5" aria-label="Remove test case">
          <X size={14} />
        </button>
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
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Expected Result</p>
        <input
          type="text"
          value={tc.expected}
          onChange={(e) => patch({ expected: e.target.value })}
          placeholder="What should happen…"
          className="w-full text-sm bg-transparent border-b border-border outline-none text-foreground placeholder:text-muted-foreground/50 py-0.5 focus:border-foreground transition-colors"
        />
      </div>
    </div>
  )
}

// ── View mode ─────────────────────────────────────────────────────────────────

function ViewMode({ tc, onEdit }: { tc: CustomTestCase; onEdit: () => void }) {
  const slug = `custom:${tc.id}`
  const { status, setStatus } = useTestStatus(slug)
  const [passedCount, setPassedCount] = useState(0)
  const { projects } = useProjects()

  useEffect(() => {
    const stored = loadExpectedMap()
    const initial = tc.testCases.filter((sub) => Boolean(stored[`${slug}__expected__${sub.id}`])).length
    setPassedCount(initial)
  }, [slug, tc.testCases])

  const priorityOpt = PRIORITY_OPTIONS.find((o) => o.value === tc.priority) ?? PRIORITY_OPTIONS[1]
  const statusCurrent = STATUS_OPTIONS.find((o) => o.value === status) ?? STATUS_OPTIONS[2]

  return (
    <div className="min-h-screen text-white overflow-hidden relative" style={{ background: '#0f0c29', fontFamily: "'Poppins', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
        @keyframes movecid2 { from { transform: translate(-10%,-10%); } to { transform: translate(20%,20%); } }
        .blob-cid2 { position:absolute; border-radius:50%; background:linear-gradient(45deg,#6a11cb,#00d2ff); filter:blur(80px); opacity:0.3; animation:movecid2 20s infinite alternate; pointer-events:none; }
      `}</style>
      <div className="blob-cid2" style={{ width:400, height:400, top:-100, left:-100 }} />
      <div className="blob-cid2" style={{ width:300, height:300, bottom:-50, right:-50, animationDelay:'-5s' }} />
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-12 relative z-10">

        <div className="flex items-center justify-between mb-6">
          <Link to="/homepage" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
            <ArrowLeft size={16} /> Back to Test Cases
          </Link>
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors"
          >
            <Pencil size={14} /> Edit
          </button>
        </div>

        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-3">{tc.title || 'Untitled Test Case'}</h1>
          {tc.summary && <p className="text-muted-foreground text-lg mb-4">{tc.summary}</p>}

          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* Status dropdown */}
            <Dropdown
              label={statusCurrent.label}
              options={STATUS_OPTIONS}
              current={status}
              badgeClass={STATUS_STYLES[status]}
              onSelect={(v) => setStatus(v as TestStatus)}
            />
            {/* Priority dropdown */}
            <Dropdown
              label={`${priorityOpt.label} priority`}
              options={PRIORITY_OPTIONS.map((o) => ({ value: o.value, label: o.label, color: o.color }))}
              current={tc.priority}
              badgeClass="rounded-full font-medium capitalize text-sm px-3 py-1" badgeStyle={priorityOpt.style}
              onSelect={(v) => updateCustomTestCase({ ...tc, priority: v as CustomTestCase['priority'], updatedAt: new Date().toISOString() })}
            />
            {passedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                <Check size={13} /> {passedCount} passed
              </span>
            )}
            {/* Project assignment */}
            <ProjectPicker
              projectId={tc.projectId ?? null}
              onChange={(id) => updateCustomTestCase({ ...tc, projectId: id, updatedAt: new Date().toISOString() })}
              projects={projects}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
            <span className="flex items-center gap-1"><Calendar size={14} /> Created {formatDate(tc.createdAt)}</span>
            <span className="flex items-center gap-1"><Calendar size={14} /> Updated {formatDate(tc.updatedAt)}</span>
          </div>

          {tc.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Tag size={14} className="text-muted-foreground" />
              {tc.tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}
            </div>
          )}
        </div>

        <hr className="border-border mb-8" />

        <article className="[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3 [&_li]:mb-1 [&_strong]:font-semibold">

          {/* Objective */}
          {tc.objective && (
            <>
              <h2>Objective</h2>
              <p>{tc.objective}</p>
              <hr className="border-border my-6" />
            </>
          )}

          {/* Preconditions */}
          {tc.preconditions.length > 0 && (
            <>
              <h2>Preconditions</h2>
              <ul>
                {tc.preconditions.filter(Boolean).map((item, i) => <li key={i}>{item}</li>)}
              </ul>
              {tc.testCases.length > 0 && <hr className="border-border my-6" />}
            </>
          )}

          {/* Sub test cases */}
          {tc.testCases.map((sub, i) => (
            <div key={sub.id}>
              {i > 0 && <hr className="border-border my-6" />}
              <h2>{sub.name || `TC-0${i + 1}`}</h2>
              <div className="flex items-center gap-2 mb-3">
                <strong>Priority:</strong>
                <Dropdown
                  label={PRIORITY_OPTIONS.find((o) => o.value === sub.priority)?.label ?? 'Medium'}
                  options={PRIORITY_OPTIONS.map((o) => ({ value: o.value, label: o.label, color: o.color }))}
                  current={sub.priority}
                  badgeClass="rounded-full font-medium capitalize text-xs px-2 py-0.5"
                  badgeStyle={PRIORITY_OPTIONS.find((o) => o.value === sub.priority)?.style}
                  onSelect={(v) => {
                    const updatedSubs = tc.testCases.map((s) => s.id === sub.id ? { ...s, priority: v as CustomTC['priority'] } : s)
                    updateCustomTestCase({ ...tc, testCases: updatedSubs, updatedAt: new Date().toISOString() })
                  }}
                />
              </div>
              {sub.steps.filter(Boolean).length > 0 && (
                <>
                  <p><strong>Steps:</strong></p>
                  <ol>
                    {sub.steps.filter(Boolean).map((step, si) => <li key={si}>{step}</li>)}
                  </ol>
                </>
              )}
              {sub.expected && (
                <ExpectedRow
                  storageKey={`${slug}__expected__${sub.id}`}
                  text={sub.expected}
                  onToggle={(v) => setPassedCount((c) => (v ? c + 1 : c - 1))}
                />
              )}
            </div>
          ))}
        </article>
      </div>
    </div>
  )
}

// ── Edit mode ─────────────────────────────────────────────────────────────────

function EditMode({ tc, onDone }: { tc: CustomTestCase; onDone: () => void }) {
  const { projects } = useProjects()
  const [draft, setDraft] = useState<CustomTestCase>({ ...tc })

  const patch = (fields: Partial<CustomTestCase>) => setDraft((prev) => ({ ...prev, ...fields }))

  const handleDone = () => {
    save(tc, { ...draft, updatedAt: new Date().toISOString() })
    onDone()
  }

  const addPrecondition = () => patch({ preconditions: [...draft.preconditions, ''] })
  const updatePrecondition = (i: number, v: string) => { const next = [...draft.preconditions]; next[i] = v; patch({ preconditions: next }) }
  const removePrecondition = (i: number) => patch({ preconditions: draft.preconditions.filter((_, idx) => idx !== i) })

  const addSubTC = () => patch({ testCases: [...draft.testCases, createCustomTC()] })
  const updateSubTC = (updated: CustomTC) => patch({ testCases: draft.testCases.map((s) => (s.id === updated.id ? updated : s)) })
  const removeSubTC = (id: string) => patch({ testCases: draft.testCases.filter((s) => s.id !== id) })

  const doneButtonStyle: React.CSSProperties = {
    background: 'linear-gradient(45deg, #6a11cb, #00d2ff)',
    color: '#fff',
    boxShadow: '0 2px 12px rgba(106,17,203,0.3)',
  }

  return (
    <div className="min-h-screen text-white overflow-hidden relative" style={{ background: '#0f0c29', fontFamily: "'Poppins', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
        @keyframes movecid2 { from { transform: translate(-10%,-10%); } to { transform: translate(20%,20%); } }
        .blob-cid2 { position:absolute; border-radius:50%; background:linear-gradient(45deg,#6a11cb,#00d2ff); filter:blur(80px); opacity:0.3; animation:movecid2 20s infinite alternate; pointer-events:none; }
      `}</style>
      <div className="blob-cid2" style={{ width:400, height:400, top:-100, left:-100 }} />
      <div className="blob-cid2" style={{ width:300, height:300, bottom:-50, right:-50, animationDelay:'-5s' }} />
      <div className="max-w-3xl mx-auto px-4 pt-2 pb-12 relative z-10">

        <div className="mb-4">
          <Link to="/homepage" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
            <ArrowLeft size={16} /> Back to Test Cases
          </Link>
        </div>

        {/* Title */}
        <input
          type="text"
          value={draft.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Test case title…"
          className="w-full text-3xl font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground mb-2 focus:underline decoration-muted-foreground/40"
        />

        {/* Summary */}
        <textarea
          value={draft.summary}
          onChange={(e) => patch({ summary: e.target.value })}
          placeholder="Add a description…"
          rows={2}
          className="w-full text-lg text-muted-foreground bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/50 mb-3 focus:underline decoration-muted-foreground/40"
        />

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-3">
          <span>Created {formatDate(tc.createdAt)}</span>
          <span>·</span>
          <span>Updated {formatDate(tc.updatedAt)}</span>
        </div>

        {/* Priority */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">Priority:</span>
          {PRIORITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => patch({ priority: opt.value })}
              className={`text-xs px-3 py-1 rounded-full font-medium capitalize transition-opacity ${draft.priority === opt.value ? 'opacity-100 ring-2 ring-offset-1 ring-current' : 'opacity-50 hover:opacity-80'}`} style={opt.style}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Project */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground">Project:</span>
          <ProjectPicker
            projectId={draft.projectId ?? null}
            onChange={(id) => patch({ projectId: id })}
            projects={projects}
          />
        </div>

        {/* Tags */}
        <div className="mb-6">
          <p className="text-sm font-medium text-foreground mb-2">Tags</p>
          <TagInput tags={draft.tags} onChange={(tags) => patch({ tags })} />
        </div>

        {/* Objective */}
        <section className="mb-6 rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 className="text-lg font-semibold mb-3">Objective</h2>
          <div className="rounded-lg border border-border bg-card p-4">
            <textarea
              value={draft.objective}
              onChange={(e) => patch({ objective: e.target.value })}
              placeholder="Describe the objective of this test case…"
              rows={4}
              className="w-full text-sm text-foreground bg-transparent outline-none resize-none placeholder:text-muted-foreground/60 transition-colors"
            />
          </div>
        </section>

        {/* Preconditions */}
        <section className="mb-6 rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 className="text-lg font-semibold mb-3">Preconditions</h2>
          <div className="rounded-lg border border-border bg-card p-4">
            <ul className="space-y-2 mb-3">
              {draft.preconditions.map((item, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-muted-foreground select-none">•</span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updatePrecondition(i, e.target.value)}
                    placeholder="Add a precondition…"
                    className="flex-1 text-sm bg-transparent border-b border-border outline-none text-foreground placeholder:text-muted-foreground/50 py-0.5 focus:border-foreground transition-colors"
                  />
                  <button onClick={() => removePrecondition(i)} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"><X size={14} /></button>
                </li>
              ))}
            </ul>
            <button onClick={addPrecondition} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Plus size={14} /> Add Precondition
            </button>
          </div>
        </section>

        {/* Test cases */}
        <section className="rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <h2 className="text-lg font-semibold mb-4">Test Cases</h2>
          {draft.testCases.map((sub, i) => (
            <SubTCEditor
              key={sub.id}
              tc={sub}
              index={i}
              onChange={updateSubTC}
              onRemove={() => removeSubTC(sub.id)}
            />
          ))}
          <button
            onClick={addSubTC}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors w-full justify-center"
          >
            <Plus size={14} /> Add Test Case
          </button>
        </section>

        {/* Bottom Done button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleDone}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
            style={doneButtonStyle}
          >
            <Check size={15} /> Done
          </button>
        </div>

      </div>
    </div>
  )
}

// ── Root component ────────────────────────────────────────────────────────────

function CustomTestCaseDetail() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { tc, ready } = useCustomTestCase(id)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (ready && tc === undefined) navigate({ to: '/homepage' })
  }, [ready, tc, navigate])

  if (!ready || !tc) return null

  if (editing) return <EditMode tc={tc} onDone={() => setEditing(false)} />
  return <ViewMode tc={tc} onEdit={() => setEditing(true)} />
}
