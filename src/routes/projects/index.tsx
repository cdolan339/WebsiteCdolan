import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useProjects, createProject, updateProject, deleteProject, type Project, type CreateProjectPayload } from '@/lib/projects'
import { useHasPermission } from '@/lib/permissions'
import { LoadingCurtain } from '@/components/LoadingCurtain'
import { useState, useMemo } from 'react'
import {
  Plus, Pencil, Trash2, Calendar, FolderOpen, X, ChevronDown, Filter, User as UserIcon, Tag as TagIcon, ArrowUpDown,
} from 'lucide-react'
import {
  PageShell, EyebrowChip, Pill, Button, Avatar, colorForName,
} from '@/components/design/primitives'

export const Route = createFileRoute('/projects/')({
  component: ProjectsPage,
})

/* ── Derived health ──────────────────────────────────────────────── */

type Health = 'on-track' | 'at-risk' | 'blocked'

function healthForProject(p: Project): Health {
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
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, color: 'var(--mute)', marginBottom: 6 }}>
        {label}
      </label>
      {children}
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
  })
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

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

  const inputStyle: React.CSSProperties = {
    width: '100%', fontFamily: 'inherit', fontSize: 13,
    color: 'var(--ink)', background: 'var(--panel)',
    border: '1px solid var(--border)', borderRadius: 10,
    padding: '10px 12px', outline: 'none',
  }

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
        style={{ width: '100%', maxWidth: 560, padding: 24, position: 'relative', boxShadow: '0 24px 60px rgba(20,20,40,0.18)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button" onClick={onClose}
          style={{ position: 'absolute', top: 14, right: 14, padding: 6, background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--mute)', borderRadius: 8 }}
        >
          <X size={18} />
        </button>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', margin: '0 0 18px', letterSpacing: '-0.02em' }}>
          {initial ? 'Edit Project' : 'Create New Project'}
        </h2>

        {error && (
          <div style={{
            marginBottom: 14, padding: '10px 12px', borderRadius: 10, fontSize: 13,
            background: 'color-mix(in oklab, var(--red) 10%, transparent)',
            border: '1px solid color-mix(in oklab, var(--red) 30%, transparent)',
            color: 'var(--red)',
          }}>{error}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Project Name *">
            <input value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Sprint 12 Regression" style={inputStyle} />
          </Field>
          <Field label="Description">
            <textarea value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief project description..." rows={3}
              style={{ ...inputStyle, resize: 'none' }} />
          </Field>
          <Field label="Tags">
            {form.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                {form.tags.map((tag) => (
                  <span key={tag} className="tz-pill neutral" style={{ cursor: 'default' }}>
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)}
                      style={{ background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--mute)', padding: 0, marginLeft: 2, display: 'inline-flex' }}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="Add a tag..." style={{ ...inputStyle, flex: 1 }} />
              <Button onClick={addTag}>Add</Button>
            </div>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Timeline Start">
              <input type="date" value={form.timelineStart}
                onChange={(e) => setForm((f) => ({ ...f, timelineStart: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Timeline End">
              <input type="date" value={form.timelineEnd}
                onChange={(e) => setForm((f) => ({ ...f, timelineEnd: e.target.value }))} style={inputStyle} />
            </Field>
          </div>
          <Field label="Deadline">
            <input type="date" value={form.deadline}
              onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} style={inputStyle} />
          </Field>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="gradient" onClick={submit} disabled={saving}>
            {saving ? 'Saving…' : initial ? 'Save Changes' : 'Create Project'}
          </Button>
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

function ProjectCard({
  project, canEdit, onEdit, onDelete,
}: {
  project: Project; canEdit: boolean; onEdit: () => void; onDelete: () => void
}) {
  const navigate = useNavigate()
  const progress = progressForProject(project)
  const owner = project.createdBy || '—'
  const isOverdue = project.deadline ? new Date(project.deadline).getTime() < Date.now() : false

  return (
    <div
      className="panel"
      style={{
        padding: 16,
        cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 12,
        transition: 'transform .15s, box-shadow .15s',
      }}
      onClick={() => navigate({ to: '/projects/$id', params: { id: String(project.id) } })}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '' }}
    >
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
      name: data.name.trim(), description: data.description.trim(), tags: data.tags,
      timelineStart: data.timelineStart || null, timelineEnd: data.timelineEnd || null,
      deadline: data.deadline || null,
    }
    await createProject(payload)
  }

  const handleEdit = async (data: ProjectFormData) => {
    if (!editingProject) return
    await updateProject(editingProject.id, {
      name: data.name.trim(), description: data.description.trim(), tags: data.tags,
      timelineStart: data.timelineStart || null, timelineEnd: data.timelineEnd || null,
      deadline: data.deadline || null,
    })
  }

  const handleDelete = async () => {
    if (!deletingProject) return
    await deleteProject(deletingProject.id)
    setDeletingProject(null)
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, alignItems: 'flex-start' }}>
          {(['on-track', 'at-risk', 'blocked'] as Health[]).map((h) => (
            <div key={h} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ColumnHeader
                tone={h}
                label={HEALTH_META[h].label}
                count={lanes[h].length}
                onAdd={canCreate ? () => setShowCreate(true) : undefined}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {lanes[h].length === 0 ? (
                  <div style={{
                    padding: '22px 16px', borderRadius: 12, textAlign: 'center',
                    border: '1px dashed var(--border)',
                    color: 'var(--mute)', fontSize: 12.5,
                  }}>
                    No projects here
                  </div>
                ) : (
                  lanes[h].map((p) => (
                    <ProjectCard
                      key={p.id}
                      project={p}
                      canEdit={canCreate}
                      onEdit={() => setEditingProject(p)}
                      onDelete={() => setDeletingProject(p)}
                    />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <ProjectFormModal onSave={handleCreate} onClose={() => setShowCreate(false)} />}
      {editingProject && <ProjectFormModal initial={editingProject} onSave={handleEdit} onClose={() => setEditingProject(null)} />}
      {deletingProject && <DeleteConfirmModal project={deletingProject} onConfirm={handleDelete} onClose={() => setDeletingProject(null)} />}
    </PageShell>
  )
}
