import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, X, Plus, FolderOpen, ChevronDown, Sparkles } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { createCustomTestCase, createCustomTC, addCustomTestCase, type CustomTestCase, type CustomTC } from '@/lib/customTestCases'
import { useProjects, useActiveProjectId, type Project } from '@/lib/projects'
import { AIFillPanel, type AIFillResult } from '@/components/AIFillPanel'
import { LoadingCurtain } from '@/components/LoadingCurtain'
import { PreconditionAttachments, uploadPreconditionImages, type PendingImage } from '@/components/PreconditionAttachments'

export const Route = createFileRoute('/test-cases/custom/new')({
  component: NewTestCase,
})

const PRIORITY_OPTIONS = [
  { value: 'low'      as const, label: 'Low',      style: { background: 'rgba(22,163,74,0.15)',  color: '#16a34a', border: '1px solid rgba(22,163,74,0.3)'  } },
  { value: 'medium'   as const, label: 'Medium',   style: { background: 'rgba(202,138,4,0.15)',  color: '#ca8a04', border: '1px solid rgba(202,138,4,0.3)'  } },
  { value: 'high'     as const, label: 'High',     style: { background: 'rgba(234,88,12,0.15)',  color: '#ea580c', border: '1px solid rgba(234,88,12,0.3)'  } },
  { value: 'critical' as const, label: 'Critical', style: { background: 'rgba(220,38,38,0.15)',  color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)'  } },
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
    <div className="rounded-lg border border-border bg-card p-4 mb-4">
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
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0" aria-label="Remove test case"><X size={14} /></button>
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
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
        style={{
          background: selected ? 'var(--app-accent-bg)' : 'var(--app-glass)',
          border: '1px solid var(--app-glass-border)',
          color: selected ? 'var(--app-accent-color)' : 'var(--app-text-secondary)',
        }}
      >
        <FolderOpen size={14} style={{ opacity: 0.7 }} />
        <span className="truncate max-w-[200px]">{selected?.name ?? 'No Project'}</span>
        <ChevronDown size={13} className={`opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
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
            onMouseDown={() => { onChange(null); setOpen(false) }}
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
                onMouseDown={() => { onChange(p.id); setOpen(false) }}
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
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

function NewTestCase() {
  const navigate = useNavigate()
  const { projects } = useProjects()
  const [activeProjectId] = useActiveProjectId()

  const [draft, setDraft] = useState<Omit<CustomTestCase, 'id' | 'createdAt' | 'updatedAt'>>({
    title: '',
    summary: '',
    tags: [],
    objective: '',
    preconditions: [],
    priority: 'medium',
    testCases: [],
    notes: '',
    projectId: null,
  })
  const [titleError, setTitleError] = useState<string | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [pendingPrecondImages, setPendingPrecondImages] = useState<PendingImage[]>([])

  // Default to whatever project is currently active on the homepage
  useEffect(() => {
    if (activeProjectId !== null && draft.projectId === null) {
      setDraft((prev) => ({ ...prev, projectId: activeProjectId }))
    }
  }, [activeProjectId])

  const patch = (fields: Partial<typeof draft>) => {
    setDraft((prev) => ({ ...prev, ...fields }))
    if ('title' in fields) setTitleError(null)
  }

  const handleSave = async () => {
    const error = validateTitle(draft.title)
    if (error) { setTitleError(error); return }

    const tc = { ...createCustomTestCase(), ...draft, title: draft.title.trim(), projectId: draft.projectId }
    addCustomTestCase(tc)

    // Upload any pending precondition images now that we have an ID
    if (pendingPrecondImages.length > 0) {
      try {
        await uploadPreconditionImages(`precond:${tc.id}`, pendingPrecondImages)
      } catch {
        // Non-blocking — test case is already saved, images can be re-uploaded manually
        console.error('Failed to upload precondition images')
      }
    }

    navigate({ to: '/test-cases/custom/$id', params: { id: tc.id } })
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

    // Convert extracted images from the AI response to pending precondition images
    if (result.extractedImages && result.extractedImages.length > 0) {
      const pending: PendingImage[] = result.extractedImages.map((img) => {
        const byteChars = atob(img.data)
        const byteArray = new Uint8Array(byteChars.length)
        for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i)
        const blob = new Blob([byteArray], { type: img.contentType })
        const file = new File([blob], img.name, { type: img.contentType })
        return { file, preview: URL.createObjectURL(blob), name: img.name }
      })
      setPendingPrecondImages((prev) => [...prev, ...pending])
    }
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
    <div className="min-h-screen text-foreground overflow-hidden relative" style={{ background: 'var(--app-bg)', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <style>{`
        @keyframes movenew { from { transform: translate(-10%,-10%); } to { transform: translate(20%,20%); } }
        .blob-new { position:absolute; border-radius:50%; background:var(--app-accent-gradient); filter:blur(80px); opacity:0.18; animation:movenew 20s infinite alternate; pointer-events:none; }
      `}</style>
      <div className="blob-new" style={{ width:400, height:400, top:-100, left:-100 }} />
      <div className="blob-new" style={{ width:300, height:300, bottom:-50, right:-50, animationDelay:'-5s' }} />
      <div className="max-w-3xl mx-auto px-4 py-12 relative z-10">

        {/* Back + AI button */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/homepage"
            className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-90"
            style={{ background: 'var(--app-btn-outline-bg)', border: '1px solid var(--app-btn-outline-border)', color: 'var(--app-text)', backdropFilter: 'blur(6px)', boxShadow: '0 2px 10px var(--app-btn-outline-shadow)' }}
          >
            <ArrowLeft size={14} /> Back to Test Cases
          </Link>
          <button
            onClick={() => setAiOpen(true)}
            className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'var(--app-btn-primary)', color: 'var(--app-btn-text)', boxShadow: '0 2px 12px var(--app-btn-primary-shadow)' }}
          >
            <Sparkles size={14} /> AI Test Case Generator
          </button>
        </div>

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
            style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
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

        {/* Project */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-sm text-muted-foreground">Project:</span>
          <ProjectPicker
            projectId={draft.projectId ?? null}
            onChange={(id) => patch({ projectId: id })}
            projects={projects}
          />
        </div>

        {/* Tags */}
        <div className="mb-8">
          <p className="text-sm font-medium text-foreground mb-2">Tags</p>
          <TagInput tags={draft.tags} onChange={(tags) => patch({ tags })} />
        </div>

        {/* Objective */}
        <section className="mb-6 rounded-lg p-4" style={{ background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)' }}>
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
        <section className="mb-6 rounded-lg p-4" style={{ background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)' }}>
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
          </div>
          <PreconditionAttachments
            pendingImages={pendingPrecondImages}
            onPendingChange={setPendingPrecondImages}
          />
        </section>

        {/* Test cases */}
        <section className="mb-6 rounded-lg p-4" style={{ background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)' }}>
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
        <div className="flex items-center justify-center gap-4 mt-2">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: 'var(--app-btn-primary)', color: 'var(--app-btn-text)', boxShadow: '0 2px 12px var(--app-btn-primary-shadow)' }}
          >
            Save Test Case
          </button>
          <Link
            to="/homepage"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: 'rgba(220,38,38,0.12)', color: '#f87171', border: '1px solid rgba(220,38,38,0.3)', backdropFilter: 'blur(6px)' }}
          >
            <X size={14} /> Cancel
          </Link>
        </div>

      </div>

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
