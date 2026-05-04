import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useProjects, createProject, updateProject, deleteProject, setProjectHealth, type Project, type CreateProjectPayload } from '@/lib/projects'
import { useHasPermission } from '@/lib/permissions'
import { LoadingCurtain } from '@/components/LoadingCurtain'
import { useState, useMemo } from 'react'
import { useEffect, useRef } from 'react'
import {
  Plus, Pencil, Trash2, Calendar, FolderOpen, X, ChevronDown, Filter, User as UserIcon, Tag as TagIcon, ArrowUpDown,
  FileText, Sparkles, Target, GitBranch, Settings as SettingsIcon, AlertTriangle, Clipboard, BookOpen, Grid3x3,
  CheckCircle2, Lock, Eye, Users as UsersIcon, Link2, Check, ArrowRight,
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

/* ── Create / Edit modal ─────────────────────────────────────────── */

type ProjectFormData = {
  name: string
  description: string
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

/* ── Project modal templates / constants ─────────────────────────── */

type TemplateId = 'blank' | 'regression' | 'feature' | 'compliance'
type TemplatePreviewItem = { icon: React.ReactNode; label: string }

const TEMPLATES: Array<{
  id: TemplateId
  icon: React.ReactNode
  label: string
  desc: string
  color: string
  preview: {
    summary: string
    includes: TemplatePreviewItem[]
    stories: Array<{ title: string; count: number }>
    suites: string[]
  }
}> = [
  {
    id: 'blank',
    icon: <FileText size={14} />,
    label: 'Blank',
    desc: 'Empty project, configure as you go',
    color: 'var(--mute)',
    preview: {
      summary: 'Start with nothing. Add stories, suites, and members manually.',
      includes: [
        { icon: <FolderOpen size={12} />, label: 'Empty workspace' },
        { icon: <SettingsIcon size={12} />, label: 'Default settings only' },
      ],
      stories: [],
      suites: [],
    },
  },
  {
    id: 'regression',
    icon: <GitBranch size={14} />,
    label: 'Sprint regression',
    desc: 'Pre-built suites + RAID log',
    color: 'var(--purple)',
    preview: {
      summary: 'Pre-scaffolds 6 regression suites covering core flows, plus a populated RAID log so QA can start running on day one.',
      includes: [
        { icon: <Clipboard size={12} />, label: '6 regression suites' },
        { icon: <AlertTriangle size={12} />, label: 'RAID log w/ 4 starter rows' },
        { icon: <GitBranch size={12} />, label: 'Sprint sync enabled' },
        { icon: <Target size={12} />, label: 'Pass-rate dashboard' },
      ],
      stories: [
        { title: 'Sanity — auth & session', count: 8 },
        { title: 'Critical path — checkout', count: 14 },
        { title: 'Cross-browser smoke', count: 11 },
      ],
      suites: ['Login regression', 'Checkout regression', 'API smoke', 'Cross-browser', 'Mobile critical path', 'Admin sanity'],
    },
  },
  {
    id: 'feature',
    icon: <Sparkles size={14} />,
    label: 'Feature launch',
    desc: 'Stories, flows, RTM scaffolded',
    color: 'var(--pink)',
    preview: {
      summary: 'Sets up a feature-launch workspace: discovery story, requirements doc, process flow, RTM stub, and one starter test suite.',
      includes: [
        { icon: <BookOpen size={12} />, label: '1 discovery story w/ 8 tabs' },
        { icon: <FileText size={12} />, label: 'Requirements doc template' },
        { icon: <GitBranch size={12} />, label: 'Process flow stub' },
        { icon: <Grid3x3 size={12} />, label: 'Empty RTM ready to fill' },
        { icon: <Clipboard size={12} />, label: '1 happy-path suite' },
      ],
      stories: [
        { title: 'Feature discovery', count: 0 },
        { title: 'Acceptance criteria', count: 0 },
      ],
      suites: ['Happy path'],
    },
  },
  {
    id: 'compliance',
    icon: <Target size={14} />,
    label: 'Compliance audit',
    desc: 'Traceability matrix + sign-offs',
    color: 'var(--orange)',
    preview: {
      summary: 'Built for SOC2, HIPAA, or internal audits. Pre-fills a traceability matrix linking requirements → tests → evidence, plus a sign-off log.',
      includes: [
        { icon: <Grid3x3 size={12} />, label: 'Pre-built RTM (50 rows)' },
        { icon: <CheckCircle2 size={12} />, label: 'Sign-off log + roles' },
        { icon: <FileText size={12} />, label: 'Evidence attachment fields' },
        { icon: <Lock size={12} />, label: 'Locked-once-approved rows' },
        { icon: <Calendar size={12} />, label: 'Audit timeline + reminders' },
      ],
      stories: [
        { title: 'Control mapping', count: 50 },
        { title: 'Evidence collection', count: 24 },
      ],
      suites: ['Access controls', 'Data retention', 'Encryption', 'Incident response'],
    },
  },
]

const SPRINTS = [
  { id: 's-12', label: 'Sprint 12 — Apr 21 → May 5', active: true },
  { id: 's-11', label: 'Sprint 11 — Apr 7 → Apr 21', active: false },
  { id: 's-10', label: 'Sprint 10 — Mar 24 → Apr 7', active: false },
  { id: 's-09', label: 'Sprint 9 — Mar 10 → Mar 24', active: false },
  { id: 's-08', label: 'Sprint 8 — Feb 25 → Mar 10', active: false },
]

const PRIORITY_BUCKETS: Array<{ value: 'low' | 'med' | 'high' | 'critical'; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'med', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const VISIBILITY_OPTIONS: Array<{ value: 'team' | 'private' | 'public'; label: string; icon: React.ReactNode }> = [
  { value: 'team',    label: 'Team',    icon: <UsersIcon size={11} /> },
  { value: 'private', label: 'Private', icon: <UserIcon size={11} /> },
  { value: 'public',  label: 'Public',  icon: <Eye size={11} /> },
]

const COLOR_SWATCHES = ['#7C5CFF', '#E85AA8', '#F28B3B', '#1E9F6E', '#3A6DF0', '#D8433B']

/* ── Modal field + input atoms ───────────────────────────────────── */

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

function TemplatePreview({ template }: { template: typeof TEMPLATES[number] }) {
  const t = template
  const isBlank = t.id === 'blank'
  return (
    <div
      style={{
        marginTop: 10,
        background: `color-mix(in oklab, ${t.color} 5%, var(--panel))`,
        border: `1px solid color-mix(in oklab, ${t.color} 25%, var(--border))`,
        borderRadius: 12,
        padding: 14,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span
          style={{
            width: 32, height: 32, borderRadius: 9,
            display: 'grid', placeItems: 'center',
            background: `color-mix(in oklab, ${t.color} 18%, var(--panel))`,
            color: t.color, flexShrink: 0,
          }}
        >
          {t.icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)' }}>{t.label} preview</span>
            {!isBlank && (
              <span
                className="tz-mono"
                style={{
                  fontSize: 9.5, padding: '2px 6px', borderRadius: 999,
                  background: `color-mix(in oklab, ${t.color} 14%, var(--panel))`,
                  color: t.color, fontWeight: 600, letterSpacing: '0.06em',
                }}
              >
                SCAFFOLDS {t.preview.includes.length} ITEMS
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--mute)', margin: '3px 0 0', lineHeight: 1.45 }}>
            {t.preview.summary}
          </p>
        </div>
      </div>

      {!isBlank && (
        <>
          <div className="hairline" style={{ margin: 0, height: 1, background: 'var(--border)' }} />
          <div>
            <div className="tz-mono" style={{ fontSize: 9.5, color: 'var(--mute)', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 6 }}>
              WHAT YOU'LL GET
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 5 }}>
              {t.preview.includes.map((it, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    fontSize: 11.5, color: 'var(--ink-2)',
                    padding: '5px 8px', background: 'var(--panel)',
                    borderRadius: 7, border: '1px solid var(--border)',
                  }}
                >
                  <span style={{ color: t.color, display: 'inline-flex' }}>{it.icon}</span>
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {it.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {(t.preview.stories.length > 0 || t.preview.suites.length > 0) && (
            <>
              <div className="hairline" style={{ margin: 0, height: 1, background: 'var(--border)' }} />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: t.preview.stories.length && t.preview.suites.length ? '1fr 1fr' : '1fr',
                  gap: 10,
                }}
              >
                {t.preview.stories.length > 0 && (
                  <div>
                    <div className="tz-mono" style={{ fontSize: 9.5, color: 'var(--mute)', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <BookOpen size={10} /> STORIES
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {t.preview.stories.map((s, i) => (
                        <div
                          key={i}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '5px 8px', background: 'var(--panel)',
                            borderRadius: 6, border: '1px solid var(--border)',
                            fontSize: 11.5,
                          }}
                        >
                          <span style={{ width: 4, height: 4, borderRadius: 999, background: t.color, flexShrink: 0 }} />
                          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink-2)' }}>
                            {s.title}
                          </span>
                          {s.count > 0 && (
                            <span className="tz-mono" style={{ fontSize: 10, color: 'var(--mute)' }}>{s.count}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {t.preview.suites.length > 0 && (
                  <div>
                    <div className="tz-mono" style={{ fontSize: 9.5, color: 'var(--mute)', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Clipboard size={10} /> SUITES
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {t.preview.suites.slice(0, 6).map((name, i) => (
                        <span
                          key={i}
                          style={{
                            fontSize: 11, padding: '4px 8px',
                            background: 'var(--panel)', borderRadius: 6,
                            border: '1px solid var(--border)', color: 'var(--ink-2)',
                          }}
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function ToggleLine({ label, desc, value, onChange }: {
  label: string
  desc: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }}>{label}</div>
        <div style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 1 }}>{desc}</div>
      </div>
      <span
        onClick={() => onChange(!value)}
        style={{
          width: 32, height: 18, borderRadius: 999, position: 'relative',
          background: value ? 'var(--purple)' : 'var(--border-strong)',
          transition: 'all .15s', flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute', top: 2, left: value ? 16 : 2, width: 14, height: 14,
            borderRadius: 999, background: 'white', transition: 'all .15s',
          }}
        />
      </span>
    </label>
  )
}

function SprintLinkRow({
  linked, sprintId, onLink, onUnlink, onSelect,
}: {
  linked: boolean
  sprintId: string | null
  onLink: () => void
  onUnlink: () => void
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const current = SPRINTS.find((s) => s.id === sprintId) ?? SPRINTS[0]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--ink)' }}>Link to existing sprint</div>
        <div style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 1 }}>
          {linked ? 'Project will sync stories and dates with this sprint.' : 'Connect this project to a sprint in your tracker.'}
        </div>
      </div>

      {linked ? (
        <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setOpen((o) => !o)}
            style={{
              border: '1px solid var(--border)', background: 'var(--panel)',
              borderRadius: 8, padding: '7px 10px', fontSize: 12,
              display: 'inline-flex', alignItems: 'center', gap: 8,
              cursor: 'pointer', fontFamily: 'inherit', color: 'var(--ink)',
              minWidth: 220,
            }}
          >
            <span
              style={{
                width: 6, height: 6, borderRadius: 999,
                background: current.active ? 'var(--green)' : 'var(--mute-2)',
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {current.label}
            </span>
            <ChevronDown size={11} style={{ color: 'var(--mute)' }} />
          </button>
          {open && (
            <div
              className="panel"
              style={{
                position: 'absolute', top: 'calc(100% + 4px)', right: 0, minWidth: 280,
                padding: 4, zIndex: 10, maxHeight: 260, overflowY: 'auto',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              {SPRINTS.map((s) => {
                const sel = s.id === sprintId
                return (
                  <button
                    key={s.id}
                    onClick={() => { onSelect(s.id); setOpen(false) }}
                    style={{
                      width: '100%', textAlign: 'left', border: 0,
                      background: sel ? 'color-mix(in oklab, var(--purple) 8%, var(--panel))' : 'transparent',
                      color: 'var(--ink)', borderRadius: 7, padding: '8px 10px',
                      fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                    onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = 'var(--panel-2)' }}
                    onMouseLeave={(e) => { if (!sel) e.currentTarget.style.background = 'transparent' }}
                  >
                    <span
                      style={{
                        width: 6, height: 6, borderRadius: 999,
                        background: s.active ? 'var(--green)' : 'var(--mute-2)', flexShrink: 0,
                      }}
                    />
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.label}
                    </span>
                    {s.active && (
                      <span className="tz-mono" style={{ fontSize: 9.5, color: 'var(--green)', letterSpacing: '0.06em', fontWeight: 600 }}>
                        ACTIVE
                      </span>
                    )}
                    {sel && <Check size={12} style={{ color: 'var(--purple)' }} />}
                  </button>
                )
              })}
              <div className="hairline" style={{ margin: '4px 0', height: 1, background: 'var(--border)' }} />
              <button
                onClick={() => setOpen(false)}
                style={{
                  width: '100%', textAlign: 'left', border: 0, background: 'transparent',
                  color: 'var(--purple)', borderRadius: 7, padding: '8px 10px',
                  fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--panel-2)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <Plus size={12} /> Create new sprint…
              </button>
            </div>
          )}
        </div>
      ) : (
        <button onClick={onLink} className="tz-btn" style={{ flexShrink: 0, fontSize: 12 }}>
          <Link2 size={11} /> Link sprint
        </button>
      )}

      {linked && (
        <button
          onClick={onUnlink}
          className="tz-btn tz-btn-ghost"
          style={{ flexShrink: 0, padding: 6 }}
          title="Unlink"
        >
          <X size={12} />
        </button>
      )}
    </div>
  )
}

function ProjectFormModal({
  initial, onSave, onClose,
}: {
  initial?: Project
  onSave: (data: ProjectFormData) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<ProjectFormData>({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
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
  const [sprintLinked, setSprintLinked] = useState<boolean>(!!initial?.sprintId)

  // Keyboard close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !form.tags.includes(t)) setForm((f) => ({ ...f, tags: [...f.tags, t] }))
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

  const template = TEMPLATES.find((t) => t.id === form.template) ?? TEMPLATES[0]

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
          width: '100%', maxWidth: 680,
          height: 'calc(100vh - 40px)',
          display: 'flex', flexDirection: 'column',
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 16, boxShadow: 'var(--shadow-md)', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <span
            className="section-icon grad-purple"
            style={{ width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center', color: 'white', flexShrink: 0 }}
          >
            <FolderOpen size={20} />
          </span>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
              {initial ? 'Edit project' : 'Create new project'}
            </h2>
            <p style={{ fontSize: 12.5, color: 'var(--mute)', margin: '2px 0 0' }}>
              Configure scope, timeline, and team. You can edit any of this later.
            </p>
          </div>
          <button onClick={onClose} className="tz-btn tz-btn-ghost" style={{ padding: 6 }}>
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 18, flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {error && (
            <div
              style={{
                padding: '10px 12px', borderRadius: 10, fontSize: 13,
                background: 'color-mix(in oklab, var(--red) 10%, transparent)',
                border: '1px solid color-mix(in oklab, var(--red) 30%, transparent)',
                color: 'var(--red)',
              }}
            >
              {error}
            </div>
          )}

          {/* Template picker (create only) */}
          {!initial && (
            <div>
              <div className="tz-mono" style={{ fontSize: 10.5, color: 'var(--mute)', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 8 }}>
                START FROM
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {TEMPLATES.map((t) => {
                  const active = form.template === t.id
                  return (
                    <button
                      key={t.id}
                      onClick={() => setForm((f) => ({ ...f, template: t.id }))}
                      style={{
                        border: active ? '1.5px solid var(--purple)' : '1px solid var(--border)',
                        background: active ? 'color-mix(in oklab, var(--purple) 6%, var(--panel))' : 'var(--panel-2)',
                        borderRadius: 10, padding: '10px 12px', textAlign: 'left',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                        fontFamily: 'inherit',
                      }}
                    >
                      <span
                        style={{
                          width: 30, height: 30, borderRadius: 8,
                          display: 'grid', placeItems: 'center',
                          background: `color-mix(in oklab, ${t.color} 15%, var(--panel))`,
                          color: t.color, flexShrink: 0,
                        }}
                      >
                        {t.icon}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{t.label}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 1 }}>{t.desc}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
              {template.id === 'blank' ? (
                <div
                  className="tz-mono"
                  style={{
                    marginTop: 10,
                    fontSize: 10.5,
                    letterSpacing: '0.08em',
                    fontWeight: 600,
                    color: 'var(--mute)',
                    textAlign: 'center',
                    padding: '8px 12px',
                    border: '1px dashed var(--border)',
                    borderRadius: 10,
                    background: 'var(--panel-2)',
                  }}
                >
                  SCAFFOLDS 0 ITEMS — START FROM SCRATCH
                </div>
              ) : (
                <TemplatePreview template={template} />
              )}
            </div>
          )}

          {/* Name + color swatch */}
          <ModalField label="PROJECT NAME" required>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    style={{
                      width: 32, height: 32, borderRadius: 8,
                      border: form.color === c ? '2px solid var(--ink)' : '1px solid var(--border)',
                      background: c, cursor: 'pointer', padding: 0,
                    }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
              <ModalInput
                placeholder="e.g. Sprint 12 Regression"
                value={form.name}
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

          {/* Priority + Visibility */}
          <div style={{ display: 'flex', gap: 14 }}>
            <ModalField label="PRIORITY" half>
              <div style={{ display: 'flex', gap: 4 }}>
                {PRIORITY_BUCKETS.map((p) => {
                  const active = form.priority === p.value
                  return (
                    <button
                      key={p.value}
                      onClick={() => setForm((f) => ({ ...f, priority: p.value }))}
                      style={{
                        flex: 1,
                        border: active ? '1.5px solid var(--purple)' : '1px solid var(--border)',
                        background: active ? 'color-mix(in oklab, var(--purple) 8%, var(--panel))' : 'var(--panel-2)',
                        color: active ? 'var(--ink)' : 'var(--ink-2)',
                        borderRadius: 8, padding: '8px 0',
                        fontSize: 12.5, fontWeight: active ? 600 : 500,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </ModalField>
            <ModalField label="VISIBILITY" half>
              <div style={{ display: 'flex', gap: 4 }}>
                {VISIBILITY_OPTIONS.map((o) => {
                  const active = form.visibility === o.value
                  return (
                    <button
                      key={o.value}
                      onClick={() => setForm((f) => ({ ...f, visibility: o.value }))}
                      style={{
                        flex: 1,
                        border: active ? '1.5px solid var(--purple)' : '1px solid var(--border)',
                        background: active ? 'color-mix(in oklab, var(--purple) 8%, var(--panel))' : 'var(--panel-2)',
                        borderRadius: 8, padding: '8px 0',
                        fontSize: 12.5, fontWeight: active ? 600 : 500,
                        cursor: 'pointer', fontFamily: 'inherit',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                        color: active ? 'var(--ink)' : 'var(--ink-2)',
                      }}
                    >
                      {o.icon} {o.label}
                    </button>
                  )
                })}
              </div>
            </ModalField>
          </div>

          {/* Tags */}
          <ModalField label="TAGS" hint="Press Enter or click Add. Tags help filter and group projects.">
            <div style={{ display: 'flex', gap: 8 }}>
              <ModalInput
                placeholder="Add a tag…"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
              />
              <button onClick={addTag} className="tz-btn" style={{ flexShrink: 0 }}>Add</button>
            </div>
            {form.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                {form.tags.map((t) => (
                  <span
                    key={t}
                    className="tz-pill purple"
                    style={{ paddingRight: 4 }}
                  >
                    <TagIcon size={10} /> {t}
                    <button
                      onClick={() => removeTag(t)}
                      style={{ border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer', padding: 0, marginLeft: 2, display: 'inline-flex' }}
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </ModalField>

          {/* Dates */}
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
            <ModalField label="DEADLINE" half>
              <ModalInput
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              />
            </ModalField>
          </div>

          {/* Add members (placeholder — wired up to existing project_members later) */}
          <ModalField label="ADD MEMBERS" hint="You can invite teammates now or later.">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <ModalInput placeholder="Email or @name" />
              <select style={{ ...modalInputStyle, width: 130, flexShrink: 0 }}>
                <option>Editor</option>
                <option>Viewer</option>
                <option>Admin</option>
              </select>
              <button className="tz-btn" style={{ flexShrink: 0 }}>
                <Plus size={12} /> Invite
              </button>
            </div>
          </ModalField>

          {/* Toggles + sprint dropdown */}
          <div
            style={{
              background: 'var(--panel-2)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '12px 14px',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}
          >
            <ToggleLine
              label="Auto-generate RAID log"
              desc="Pre-create risks, assumptions, issues, dependencies sections"
              value={form.autoRaid}
              onChange={(v) => setForm((f) => ({ ...f, autoRaid: v }))}
            />
            <SprintLinkRow
              linked={sprintLinked}
              sprintId={form.sprintId}
              onLink={() => { setSprintLinked(true); setForm((f) => ({ ...f, sprintId: f.sprintId ?? SPRINTS[0].id })) }}
              onUnlink={() => { setSprintLinked(false); setForm((f) => ({ ...f, sprintId: null })) }}
              onSelect={(id) => setForm((f) => ({ ...f, sprintId: id }))}
            />
            <ToggleLine
              label="Notify team on create"
              desc="Send a Slack-style ping to invited members"
              value={form.notifyTeam}
              onChange={(v) => setForm((f) => ({ ...f, notifyTeam: v }))}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 22px', borderTop: '1px solid var(--border)',
            background: 'var(--panel-2)',
            display: 'flex', alignItems: 'center', gap: 10,
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 11.5, color: 'var(--mute)' }}>
            <Sparkles size={11} style={{ verticalAlign: '-2px' }} /> Tip: leave fields empty and use AI to bootstrap from a brief.
          </span>
          <span style={{ flex: 1 }} />
          <button onClick={onClose} className="tz-btn">Cancel</button>
          <button onClick={submit} disabled={saving} className="tz-btn tz-btn-gradient">
            {saving ? 'Saving…' : initial ? 'Save changes' : <>Create project <ArrowRight size={13} /></>}
          </button>
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

function ProjectCard({
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
        <FolderOpen size={15} strokeWidth={1.8} style={{ color: 'var(--purple)', flexShrink: 0, marginTop: 2 }} />
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
}

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
