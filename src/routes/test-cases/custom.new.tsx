import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, X, Plus, FolderOpen, ChevronDown, Sparkles, Save, Target, ListChecks, ClipboardList } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { createCustomTestCase, createCustomTC, addCustomTestCase, type CustomTestCase, type CustomTC } from '@/lib/customTestCases'
import { useProjects, useActiveProjectId, type Project } from '@/lib/projects'
import { AIFillPanel, type AIFillResult } from '@/components/AIFillPanel'
import { LoadingCurtain } from '@/components/LoadingCurtain'
import { PreconditionAttachments, uploadPreconditionImages, type PendingImage } from '@/components/PreconditionAttachments'
import { AutoGrowTextarea } from '@/components/AutoGrowTextarea'
import { PageShell, EyebrowChip, Pill, Button } from '@/components/design/primitives'

export const Route = createFileRoute('/test-cases/custom/new')({
  component: NewTestCase,
})

type Priority = 'low' | 'medium' | 'high' | 'critical'

const PRIORITY_OPTIONS: Array<{ value: Priority; label: string; tone: 'green' | 'amber' | 'orange' | 'red' }> = [
  { value: 'low',      label: 'Low',      tone: 'green'  },
  { value: 'medium',   label: 'Medium',   tone: 'amber'  },
  { value: 'high',     label: 'High',     tone: 'orange' },
  { value: 'critical', label: 'Critical', tone: 'red'    },
]

const TONE_STYLE: Record<'green' | 'amber' | 'orange' | 'red', { bg: string; fg: string; ring: string }> = {
  green:  { bg: 'color-mix(in oklab, var(--green) 14%, transparent)',  fg: 'var(--green)',  ring: 'color-mix(in oklab, var(--green) 35%, transparent)' },
  amber:  { bg: 'color-mix(in oklab, var(--amber) 14%, transparent)',  fg: 'var(--amber)',  ring: 'color-mix(in oklab, var(--amber) 35%, transparent)' },
  orange: { bg: 'color-mix(in oklab, var(--orange) 14%, transparent)', fg: 'var(--orange)', ring: 'color-mix(in oklab, var(--orange) 35%, transparent)' },
  red:    { bg: 'color-mix(in oklab, var(--red) 14%, transparent)',    fg: 'var(--red)',    ring: 'color-mix(in oklab, var(--red) 35%, transparent)' },
}

const ALL_EXISTING_TAGS: string[] = []

function validateTitle(title: string): string | null {
  const trimmed = title.trim()
  if (!trimmed) return 'Title is required.'
  if (trimmed.toLowerCase() === 'untitled test case' || trimmed.toLowerCase() === 'untitled test plan') return '"Untitled" is not a valid title.'
  return null
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
    <div style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
          minHeight: 40, padding: '6px 10px',
          borderRadius: 10, border: '1px solid var(--border)',
          background: 'var(--panel)',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 500,
              background: 'var(--chip)', color: 'var(--ink)',
            }}
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              aria-label={`Remove tag ${tag}`}
              style={{ background: 'transparent', border: 'none', color: 'var(--mute)', cursor: 'pointer', padding: 0, display: 'inline-flex' }}
            >
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
          style={{
            flex: 1, minWidth: 100,
            fontSize: 13, fontFamily: 'inherit',
            background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--ink)',
          }}
        />
      </div>
      {open && (input || suggestions.length > 0) && (
        <div
          className="panel"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
            minWidth: 200, maxHeight: 200, overflowY: 'auto',
            padding: 4,
            boxShadow: '0 20px 50px rgba(20,20,40,0.15)',
          }}
        >
          {suggestions.length > 0
            ? suggestions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onMouseDown={() => add(tag)}
                  style={{
                    width: '100%', textAlign: 'left', fontSize: 12,
                    padding: '6px 10px', borderRadius: 8,
                    background: 'transparent', border: 'none', color: 'var(--ink)', cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--panel-2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {tag}
                </button>
              ))
            : input && (
                <button
                  type="button"
                  onMouseDown={() => add(input)}
                  style={{
                    width: '100%', textAlign: 'left', fontSize: 12,
                    padding: '6px 10px', borderRadius: 8,
                    background: 'transparent', border: 'none', color: 'var(--mute)', cursor: 'pointer',
                  }}
                >
                  Add "{input}"
                </button>
              )}
        </div>
      )}
    </div>
  )
}

// ── Priority picker (shared) ─────────────────────────────────────────────────

