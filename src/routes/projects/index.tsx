import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useProjects, createProject, updateProject, deleteProject, setProjectHealth, type Project, type CreateProjectPayload } from '@/lib/projects'
import { useHasPermission } from '@/lib/permissions'
import { LoadingCurtain } from '@/components/LoadingCurtain'
import { useState, useMemo, useEffect, useRef, memo } from 'react'
import {
  Plus, Pencil, Trash2, Calendar, FolderOpen, X, ChevronDown, Filter, User as UserIcon, Tag as TagIcon, ArrowUpDown,
  Eye, Users as UsersIcon, ArrowRight, BookOpen, Clipboard, Package, Shield, Search, Lock, Check, ChevronRight,
} from 'lucide-react'
import {
  PageShell, EyebrowChip, Pill, Button, Avatar, colorForName,
} from '@/components/design/primitives'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, type DragEndEvent,
} from '@dnd-kit/core'

export const Route = createFileRoute('/projects/')({
  component: ProjectsPage,
})

/* ── Derived health ──────────────────────────────────────────────── */

type Health = 'on-track' | 'at-risk' | 'blocked'

function healthForProject(p: Project): Health {
  // Prefer the stored override (set by drag-and-drop) when present
  if (p.health === 'on-track' || p.health === 'at-risk' || p.health === 'blocked') {
    return p.health
  }
  if (!p.deadline) return 'on-track'
  const now = Date.now()
  const dl = new Date(p.deadline).getTime()
  if (Number.isNaN(dl)) return 'on-track'
  if (dl < now) return 'blocked'
  const daysLeft = Math.ceil((dl - now) / (1000 * 60 * 60 * 24))
  if (daysLeft <= 7) return 'at-risk'
  return 'on-track'
}

function progressForProject(p: Project): number {
  if (!p.timelineStart || !p.timelineEnd) return 0
  const s = new Date(p.timelineStart).getTime()
  const e = new Date(p.timelineEnd).getTime()
  const now = Date.now()
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return 0
  return Math.min(100, Math.max(0, Math.round(((now - s) / (e - s)) * 100)))
}

const HEALTH_META: Record<Health, { label: string; dot: string; tone: 'green' | 'amber' | 'red' }> = {
  'on-track': { label: 'On track', dot: 'var(--green)', tone: 'green' },
  'at-risk':  { label: 'At risk',  dot: 'var(--amber)', tone: 'amber' },
  'blocked':  { label: 'Blocked',  dot: 'var(--red)',   tone: 'red' },
}

/* ── Create / Edit modal — 3-step stepper ───────────────────────── */

type ProjectType = 'ba' | 'test' | 'release' | 'audit' | 'discovery' | 'blank'

type ProjectFormData = {
  name: string
  description: string
  projectType: ProjectType
  tags: string[]
  timelineStart: string
  timelineEnd: string
  deadline: string
  priority: 'low' | 'med' | 'high' | 'critical'
  visibility: 'team' | 'private' | 'public'
  color: string
  template: 'blank' | 'regression' | 'feature' | 'compliance'
  sprintId: string | null
  autoRaid: boolean
  notifyTeam: boolean
}

const COLOR_SWATCHES = ['#7C5CFF', '#E85AA8', '#F28B3B', '#1E9F6E', '#3A6DF0', '#D8433B']

const PROJ_TYPES = [
  { id: 'ba' as const,        label: 'BA Story',   IconComp: BookOpen,   color: '#7B5CFF' },
  { id: 'test' as const,      label: 'Test plan',  IconComp: Clipboard,  color: '#FF6FB5' },
  { id: 'release' as const,   label: 'Release',    IconComp: Package,    color: '#FF8A4C' },
  { id: 'audit' as const,     label: 'Compliance', IconComp: Shield,     color: '#3DC08D' },
  { id: 'discovery' as const, label: 'Discovery',  IconComp: Search,     color: '#4F8CFF' },
  { id: 'blank' as const,     label: 'Blank',      IconComp: FolderOpen, color: '#8C857B' },
]

const PRIORITY_CONFIGS = [
  { value: 'low' as const,      label: 'Low',      tone: '#8C857B' },
  { value: 'med' as const,      label: 'Medium',   tone: '#4F8CFF' },
  { value: 'high' as const,     label: 'High',     tone: '#E0A93B' },
  { value: 'critical' as const, label: 'Critical', tone: '#D9534F' },
]

const VISIBILITY_CONFIGS = [
  { value: 'team' as const,    label: 'Team',    IconComp: UsersIcon },
  { value: 'private' as const, label: 'Private', IconComp: Lock },
  { value: 'public' as const,  label: 'Public',  IconComp: Eye },
]

