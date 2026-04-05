import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, X, Plus } from 'lucide-react'
import { useState, useRef } from 'react'
import { createCustomTestCase, createCustomTC, addCustomTestCase, type CustomTestCase, type CustomTC } from '@/lib/customTestCases'

export const Route = createFileRoute('/test-cases/custom/new')({
  component: NewTestCase,
})

const PRIORITY_OPTIONS = [
  { value: 'low'      as const, label: 'Low',      style: { background: 'rgba(148,163,184,0.15)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.3)' } },
  { value: 'medium'   as const, label: 'Medium',   style: { background: 'rgba(0,210,255,0.15)',   color: '#00d2ff', border: '1px solid rgba(0,210,255,0.3)'   } },
  { value: 'high'     as const, label: 'High',     style: { background: 'rgba(168,85,247,0.15)',  color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)'  } },
  { value: 'critical' as const, label: 'Critical', style: { background: 'rgba(244,63,142,0.15)',  color: '#f43f8e', border: '1px solid rgba(244,63,142,0.3)'  } },
]

const ALL_EXISTING_TAGS: string[] = []

function validateTitle(title: string): string | null {
  const trimmed = title.trim()
  if (!trimmed) return 'Title is required.'
  if (trimmed.toLowerCase() === 'untitled test case') return '"Untitled Test Case" is not a valid title.'
  return null
}

// ── Tag input ─────────────────────────────────────────────────────────────────

type TagInputProps = { tags: string[]; onChange: (tags: string[]) => void }

function TagInput({ tags, onChange }: TagInputProps) {
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
            <button type="button" onClick={() => remove(tag)} className="hover:text-destructive transition-colors" aria-label={`Remove tag ${tag}`}>
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => { setInput(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? 'Add tags…' : ''}
          className="flex-1 min-w-[80px] text-xs bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
        />
      </div>
      {open && (input || suggestions.length > 0) && (
        <div className="absolute top-full left-0 mt-1 z-50 min-w-[180px] max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-md">
          {suggestions.length > 0
            ? suggestions.map((tag) => (
                <button key={tag} type="button" onMouseDown={() => add(tag)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors text-foreground">
                  {tag}
                </button>
              ))
            : input && (
                <button type="button" onMouseDown={() => add(input)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors text-muted-foreground">
                  Add "{input}"
                </button>
              )}
        </div>
      )}
    </div>
  )
}

// ── Sub-test case editor ──────────────────────────────────────────────────────

function SubTCEditor({ tc, onChange, onRemove, index }: { tc: CustomTC; onChange: (tc: CustomTC) => void; onRemove: () => void; index: number }) {
  const patch = (fields: Partial<CustomTC>) => onChange({ ...tc, ...fields })
  const addStep = () => patch({ steps: [...tc.steps, ''] })
  const updateStep = (i: number, v: string) => { const next = [...tc.steps]; next[i] = v; patch({ steps: next }) }
  const removeStep = (i: number) => patch({ steps: tc.steps.filter((_, idx) => idx !== i) })

  return (
    <div className="rounded-lg p-4 mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <input
          type="text"
          value={tc.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder={`TC-0${index + 1} — Test case name`}
          className="flex-1 text-sm font-semibold bg-transparent border-b border-border outline-none text-foreground placeholder:text-muted-foreground/50 py-0.5 focus:border-foreground transition-colors"
        />
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0 mt-0.5" aria-label="Remove test case"><X size={14} /></button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className="text-xs text-muted-foreground">Priority:</span>
        {PRIORITY_OPTIONS.map((opt) => (
          <button key={opt.value} onClick={() => patch({ priority: opt.value })} className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize transition-opacity ${tc.priority === opt.value ? 'opacity-100 ring-1 ring-offset-1 ring-current' : 'opacity-40 hover:opacity-70'}`} style={opt.style}>{opt.label}</button>
        ))}
      </div>
      <div className="mb-3">
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Steps</p>
        <ol className="space-y-1.5">
          {tc.steps.map((step, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-5 flex-shrink-0 text-right">{i + 1}.</span>
              <input type="text" value={step} onChange={(e) => updateStep(i, e.target.value)} placeholder="Describe the step…" className="flex-1 text-sm bg-transparent border-b border-border outline-none text-foreground placeholder:text-muted-foreground/50 py-0.5 focus:border-foreground transition-colors" />
              {tc.steps.length > 1 && <button onClick={() => removeStep(i)} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"><X size={12} /></button>}
            </li>
          ))}
        </ol>
        <button onClick={addStep} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2"><Plus size={12} /> Add Step</button>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Expected Result</p>
        <input type="text" value={tc.expected} onChange={(e) => patch({ expected: e.target.value })} placeholder="What should happen…" className="w-full text-sm bg-transparent border-b border-border outline-none text-foreground placeholder:text-muted-foreground/50 py-0.5 focus:border-foreground transition-colors" />
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

function NewTestCase() {
  const navigate = useNavigate()

  const [draft, setDraft] = useState<Omit<CustomTestCase, 'id' | 'createdAt' | 'updatedAt'>>({
    title: '',
    summary: '',
    tags: [],
    objective: '',
    preconditions: [],
    priority: 'medium',
    testCases: [],
  })
  const [titleError, setTitleError] = useState<string | null>(null)

  const patch = (fields: Partial<typeof draft>) => {
    setDraft((prev) => ({ ...prev, ...fields }))
    if ('title' in fields) setTitleError(null)
  }

  const handleSave = () => {
    const error = validateTitle(draft.title)
    if (error) { setTitleError(error); return }

    const tc = { ...createCustomTestCase(), ...draft, title: draft.title.trim() }
    addCustomTestCase(tc)
    navigate({ to: '/test-cases/custom/$id', params: { id: tc.id } })
  }

  const addPrecondition = () => patch({ preconditions: [...draft.preconditions, ''] })

  const updatePrecondition = (i: number, value: string) => {
    const next = [...draft.preconditions]
    next[i] = value
    patch({ preconditions: next })
  }

  const removePrecondition = (i: number) =>
    patch({ preconditions: draft.preconditions.filter((_, idx) => idx !== i) })

  return (
    <div className="min-h-screen text-foreground overflow-hidden relative" style={{ background: '#0f0c29', fontFamily: "'Poppins', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
        @keyframes movenew { from { transform: translate(-10%,-10%); } to { transform: translate(20%,20%); } }
        .blob-new { position:absolute; border-radius:50%; background:linear-gradient(45deg,#6a11cb,#00d2ff); filter:blur(80px); opacity:0.3; animation:movenew 20s infinite alternate; pointer-events:none; }
      `}</style>
      <div className="blob-new" style={{ width:400, height:400, top:-100, left:-100 }} />
      <div className="blob-new" style={{ width:300, height:300, bottom:-50, right:-50, animationDelay:'-5s' }} />
      <div className="max-w-3xl mx-auto px-4 py-12 relative z-10">

        {/* Back */}
        <Link to="/homepage" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft size={16} />
          Back to Test Cases
        </Link>

        {/* Title */}
        <div className="mb-2">
          <input
            type="text"
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            placeholder="Test case title…"
            autoFocus
            className={`w-full text-3xl font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground focus:underline decoration-muted-foreground/40 ${titleError ? 'text-destructive placeholder:text-destructive/50' : ''}`}
          />
          {titleError && (
            <p className="text-sm text-destructive mt-1">{titleError}</p>
          )}
        </div>

        {/* Summary */}
        <textarea
          value={draft.summary}
          onChange={(e) => patch({ summary: e.target.value })}
          placeholder="Add a description…"
          rows={2}
          className="w-full text-lg text-muted-foreground bg-transparent border-none outline-none resize-none placeholder:text-muted-foreground/50 mb-4 focus:underline decoration-muted-foreground/40"
        />

        {/* Priority */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
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

        {/* Tags */}
        <div className="mb-8">
          <p className="text-sm font-medium text-foreground mb-2">Tags</p>
          <TagInput tags={draft.tags} onChange={(tags) => patch({ tags })} />
        </div>

        <hr className="border-border mb-8" />

        {/* Objective */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Objective</h2>
          <textarea
            value={draft.objective}
            onChange={(e) => patch({ objective: e.target.value })}
            placeholder="Describe the objective of this test case…"
            rows={4}
            className="w-full text-sm text-foreground rounded-md px-3 py-2 outline-none resize-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60 transition-colors" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </section>

        <hr className="border-border mb-8" />

        {/* Preconditions */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">Preconditions</h2>
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
                <button onClick={() => removePrecondition(i)} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0" aria-label="Remove precondition">
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
          <button onClick={addPrecondition} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Plus size={14} />
            Add Precondition
          </button>
        </section>

        <hr className="border-border mb-8" />

        {/* Test cases */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4">Test Cases</h2>
          {draft.testCases.map((sub, i) => (
            <SubTCEditor
              key={sub.id}
              tc={sub}
              index={i}
              onChange={(updated) => patch({ testCases: draft.testCases.map((s) => s.id === updated.id ? updated : s) })}
              onRemove={() => patch({ testCases: draft.testCases.filter((s) => s.id !== sub.id) })}
            />
          ))}
          <button
            type="button"
            onClick={() => patch({ testCases: [...draft.testCases, createCustomTC()] })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors w-full justify-center"
          >
            <Plus size={14} /> Add Test Case
          </button>
        </section>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Save Test Case
          </button>
          <Link to="/homepage" className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </Link>
        </div>

      </div>
    </div>
  )
}