function PriorityPicker({ value, onChange, size = 'md' }: { value: Priority; onChange: (v: Priority) => void; size?: 'sm' | 'md' }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {PRIORITY_OPTIONS.map((opt) => {
        const selected = value === opt.value
        const tone = TONE_STYLE[opt.tone]
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              fontSize: size === 'sm' ? 10 : 11,
              fontWeight: 600,
              textTransform: 'capitalize',
              padding: size === 'sm' ? '3px 9px' : '4px 11px',
              borderRadius: 999,
              background: selected ? tone.bg : 'transparent',
              color: selected ? tone.fg : 'var(--mute)',
              border: selected ? `1px solid ${tone.ring}` : '1px solid var(--border)',
              cursor: 'pointer',
              transition: 'all .15s ease',
              opacity: selected ? 1 : 0.75,
            }}
          >
            {opt.label}
          </button>
        )
      })}
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
    <div
      style={{
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        background: 'var(--panel-2)',
        border: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span
          style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: 'var(--purple)',
            fontFamily: "'JetBrains Mono', monospace",
            flexShrink: 0,
          }}
        >
          TC-{String(index + 1).padStart(2, '0')}
        </span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <button
          onClick={onRemove}
          aria-label="Remove test case"
          style={{ background: 'transparent', border: 'none', color: 'var(--mute)', cursor: 'pointer', display: 'inline-flex' }}
        >
          <X size={14} />
        </button>
      </div>

      <input
        type="text"
        value={tc.name}
        onChange={(e) => patch({ name: e.target.value })}
        placeholder="Test case name…"
        className="tz-input"
        style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Priority</span>
        <PriorityPicker value={tc.priority} onChange={(v) => patch({ priority: v })} size="sm" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Steps</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {tc.steps.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 22, textAlign: 'center',
                  fontSize: 11, color: 'var(--mute)',
                  fontFamily: "'JetBrains Mono', monospace",
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </span>
              <input
                type="text"
                value={step}
                onChange={(e) => updateStep(i, e.target.value)}
                placeholder="Describe the step…"
                className="tz-input"
                style={{ fontSize: 13 }}
              />
              {tc.steps.length > 1 && (
                <button
                  onClick={() => removeStep(i)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--mute)', cursor: 'pointer', display: 'inline-flex', flexShrink: 0 }}
                  aria-label="Remove step"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={addStep}
          style={{
            marginTop: 8,
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 12, color: 'var(--mute)',
            background: 'transparent', border: 'none', cursor: 'pointer',
          }}
        >
          <Plus size={12} /> Add step
        </button>
      </div>

      <div>
        <div style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Expected result</div>
        <input
          type="text"
          value={tc.expected}
          onChange={(e) => patch({ expected: e.target.value })}
          placeholder="What should happen…"
          className="tz-input"
          style={{ fontSize: 13 }}
        />
      </div>
    </div>
  )
}

// ── Project picker (Canvas-styled) ───────────────────────────────────────────

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
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          fontSize: 13, fontWeight: 500,
          padding: '7px 12px',
          borderRadius: 999,
          background: selected ? 'color-mix(in oklab, var(--purple) 10%, var(--panel))' : 'var(--panel)',
          border: '1px solid var(--border)',
          color: selected ? 'var(--purple)' : 'var(--mute)',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <FolderOpen size={13} />
        <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.name ?? 'No project'}
        </span>
        <ChevronDown size={12} style={{ opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>

      {open && (
        <div
          className="panel"
          style={{
            position: 'absolute', left: 0, top: 'calc(100% + 6px)', zIndex: 50,
            width: 260, padding: 4,
            boxShadow: '0 20px 50px rgba(20,20,40,0.15)',
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
              color: projectId === null ? 'var(--purple)' : 'var(--ink)',
              background: projectId === null ? 'color-mix(in oklab, var(--purple) 10%, transparent)' : 'transparent',
              border: 'none', cursor: 'pointer',
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
                    display: 'flex', alignItems: 'center',
                    padding: '8px 10px',
                    borderRadius: 8,
                    fontSize: 13, fontWeight: active ? 600 : 500,
                    color: active ? 'var(--purple)' : 'var(--ink)',
                    background: active ? 'color-mix(in oklab, var(--purple) 10%, transparent)' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                >
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

// ── Section card ─────────────────────────────────────────────────────────────

function SectionCard({
  icon, gradient, title, subtitle, children,
}: {
  icon: React.ReactNode
  gradient: 'grad-purple' | 'grad-pink' | 'grad-blue' | 'grad-green' | 'grad-orange'
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="panel" style={{ padding: 22, marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span
          className={`section-icon ${gradient}`}
          style={{ width: 32, height: 32, borderRadius: 10, display: 'grid', placeItems: 'center', color: 'white' }}
        >
          {icon}
        </span>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: 'var(--mute)' }}>{subtitle}</div>}
        </div>
      </div>
      {children}
    </section>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

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

  useEffect(() => {
    if (activeProjectId !== null && draft.projectId === null) {
      setDraft((prev) => ({ ...prev, projectId: activeProjectId }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    if (pendingPrecondImages.length > 0) {
      try {
        await uploadPreconditionImages(`precond:${tc.id}`, pendingPrecondImages)
      } catch {
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
    <PageShell>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 20, marginBottom: 14, flexWrap: 'wrap', fontSize: 13, color: 'var(--mute)' }}>
        <Link
          to="/test-suites"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--mute)', textDecoration: 'none' }}
        >
          <ArrowLeft size={13} /> Test Suites
        </Link>
        <span style={{ opacity: 0.5 }}>/</span>
        <span style={{ color: 'var(--ink)', fontWeight: 500 }}>New test case</span>
      </div>

      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'start', marginBottom: 22 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <EyebrowChip icon="clipboard" tone="orange">Test Case</EyebrowChip>
            <ProjectPicker
              projectId={draft.projectId ?? null}
              onChange={(id) => patch({ projectId: id })}
              projects={projects}
            />
          </div>
          <input
            className="tz-title-input"
            style={{
              width: '100%',
              fontFamily: 'inherit',
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              color: 'var(--ink)',
              background: 'transparent',
              border: titleError ? '1px solid var(--red)' : '1px solid transparent',
              borderRadius: 10,
              padding: titleError ? '6px 10px' : '6px 0',
              outline: 'none',
            }}
            placeholder="Test case title"
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            autoFocus
          />
          {titleError && (
            <p style={{ fontSize: 12, color: 'var(--red)', margin: '6px 0 0' }}>{titleError}</p>
          )}
          <AutoGrowTextarea
            value={draft.summary}
            onChange={(e) => patch({ summary: e.target.value })}
            placeholder="Short summary — what does this test case cover?"
            minHeight={40}
            focusMinHeight={120}
            style={{
              width: '100%',
              fontFamily: 'inherit',
              fontSize: 16,
              color: 'var(--mute)',
              background: 'transparent',
              border: '1px solid transparent',
              borderRadius: 10,
              padding: '6px 0',
              marginTop: 6,
              outline: 'none',
              resize: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, paddingTop: 4 }}>
          <Button variant="gradient" onClick={() => setAiOpen(true)}>
            <Sparkles size={14} /> AI Generate
          </Button>
          <Button variant="default" onClick={handleSave}>
            <Save size={14} /> Save
          </Button>
        </div>
      </div>

      {/* Priority + tags row */}
      <div className="panel" style={{ padding: 18, marginBottom: 18, display: 'grid', gap: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Priority</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <PriorityPicker value={draft.priority} onChange={(v) => patch({ priority: v })} />
            <Pill tone="neutral" icon="tag">{draft.tags.length} tag{draft.tags.length === 1 ? '' : 's'}</Pill>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--mute)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Tags</div>
          <TagInput tags={draft.tags} onChange={(tags) => patch({ tags })} />
        </div>
      </div>

      {/* Objective */}
      <SectionCard
        icon={<Target size={16} />}
        gradient="grad-purple"
        title="Objective"
        subtitle="What success looks like for this test case"
      >
        <AutoGrowTextarea
          value={draft.objective}
          onChange={(e) => patch({ objective: e.target.value })}
          placeholder="Describe the objective of this test case…"
          minHeight={90}
          focusMinHeight={200}
          className="tz-input tz-textarea"
          style={{ fontSize: 14 }}
        />
      </SectionCard>

      {/* Preconditions */}
      <SectionCard
        icon={<ListChecks size={16} />}
        gradient="grad-blue"
        title="Preconditions"
        subtitle="Setup required before running the test"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {draft.preconditions.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: 'var(--mute)', userSelect: 'none', fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>•</span>
              <input
                type="text"
                value={item}
                onChange={(e) => updatePrecondition(i, e.target.value)}
                placeholder="Add a precondition…"
                className="tz-input"
                style={{ fontSize: 13 }}
              />
              <button
                onClick={() => removePrecondition(i)}
                aria-label="Remove precondition"
                style={{ background: 'transparent', border: 'none', color: 'var(--mute)', cursor: 'pointer', display: 'inline-flex', flexShrink: 0 }}
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={addPrecondition}
          style={{
            marginTop: 10,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 13, color: 'var(--mute)',
            background: 'transparent', border: 'none', cursor: 'pointer',
          }}
        >
          <Plus size={13} /> Add precondition
        </button>

        <div style={{ marginTop: 14 }}>
          <PreconditionAttachments
            pendingImages={pendingPrecondImages}
            onPendingChange={setPendingPrecondImages}
          />
        </div>
      </SectionCard>

      {/* Test cases */}
      <SectionCard
        icon={<ClipboardList size={16} />}
        gradient="grad-orange"
        title="Test Cases"
        subtitle="One or more sub-cases covered by this plan"
      >
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
          style={{
            width: '100%',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '10px 14px',
            borderRadius: 12,
            border: '1px dashed var(--border-strong)',
            background: 'transparent',
            fontSize: 13, fontWeight: 500, color: 'var(--mute)',
            cursor: 'pointer',
          }}
        >
          <Plus size={13} /> Add test case
        </button>
      </SectionCard>

      {/* Bottom actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8, paddingBottom: 40 }}>
        <Link to="/test-suites" style={{ textDecoration: 'none' }}>
          <Button variant="default">
            <X size={14} /> Cancel
          </Button>
        </Link>
        <Button variant="gradient" onClick={handleSave}>
          <Save size={14} /> Save test case
        </Button>
      </div>

      {aiOpen && (
        <AIFillPanel
          onFill={handleAiFill}
          onClose={() => setAiOpen(false)}
          onLoading={setAiLoading}
        />
      )}

      <LoadingCurtain visible={aiLoading} message="Generating test cases" transparent />
    </PageShell>
  )
}