const TAG_SUGGESTIONS = ['regression', 'compliance', 'Q2-2026', 'billing', 'auth', 'checkout', 'onboarding', 'high-risk']

const MOCK_SPRINTS = [
  { id: 's-12', label: 'Sprint 12 — Apr 21 → May 5', active: true },
  { id: 's-11', label: 'Sprint 11 — Apr 7 → Apr 21',  active: false },
  { id: 's-10', label: 'Sprint 10 — Mar 24 → Apr 7',  active: false },
]

const STEP_META = [
  { label: 'Basics' },
  { label: 'Scope' },
  { label: 'Team' },
] as const

/* ── Modal atoms ─────────────────────────────────────────────────── */

const modalInputStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  background: 'var(--panel-2)',
  borderRadius: 10,
  padding: '9px 12px',
  fontSize: 13.5,
  color: 'var(--ink)',
  fontFamily: 'inherit',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  transition: 'border-color .15s, background .15s',
}

function ModalField({ label, required, children, hint, half }: {
  label: string
  required?: boolean
  children: React.ReactNode
  hint?: string
  half?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: half ? 1 : 'initial' }}>
      <label className="tz-mono" style={{ fontSize: 10.5, color: 'var(--mute)', letterSpacing: '0.08em', fontWeight: 600 }}>
        {label} {required && <span style={{ color: 'var(--purple)' }}>*</span>}
      </label>
      {children}
      {hint && <span style={{ fontSize: 11, color: 'var(--mute-2)' }}>{hint}</span>}
    </div>
  )
}

function ModalInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{ ...modalInputStyle, ...(props.style || {}) }}
      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--purple)'; e.currentTarget.style.background = 'var(--panel)' }}
      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--panel-2)' }}
    />
  )
}

function ModalTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{ ...modalInputStyle, minHeight: 80, resize: 'vertical', fontFamily: 'inherit', ...(props.style || {}) }}
      onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--purple)'; e.currentTarget.style.background = 'var(--panel)' }}
      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--panel-2)' }}
    />
  )
}

function StepSectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="tz-mono" style={{ fontSize: 10.5, color: 'var(--mute)', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>
      {children}
    </div>
  )
}

function SegBtn({ active, onClick, children, StartIcon, tone }: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  StartIcon?: React.ComponentType<{ size?: number }>
  tone?: string
}) {
  const accent = tone ?? 'var(--purple)'
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        border: active ? `1.5px solid ${accent}` : '1px solid var(--border)',
        background: active ? `color-mix(in oklab, ${accent} 8%, var(--panel))` : 'var(--panel-2)',
        color: active ? 'var(--ink)' : 'var(--ink-2)',
        borderRadius: 8, padding: '8px 0', fontSize: 12.5, fontWeight: active ? 600 : 500,
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        fontFamily: 'inherit',
      }}
    >
      {StartIcon && <StartIcon size={11} />}{children}
    </button>
  )
}

/* ── Stepper modal ───────────────────────────────────────────────── */

function ProjectFormModal({
  initial, onSave, onClose,
}: {
  initial?: Project
  onSave: (data: ProjectFormData) => Promise<void>
  onClose: () => void
}) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState<ProjectFormData>({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    projectType: 'ba',
    tags: initial?.tags ?? [],
    timelineStart: initial?.timelineStart ?? '',
    timelineEnd: initial?.timelineEnd ?? '',
    deadline: initial?.deadline ?? '',
    priority: initial?.priority ?? 'med',
    visibility: initial?.visibility ?? 'team',
    color: initial?.color ?? COLOR_SWATCHES[0],
    template: initial?.template ?? 'blank',
    sprintId: initial?.sprintId ?? null,
    autoRaid: initial?.autoRaid ?? true,
    notifyTeam: initial?.notifyTeam ?? true,
  })
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [sprintOpen, setSprintOpen] = useState(false)
  const sprintRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (!sprintOpen) return
    const onClick = (e: MouseEvent) => {
      if (sprintRef.current && !sprintRef.current.contains(e.target as Node)) setSprintOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [sprintOpen])

  const addTag = (t: string) => {
    const trimmed = t.trim()
    if (trimmed && !form.tags.includes(trimmed)) setForm((f) => ({ ...f, tags: [...f.tags, trimmed] }))
    setTagInput('')
  }
  const removeTag = (tag: string) => setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== tag) }))

  const submit = async () => {
    if (!form.name.trim()) { setError('Project name is required'); return }
    setSaving(true); setError('')
    try {
      await onSave(form)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const currentSprint = MOCK_SPRINTS.find((s) => s.id === form.sprintId) ?? null

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'color-mix(in oklab, var(--ink) 30%, transparent)',
        backdropFilter: 'blur(4px)',
        display: 'grid', placeItems: 'center', padding: 20,
        animation: 'fadeUp .2s ease both',
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 580,
          maxHeight: 'calc(100vh - 40px)',
          display: 'flex', flexDirection: 'column',
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 16, boxShadow: 'var(--shadow-md)', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '16px 22px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <span
              className="grad-purple"
              style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0, display: 'grid', placeItems: 'center', color: 'white' }}
            >
              <FolderOpen size={17} />
            </span>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
                {initial ? 'Edit project' : 'Create new project'}
              </h2>
              <p style={{ fontSize: 12, color: 'var(--mute)', margin: '1px 0 0' }}>
                Step {step + 1} of {STEP_META.length} · {STEP_META[step].label}
              </p>
            </div>
            <button onClick={onClose} className="tz-btn tz-btn-ghost" style={{ padding: 6 }}>
              <X size={13} />
            </button>
          </div>

          {/* Stepper rail */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 4 }}>
            {STEP_META.map((s, i) => {
              const done = i < step
              const active = i === step
              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => setStep(i)}
                  style={{
                    border: 0, background: 'transparent', padding: '4px 0 14px',
                    cursor: 'pointer', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', gap: 8,
                    borderBottom: active
                      ? '2px solid var(--purple)'
                      : done
                      ? '2px solid var(--green)'
                      : '2px solid var(--border)',
                    color: active ? 'var(--ink)' : done ? 'var(--green)' : 'var(--mute)',
                  }}
                >
                  <span
                    style={{
                      width: 22, height: 22, borderRadius: 999, flexShrink: 0,
                      background: done ? 'var(--green)' : active ? 'var(--purple)' : 'var(--panel-2)',
                      color: done || active ? 'white' : 'var(--mute)',
                      border: done || active ? 'none' : '1px solid var(--border)',
                      display: 'grid', placeItems: 'center',
                      fontSize: 11, fontWeight: 700,
                    }}
                  >
                    {done ? <Check size={11} /> : i + 1}
                  </span>
                  <span style={{ fontSize: 12.5, fontWeight: active ? 600 : 500 }}>{s.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18, flex: 1, overflowY: 'auto', minHeight: 320 }}>
          {error && (
            <div style={{
              padding: '10px 12px', borderRadius: 10, fontSize: 13,
              background: 'color-mix(in oklab, var(--red) 10%, transparent)',
              border: '1px solid color-mix(in oklab, var(--red) 30%, transparent)',
              color: 'var(--red)',
            }}>
              {error}
            </div>
          )}

          {/* ── Step 0: Basics ── */}
          {step === 0 && (
            <>
              <div>
                <StepSectionLabel>PROJECT TYPE</StepSectionLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {PROJ_TYPES.map((t) => {
                    const active = form.projectType === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, projectType: t.id }))}
                        style={{
                          border: active ? `1.5px solid ${t.color}` : '1px solid var(--border)',
                          background: active ? `color-mix(in oklab, ${t.color} 7%, var(--panel))` : 'var(--panel-2)',
                          borderRadius: 9, padding: '9px 10px',
                          display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                          textAlign: 'left', fontFamily: 'inherit', fontSize: 12.5,
                        }}
                      >
                        <span style={{
                          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                          background: `color-mix(in oklab, ${t.color} 16%, var(--panel))`,
                          color: t.color, display: 'grid', placeItems: 'center',
                        }}>
                          <t.IconComp size={12} />
                        </span>
                        <span style={{ fontWeight: active ? 600 : 500, color: active ? 'var(--ink)' : 'var(--ink-2)' }}>
                          {t.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <ModalField label="PROJECT NAME" required>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {COLOR_SWATCHES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, color: c }))}
                        style={{
                          width: 30, height: 30, borderRadius: 8,
                          border: form.color === c ? `2px solid ${c}` : '1px solid var(--border)',
                          background: c, cursor: 'pointer', padding: 0,
                          boxShadow: form.color === c ? `0 0 0 2px color-mix(in oklab, ${c} 25%, transparent)` : 'none',
                        }}
                        aria-label={`Color ${c}`}
                      />
                    ))}
                  </div>
                  <ModalInput
                    placeholder="e.g. Sprint 12 Regression"
                    value={form.name}
                    autoFocus
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
              </ModalField>

              <ModalField label="DESCRIPTION">
                <ModalTextarea
                  placeholder="What is this project about? Goals, scope, key milestones…"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </ModalField>
            </>
          )}

          {/* ── Step 1: Scope ── */}
          {step === 1 && (
            <>
              <div>
                <StepSectionLabel>PRIORITY</StepSectionLabel>
                <div style={{ display: 'flex', gap: 4 }}>
                  {PRIORITY_CONFIGS.map((p) => (
                    <SegBtn
                      key={p.value}
                      active={form.priority === p.value}
                      onClick={() => setForm((f) => ({ ...f, priority: p.value }))}
                      tone={p.tone}
                    >
                      {p.label}
                    </SegBtn>
                  ))}
                </div>
              </div>

              <div>
                <StepSectionLabel>VISIBILITY</StepSectionLabel>
                <div style={{ display: 'flex', gap: 4 }}>
                  {VISIBILITY_CONFIGS.map((o) => (
                    <SegBtn
                      key={o.value}
                      active={form.visibility === o.value}
                      onClick={() => setForm((f) => ({ ...f, visibility: o.value }))}
                      StartIcon={o.IconComp}
                    >
                      {o.label}
                    </SegBtn>
                  ))}
                </div>
              </div>

              <ModalField label="TAGS" hint="Click suggestions or type your own">
                <div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <ModalInput
                      placeholder="Add a tag…"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) } }}
                    />
                    <button type="button" onClick={() => addTag(tagInput)} className="tz-btn" style={{ flexShrink: 0 }}>Add</button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                    {form.tags.map((t) => (
                      <span
                        key={t}
                        style={{
                          fontSize: 11.5, padding: '3px 4px 3px 9px', borderRadius: 999,
                          background: 'color-mix(in oklab, var(--purple) 12%, var(--panel))',
                          color: 'var(--purple)', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600,
                        }}
                      >
                        <TagIcon size={9} /> {t}
                        <button
                          type="button"
                          onClick={() => removeTag(t)}
                          style={{ border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer', padding: 2, display: 'inline-flex', borderRadius: 999 }}
                        >
                          <X size={9} />
                        </button>
                      </span>
                    ))}
                    {TAG_SUGGESTIONS.filter((s) => !form.tags.includes(s)).slice(0, 4).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => addTag(s)}
                        style={{
                          fontSize: 11.5, padding: '3px 9px', borderRadius: 999,
                          background: 'var(--panel-2)', border: '1px dashed var(--border)',
                          color: 'var(--mute)', cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              </ModalField>

              <div style={{ display: 'flex', gap: 14 }}>
                <ModalField label="TIMELINE START" half>
                  <ModalInput
                    type="date"
                    value={form.timelineStart}
                    onChange={(e) => setForm((f) => ({ ...f, timelineStart: e.target.value }))}
                  />
                </ModalField>
                <ModalField label="TIMELINE END" half>
                  <ModalInput
                    type="date"
                    value={form.timelineEnd}
                    onChange={(e) => setForm((f) => ({ ...f, timelineEnd: e.target.value }))}
                  />
                </ModalField>
              </div>
            </>
          )}

          {/* ── Step 2: Team ── */}
          {step === 2 && (
            <ModalField label="SPRINT" hint="Optional — link to an active sprint to sync stories and dates.">
              <div ref={sprintRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setSprintOpen((o) => !o)}
                  style={{ ...modalInputStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', textAlign: 'left' }}
                >
                  <span style={{
                    width: 6, height: 6, borderRadius: 999, flexShrink: 0,
                    background: currentSprint?.active ? 'var(--green)' : 'var(--mute)',
                  }} />
                  <span style={{ flex: 1 }}>{currentSprint ? currentSprint.label : 'No sprint linked'}</span>
                  <ChevronDown size={11} style={{ color: 'var(--mute)', flexShrink: 0 }} />
                </button>
                {sprintOpen && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
                    background: 'var(--panel)', border: '1px solid var(--border)',
                    borderRadius: 10, boxShadow: 'var(--shadow-md)', padding: 4, zIndex: 5,
                  }}>
                    <button
                      type="button"
                      onClick={() => { setForm((f) => ({ ...f, sprintId: null })); setSprintOpen(false) }}
                      style={{
                        width: '100%', textAlign: 'left', border: 0,
                        background: form.sprintId === null ? 'color-mix(in oklab, var(--purple) 8%, var(--panel))' : 'transparent',
                        borderRadius: 7, padding: '8px 10px', fontSize: 12.5, cursor: 'pointer',
                        fontFamily: 'inherit', color: 'var(--mute)', display: 'flex', alignItems: 'center', gap: 8,
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--border)', flexShrink: 0 }} />
                      No sprint
                    </button>
                    {MOCK_SPRINTS.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => { setForm((f) => ({ ...f, sprintId: s.id })); setSprintOpen(false) }}
                        style={{
                          width: '100%', textAlign: 'left', border: 0,
                          background: form.sprintId === s.id ? 'color-mix(in oklab, var(--purple) 8%, var(--panel))' : 'transparent',
                          borderRadius: 7, padding: '8px 10px', fontSize: 12.5, cursor: 'pointer',
                          fontFamily: 'inherit', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8,
                        }}
                        onMouseEnter={(e) => { if (form.sprintId !== s.id) e.currentTarget.style.background = 'var(--chip)' }}
                        onMouseLeave={(e) => { if (form.sprintId !== s.id) e.currentTarget.style.background = 'transparent' }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: 999, background: s.active ? 'var(--green)' : 'var(--mute)', flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{s.label}</span>
                        {s.active && (
                          <span className="tz-mono" style={{ fontSize: 9.5, color: 'var(--green)', fontWeight: 600 }}>ACTIVE</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </ModalField>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 22px', borderTop: '1px solid var(--border)',
            background: 'var(--panel-2)',
            display: 'flex', alignItems: 'center', gap: 10,
            flexShrink: 0,
          }}
        >
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="tz-btn"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <ChevronRight size={11} style={{ transform: 'rotate(180deg)' }} /> Back
            </button>
          )}
          <span style={{ flex: 1 }} />
          <button type="button" onClick={onClose} className="tz-btn">Cancel</button>
          {step < STEP_META.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={step === 0 && !form.name.trim()}
              className="tz-btn tz-btn-gradient"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              Continue <ChevronRight size={11} />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="tz-btn tz-btn-gradient"
            >
              {saving ? 'Saving…' : initial ? 'Save changes' : <><span>Create project</span> <ArrowRight size={13} /></>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Delete confirm ──────────────────────────────────────────────── */

function DeleteConfirmModal({
  project, onConfirm, onClose,
}: {
  project: Project; onConfirm: () => void; onClose: () => void
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50, display: 'grid', placeItems: 'center', padding: 20,
        background: 'color-mix(in oklab, var(--ink) 28%, transparent)', backdropFilter: 'blur(4px)',
      }}
      onMouseDown={onClose}
    >
      <div
        className="panel"
        style={{ width: '100%', maxWidth: 420, padding: 22, boxShadow: '0 24px 60px rgba(20,20,40,0.18)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', margin: '0 0 8px' }}>Delete project</h3>
        <p style={{ fontSize: 13, color: 'var(--mute)', margin: '0 0 18px', lineHeight: 1.5 }}>
          Permanently delete <strong style={{ color: 'var(--ink)' }}>"{project.name}"</strong>? All test plans and stories in this project will also be deleted. This can't be undone.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <Button onClick={onClose}>Cancel</Button>
          <button type="button" onClick={onConfirm} className="tz-btn"
            style={{ background: 'var(--red)', color: 'white', border: 'none' }}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Project card (status-board sized) ───────────────────────────── */

const ACCENT_GRADIENTS = [
  'linear-gradient(90deg, var(--purple), var(--pink))',
  'linear-gradient(90deg, var(--pink), var(--orange))',
  'linear-gradient(90deg, var(--orange), var(--amber))',
  'linear-gradient(90deg, var(--blue), var(--purple))',
  'linear-gradient(90deg, var(--green), var(--blue))',
]

function accentGradientForProject(p: Project): string {
  // Prefer the user-picked color when available; mix with a complementary tone
  if (p.color) return `linear-gradient(90deg, ${p.color}, color-mix(in oklab, ${p.color} 40%, var(--purple)))`
  return ACCENT_GRADIENTS[p.id % ACCENT_GRADIENTS.length]
}

function HealthLane({
  health, projects, canCreate, onAdd, onEdit, onDelete,
}: {
  health: Health
  projects: Project[]
  canCreate: boolean
  onAdd: () => void
  onEdit: (p: Project) => void
  onDelete: (p: Project) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: health })
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <ColumnHeader
        tone={health}
        label={HEALTH_META[health].label}
        count={projects.length}
        onAdd={canCreate ? onAdd : undefined}
      />
      <div
        ref={setNodeRef}
        style={{
          display: 'flex', flexDirection: 'column', gap: 12,
          minHeight: 80,
          padding: 4,
          borderRadius: 14,
          background: isOver ? `color-mix(in oklab, ${HEALTH_META[health].dot} 8%, transparent)` : 'transparent',
          border: isOver ? `1px dashed color-mix(in oklab, ${HEALTH_META[health].dot} 40%, transparent)` : '1px dashed transparent',
          transition: 'background .15s, border-color .15s',
        }}
      >
        {projects.length === 0 ? (
          <div
            style={{
              padding: '22px 16px', borderRadius: 12, textAlign: 'center',
              border: '1px dashed var(--border)',
              color: 'var(--mute)', fontSize: 12.5,
            }}
          >
            {isOver ? 'Drop here' : 'No projects here'}
          </div>
        ) : (
          projects.map((p) => (
            <DraggableProjectCard
              key={p.id}
              project={p}
              canEdit={canCreate}
              onEdit={() => onEdit(p)}
              onDelete={() => onDelete(p)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function DraggableProjectCard(props: {
  project: Project; canEdit: boolean; onEdit: () => void; onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: props.project.id })
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    touchAction: 'none',
  }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ProjectCard {...props} />
    </div>
  )
}

const ProjectCard = memo(function ProjectCard({
  project, canEdit, onEdit, onDelete,
}: {
  project: Project; canEdit: boolean; onEdit: () => void; onDelete: () => void
}) {
  const navigate = useNavigate()
  const progress = progressForProject(project)
  const owner = project.createdBy || '—'
  const isOverdue = project.deadline ? new Date(project.deadline).getTime() < Date.now() : false
  const accent = accentGradientForProject(project)

  return (
    <div
      className="panel"
      style={{
        padding: 16,
        paddingTop: 19,
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 12,
        transition: 'transform .15s, box-shadow .15s',
        position: 'relative',
        overflow: 'hidden',
      }}
      onClick={() => navigate({ to: '/projects/$id', params: { id: String(project.id) } })}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '' }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute', inset: '0 0 auto 0', height: 3,
          background: accent,
          borderTopLeftRadius: 'inherit', borderTopRightRadius: 'inherit',
        }}
      />
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <FolderOpen size={15} strokeWidth={1.8} style={{ color: project.color || 'var(--purple)', flexShrink: 0, marginTop: 2 }} />
        <h3 style={{
          flex: 1, minWidth: 0,
          fontSize: 15, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em', margin: 0, lineHeight: 1.35,
          wordBreak: 'break-word',
        }}>{project.name}</h3>
        {canEdit && (
          <div style={{ display: 'flex', gap: 2, flexShrink: 0, opacity: 0.6 }}>
            <CardAction onClick={(e) => { e.stopPropagation(); onEdit() }} title="Edit"><Pencil size={12} /></CardAction>
            <CardAction onClick={(e) => { e.stopPropagation(); onDelete() }} title="Delete"><Trash2 size={12} /></CardAction>
          </div>
        )}
      </div>

      {/* Description */}
      {project.description && (
        <p style={{
          fontSize: 13, color: 'var(--mute)', lineHeight: 1.5, margin: 0,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{project.description}</p>
      )}

      {/* Tags */}
      {project.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {project.tags.slice(0, 3).map((t) => (
            <Pill key={t} tone="neutral">{t}</Pill>
          ))}
          {project.tags.length > 3 && (
            <span style={{ fontSize: 11, color: 'var(--mute)', alignSelf: 'center' }}>+{project.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Progress */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--mute)' }}>
          <span>Timeline</span>
          <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{progress}%</span>
        </div>
        <div
          style={{
            height: 5, borderRadius: 999, overflow: 'hidden',
            background: 'var(--chip)',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: `${progress}%`, height: '100%',
              background: progress >= 85
                ? 'linear-gradient(90deg, var(--green), color-mix(in oklab, var(--green) 60%, var(--blue)))'
                : progress >= 40
                ? 'linear-gradient(90deg, var(--green), var(--amber))'
                : 'linear-gradient(90deg, var(--amber), var(--orange))',
              transition: 'width .3s',
            }}
          />
        </div>
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontFamily: "'JetBrains Mono', monospace",
            color: isOverdue ? 'var(--red)' : 'var(--mute)',
          }}
        >
          <Calendar size={11} />
          {project.deadline
            ? `Due ${new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            : '—'}
        </span>
        <Avatar name={owner} color={colorForName(owner)} size={22} />
      </div>
    </div>
  )
})

function CardAction({
  onClick, title, children,
}: { onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; title: string; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick} title={title}
      style={{ width: 24, height: 24, borderRadius: 6, display: 'inline-grid', placeItems: 'center', background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--mute)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--chip)'; e.currentTarget.style.color = 'var(--ink)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mute)' }}
    >
      {children}
    </button>
  )
}

/* ── Column header ───────────────────────────────────────────────── */

function ColumnHeader({
  tone, label, count, onAdd,
}: { tone: Health; label: string; count: number; onAdd?: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px',
      borderRadius: 12,
      background: 'color-mix(in oklab, var(--panel) 70%, transparent)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-xs)',
    }}>
      <span style={{ width: 8, height: 8, borderRadius: 999, background: HEALTH_META[tone].dot, flexShrink: 0 }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.005em', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--mute)', fontWeight: 600 }}>{count}</span>
      <span style={{ flex: 1 }} />
      {onAdd && (
        <button
          type="button" onClick={onAdd} title="New project in this lane"
          style={{ width: 22, height: 22, borderRadius: 6, background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--mute)', display: 'inline-grid', placeItems: 'center', flexShrink: 0 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--chip)'; e.currentTarget.style.color = 'var(--ink)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--mute)' }}
        >
          <Plus size={13} />
        </button>
      )}
    </div>
  )
}

/* ── Filter pill button ──────────────────────────────────────────── */

function FilterPill({
  icon, label, value, onClear,
}: { icon: React.ReactNode; label: string; value?: string; onClear?: () => void }) {
  const active = !!value
  return (
    <button
      type="button"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 999,
        background: active ? 'color-mix(in oklab, var(--purple) 10%, var(--panel))' : 'var(--panel)',
        border: `1px solid ${active ? 'color-mix(in oklab, var(--purple) 40%, var(--border))' : 'var(--border)'}`,
        color: active ? 'var(--ink)' : 'var(--mute)',
        fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      {icon}
      <span>{active ? value : label}</span>
      {active ? (
        <X size={11} onClick={(e) => { e.stopPropagation(); onClear?.() }} style={{ marginLeft: 2 }} />
      ) : (
        <ChevronDown size={12} />
      )}
    </button>
  )
}

/* ── Main page ───────────────────────────────────────────────────── */

type SortKey = 'updated' | 'created' | 'deadline' | 'name'

function ProjectsPage() {
  const { projects, loading } = useProjects()
  const canCreate = useHasPermission('STAFF_CREATE_PROJECT')
  const [showCreate, setShowCreate] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [sort, setSort] = useState<SortKey>('updated')
  const [sortOpen, setSortOpen] = useState(false)

  const sorted = useMemo(() => {
    const ps = [...projects]
    switch (sort) {
      case 'updated':  ps.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')); break
      case 'created':  ps.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')); break
      case 'deadline': ps.sort((a, b) => (a.deadline || '9999').localeCompare(b.deadline || '9999')); break
      case 'name':     ps.sort((a, b) => a.name.localeCompare(b.name)); break
    }
    return ps
  }, [projects, sort])

  const lanes = useMemo(() => {
    const buckets: Record<Health, Project[]> = { 'on-track': [], 'at-risk': [], 'blocked': [] }
    for (const p of sorted) buckets[healthForProject(p)].push(p)
    return buckets
  }, [sorted])

  const handleCreate = async (data: ProjectFormData) => {
    const payload: CreateProjectPayload = {
      name: data.name.trim(),
      description: data.description.trim(),
      tags: data.tags,
      timelineStart: data.timelineStart || null,
      timelineEnd: data.timelineEnd || null,
      deadline: data.deadline || null,
      priority: data.priority,
      visibility: data.visibility,
      color: data.color,
      template: data.template,
      sprintId: data.sprintId,
      autoRaid: data.autoRaid,
      notifyTeam: data.notifyTeam,
    }
    await createProject(payload)
  }

  const handleEdit = async (data: ProjectFormData) => {
    if (!editingProject) return
    await updateProject(editingProject.id, {
      name: data.name.trim(),
      description: data.description.trim(),
      tags: data.tags,
      timelineStart: data.timelineStart || null,
      timelineEnd: data.timelineEnd || null,
      deadline: data.deadline || null,
      priority: data.priority,
      visibility: data.visibility,
      color: data.color,
      template: data.template,
      sprintId: data.sprintId,
      autoRaid: data.autoRaid,
      notifyTeam: data.notifyTeam,
    })
  }

  const handleDelete = async () => {
    if (!deletingProject) return
    await deleteProject(deletingProject.id)
    setDeletingProject(null)
  }

  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over) return
    const projectId = Number(active.id)
    const targetHealth = String(over.id) as Health
    if (!Number.isFinite(projectId)) return
    if (!['on-track', 'at-risk', 'blocked'].includes(targetHealth)) return
    const project = projects.find((p) => p.id === projectId)
    if (!project) return
    if (healthForProject(project) === targetHealth) return
    setProjectHealth(projectId, targetHealth).catch((err) => {
      console.error('Failed to update health', err)
    })
  }

  if (loading) return <LoadingCurtain visible={true} message="Loading Projects" />

  const sortLabels: Record<SortKey, string> = {
    updated: 'Recently updated',
    created: 'Recently created',
    deadline: 'Deadline',
    name: 'Name',
  }

  return (
    <PageShell>
      {/* Header */}
      <div style={{ paddingTop: 32, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 0, maxWidth: 760 }}>
          <EyebrowChip icon="folder" tone="purple">Workspace</EyebrowChip>
          <h1 className="display" style={{ marginTop: 10, wordBreak: 'break-word' }}>Projects</h1>
          <p className="subhead">Overview of all QA projects. Click a project to see its test plans and stories.</p>
        </div>
        {canCreate && (
          <Button variant="gradient" onClick={() => setShowCreate(true)} style={{ marginTop: 8, whiteSpace: 'nowrap', flexShrink: 0 }}>
            <Plus size={14} /> New Project
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 20 }}>
        <FilterPill icon={<Filter size={12} />} label="Status" />
        <FilterPill icon={<UserIcon size={12} />} label="Owner" />
        <FilterPill icon={<TagIcon size={12} />} label="Tag" />
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setSortOpen((o) => !o)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 999,
              background: 'var(--panel)', border: '1px solid var(--border)',
              color: 'var(--ink)', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500,
              cursor: 'pointer', boxShadow: 'var(--shadow-xs)',
            }}
          >
            <ArrowUpDown size={12} />
            {sortLabels[sort]}
            <ChevronDown size={12} />
          </button>
          {sortOpen && (
            <>
              <div
                onClick={() => setSortOpen(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 40 }}
              />
              <div
                className="panel"
                style={{
                  position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 41,
                  minWidth: 180, padding: 4, boxShadow: '0 12px 28px rgba(20,20,40,0.14)',
                }}
              >
                {(Object.keys(sortLabels) as SortKey[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => { setSort(k); setSortOpen(false) }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 8,
                      background: sort === k ? 'var(--chip)' : 'transparent',
                      color: 'var(--ink)', fontSize: 13, fontWeight: sort === k ? 600 : 400,
                      border: 0, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => { if (sort !== k) e.currentTarget.style.background = 'var(--chip)' }}
                    onMouseLeave={(e) => { if (sort !== k) e.currentTarget.style.background = 'transparent' }}
                  >
                    {sortLabels[k]}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tab strip */}
      <div style={{ marginBottom: 22 }}>
        <div style={{
          display: 'inline-flex', padding: 3, gap: 2, borderRadius: 999,
          background: 'var(--panel)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-xs)',
        }}>
          <button
            type="button"
            style={{
              padding: '8px 18px', borderRadius: 999, border: 0, cursor: 'pointer',
              background: 'linear-gradient(105deg, var(--purple), var(--pink))',
              color: 'white', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}
          >
            <FolderOpen size={13} /> All
            <span style={{ background: 'rgba(255,255,255,0.22)', padding: '1px 7px', borderRadius: 999, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
              {projects.length}
            </span>
          </button>
        </div>
      </div>

      {/* Status board */}
      {projects.length === 0 ? (
        <div
          className="panel"
          style={{ padding: '54px 24px', textAlign: 'center', borderStyle: 'dashed' }}
        >
          <div
            className="section-icon grad-purple"
            style={{ width: 44, height: 44, borderRadius: 12, display: 'inline-grid', placeItems: 'center', color: 'white', margin: '0 auto 12px' }}
          >
            <FolderOpen size={20} />
          </div>
          <p style={{ color: 'var(--ink)', fontWeight: 600, margin: '0 0 4px' }}>No projects yet</p>
          {canCreate && (
            <p style={{ fontSize: 13, color: 'var(--mute)', margin: 0 }}>Click "New Project" to set up your first workstream.</p>
          )}
        </div>
      ) : (
        <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, alignItems: 'flex-start' }}>
            {(['on-track', 'at-risk', 'blocked'] as Health[]).map((h) => (
              <HealthLane
                key={h}
                health={h}
                projects={lanes[h]}
                canCreate={canCreate}
                onAdd={() => setShowCreate(true)}
                onEdit={(p) => setEditingProject(p)}
                onDelete={(p) => setDeletingProject(p)}
              />
            ))}
          </div>
        </DndContext>
      )}

      {showCreate && <ProjectFormModal onSave={handleCreate} onClose={() => setShowCreate(false)} />}
      {editingProject && <ProjectFormModal initial={editingProject} onSave={handleEdit} onClose={() => setEditingProject(null)} />}
      {deletingProject && <DeleteConfirmModal project={deletingProject} onConfirm={handleDelete} onClose={() => setDeletingProject(null)} />}
    </PageShell>
  )
}
