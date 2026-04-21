import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useRef, useEffect, useMemo } from 'react'
import { Plus, ChevronDown, FolderOpen, ArrowRight, Trash2, RotateCcw, CheckCheck, X } from 'lucide-react'
import {
  useStories, createStory, addStory, deleteStory, completeStory,
  reloadStoriesForProject, type Story, type StoryStatus,
} from '@/lib/stories'
import { useProjects, useActiveProjectId, type Project } from '@/lib/projects'
import { LoadingCurtain } from '@/components/LoadingCurtain'
import {
  PageShell, Pill, CaseBar, Segmented, EyebrowChip, Icon, Button,
} from '@/components/design/primitives'

export const Route = createFileRoute('/stories/')({
  component: StoriesPage,
})

type Tab = 'active' | 'completed'

const STATUS_META: Record<StoryStatus, { tone: 'blue' | 'purple' | 'amber' | 'green' | 'neutral'; label: string }> = {
  discovery: { tone: 'blue', label: 'Discovery' },
  analysis: { tone: 'purple', label: 'Analysis' },
  development: { tone: 'amber', label: 'Development' },
  uat: { tone: 'amber', label: 'UAT' },
  done: { tone: 'green', label: 'Done' },
}

const STATUS_OPTIONS: Array<{ value: StoryStatus; label: string }> = [
  { value: 'discovery', label: 'Discovery' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'development', label: 'Development' },
  { value: 'uat', label: 'UAT' },
  { value: 'done', label: 'Done' },
]

/* ─── Project dropdown ─────────────────────────────── */

function ProjectPicker({
  projects, activeProjectId, onSelect,
}: {
  projects: Project[]
  activeProjectId: number | null
  onSelect: (id: number | null) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const active = projects.find((p) => p.id === activeProjectId)

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
      <button className="tz-btn" onClick={() => setOpen((o) => !o)}>
        <FolderOpen size={13} />
        <span className="tz-truncate" style={{ maxWidth: 180 }}>{active?.name ?? 'All Projects'}</span>
        <ChevronDown size={12} style={{ color: 'var(--mute)', transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .15s' }} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 50,
            width: 260, background: 'var(--panel)',
            border: '1px solid var(--border)', borderRadius: 'var(--tz-radius)',
            boxShadow: 'var(--shadow-md)', overflow: 'hidden',
          }}
        >
          <button
            onMouseDown={() => { onSelect(null); setOpen(false) }}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', border: 0, background: activeProjectId === null ? 'var(--chip)' : 'transparent',
              color: 'var(--ink)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, textAlign: 'left',
              borderBottom: '1px solid var(--border)',
              fontWeight: activeProjectId === null ? 600 : 500,
            }}
          >
            <FolderOpen size={14} style={{ opacity: 0.7 }} /> All Projects
          </button>
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {projects.map((p) => (
              <button
                key={p.id}
                onMouseDown={() => { onSelect(p.id); setOpen(false) }}
                style={{
                  width: '100%', padding: '9px 12px', border: 0,
                  background: activeProjectId === p.id ? 'var(--chip)' : 'transparent',
                  color: 'var(--ink)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, textAlign: 'left',
                  fontWeight: activeProjectId === p.id ? 600 : 500,
                }}
                onMouseEnter={(e) => { if (activeProjectId !== p.id) e.currentTarget.style.background = 'var(--panel-2)' }}
                onMouseLeave={(e) => { if (activeProjectId !== p.id) e.currentTarget.style.background = 'transparent' }}
              >
                <span className="tz-truncate">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Story list row (left pane) ─────────────────────── */

function StoryListItem({ story, active, onClick }: { story: Story; active: boolean; onClick: () => void }) {
  const meta = STATUS_META[story.status]
  const progress = computeProgress(story)
  const updated = formatShort(story.updatedAt)
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 14px', cursor: 'pointer',
        borderTop: '1px solid var(--border)',
        background: active ? 'var(--panel-2)' : 'transparent',
        borderLeft: active ? '3px solid var(--purple)' : '3px solid transparent',
        transition: 'background .15s',
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--panel-2)' }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <Pill tone={meta.tone}>{meta.label}</Pill>
        <span style={{ flex: 1 }} />
        <span className="tz-mono" style={{ fontSize: 10.5, color: 'var(--mute)' }}>{updated}</span>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 3, letterSpacing: '-0.005em' }} className="tz-truncate">
        {story.title || 'Untitled Story'}
      </div>
      <div className="tz-truncate" style={{ fontSize: 12, color: 'var(--mute)', marginBottom: 8 }}>
        {story.summary || 'No summary yet'}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <CaseBar cases={{ pass: progress.done, pending: progress.total - progress.done }} height={3} />
        </div>
        <span className="tz-mono" style={{ fontSize: 10.5, color: 'var(--mute)' }}>
          {progress.total === 0 ? '0%' : Math.round((progress.done / progress.total) * 100) + '%'}
        </span>
      </div>
    </div>
  )
}

/* ─── Right pane detail panel ─────────────────────── */

function SplitDetailPanel({
  story, projectName, tab, onDelete, onComplete, onReactivate, onOpen,
}: {
  story: Story
  projectName: string | null
  tab: Tab
  onDelete: (id: string) => void
  onComplete: (id: string) => void
  onReactivate: (id: string) => void
  onOpen: (id: string) => void
}) {
  const meta = STATUS_META[story.status]
  const progress = computeProgress(story)
  const pct = progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * 100)

  const counts: Array<{ icon: Parameters<typeof Icon>[0]['name']; label: string; value: number }> = [
    { icon: 'file-text', label: 'User stories', value: story.userStories.length },
    { icon: 'layers', label: 'Requirements', value: story.requirements.length },
    { icon: 'branch', label: 'Flows', value: story.processFlows.length },
    { icon: 'clipboard', label: 'RTM', value: story.rtm.length },
    { icon: 'alert', label: 'RAID', value: story.raid.length },
  ]

  return (
    <div className="panel" style={{ padding: 24, alignSelf: 'start' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <Pill tone={meta.tone}>{meta.label}</Pill>
        {projectName && <Pill tone="blue" icon="folder">{projectName}</Pill>}
        {story.completed && <Pill tone="green" icon="check">Completed</Pill>}
        <span style={{ flex: 1 }} />
        {tab === 'active' ? (
          <button className="tz-btn" onClick={() => onComplete(story.id)}>
            <CheckCheck size={13} /> Complete
          </button>
        ) : (
          <button className="tz-btn" onClick={() => onReactivate(story.id)}>
            <RotateCcw size={13} /> Reactivate
          </button>
        )}
        <button className="tz-btn tz-btn-ghost" style={{ padding: 6, color: 'var(--red)' }} onClick={() => onDelete(story.id)} title="Delete">
          <Trash2 size={14} />
        </button>
      </div>
      <h2 style={{ fontSize: 24, letterSpacing: '-0.02em', margin: '0 0 8px', color: 'var(--ink)' }}>
        {story.title || 'Untitled Story'}
      </h2>
      <p style={{ fontSize: 14, color: 'var(--mute)', lineHeight: 1.55, margin: '0 0 18px' }}>
        {story.summary || 'No summary yet — open the story to add details.'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
        {counts.map((m) => (
          <div
            key={m.label}
            style={{
              padding: '10px 12px', background: 'var(--panel-2)',
              border: '1px solid var(--border)', borderRadius: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--mute)', fontSize: 11 }}>
              <Icon name={m.icon} size={12} /> {m.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 2 }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      <div className="hairline" style={{ margin: '18px 0' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div className="tz-mono" style={{ fontSize: 10.5, color: 'var(--mute)', marginBottom: 4 }}>
            PROGRESS · {progress.done}/{progress.total} · {pct}%
          </div>
          <CaseBar cases={{ pass: progress.done, pending: progress.total - progress.done }} total={Math.max(progress.total, 1)} height={5} />
        </div>
        <button className="tz-btn" onClick={() => onOpen(story.id)}>
          Open <ArrowRight size={13} />
        </button>
      </div>
    </div>
  )
}

/* ─── Create Story modal (Canvas style) ─────────────── */

function CreateStoryModal({
  projects, defaultProjectId, onCreate, onClose,
}: {
  projects: Project[]
  defaultProjectId: number | null
  onCreate: (data: { title: string; summary: string; projectId: number | null; status: StoryStatus }) => Promise<void>
  onClose: () => void
}) {
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [projectId, setProjectId] = useState<number | null>(defaultProjectId)
  const [status, setStatus] = useState<StoryStatus>('discovery')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!title.trim()) { setError('Title is required.'); return }
    setBusy(true)
    setError('')
    try {
      await onCreate({ title: title.trim(), summary: summary.trim(), projectId, status })
    } catch (err) {
      setError((err as { message?: string }).message || 'Failed to create story')
      setBusy(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 80, display: 'grid', placeItems: 'center', padding: 20,
        background: 'color-mix(in oklab, var(--ink) 28%, transparent)', backdropFilter: 'blur(4px)',
      }}
      onMouseDown={onClose}
    >
      <div
        className="panel"
        style={{ width: '100%', maxWidth: 520, padding: 22, boxShadow: '0 24px 60px rgba(20,20,40,0.18)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <EyebrowChip icon="sparkles" tone="purple">New story</EyebrowChip>
          <span style={{ flex: 1 }} />
          <button className="tz-btn tz-btn-ghost" style={{ padding: 6 }} onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </div>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--ink)', margin: '0 0 14px', letterSpacing: '-0.02em' }}>
          Start a new BA story
        </h3>

        <ModalField label="Title" required>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Self-service password reset"
            className="tz-input"
          />
        </ModalField>

        <ModalField label="Summary">
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="One sentence describing what this story delivers"
            rows={3}
            className="tz-input"
            style={{ resize: 'vertical', minHeight: 64, fontFamily: 'inherit' }}
          />
        </ModalField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <ModalField label="Project">
            <select
              value={projectId ?? ''}
              onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)}
              className="tz-input"
              style={{ cursor: 'pointer' }}
            >
              <option value="">Unassigned</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </ModalField>

          <ModalField label="Status">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StoryStatus)}
              className="tz-input"
              style={{ cursor: 'pointer' }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </ModalField>
        </div>

        {error && (
          <div style={{
            marginTop: 14, padding: '10px 12px', borderRadius: 10,
            background: 'color-mix(in oklab, var(--red) 10%, transparent)',
            border: '1px solid color-mix(in oklab, var(--red) 35%, transparent)',
            color: 'var(--red)', fontSize: 12.5,
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
          <Button onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="gradient" onClick={submit} disabled={busy}>
            {busy ? 'Creating…' : 'Create story'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ModalField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--mute)', fontWeight: 600, marginBottom: 4 }}>
        {label}{required && <span style={{ color: 'var(--red)', marginLeft: 3 }}>*</span>}
      </div>
      {children}
    </label>
  )
}

/* ─── Delete confirm modal (Canvas style) ─────────── */

function DeleteStoryModal({
  story, onConfirm, onClose,
}: {
  story: Story; onConfirm: () => void; onClose: () => void
}) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 80, display: 'grid', placeItems: 'center', padding: 20,
        background: 'color-mix(in oklab, var(--ink) 28%, transparent)', backdropFilter: 'blur(4px)',
      }}
      onMouseDown={onClose}
    >
      <div
        className="panel"
        style={{ width: '100%', maxWidth: 420, padding: 22, boxShadow: '0 24px 60px rgba(20,20,40,0.18)' }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', margin: '0 0 8px' }}>Delete story</h3>
        <p style={{ fontSize: 13, color: 'var(--mute)', margin: '0 0 18px', lineHeight: 1.5 }}>
          Permanently delete <strong style={{ color: 'var(--ink)' }}>"{story.title || 'Untitled Story'}"</strong>?
          All user stories, requirements, and linked artifacts in this story will be removed. This can't be undone.
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

/* ─── Toast notification ──────────────────────────── */

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div
      style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        zIndex: 90, display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 16px', borderRadius: 999,
        background: 'color-mix(in oklab, var(--panel) 92%, transparent)',
        border: '1px solid var(--border)',
        boxShadow: '0 12px 32px rgba(20,20,40,0.16)',
        backdropFilter: 'blur(12px)',
        color: 'var(--ink)', fontSize: 13, fontWeight: 500,
      }}
    >
      <Icon name="check-circle" size={14} style={{ color: 'var(--green)' }} />
      {message}
    </div>
  )
}

/* ─── Empty state ─────────────────────────────────── */

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="panel" style={{ padding: '40px 24px', textAlign: 'center', borderStyle: 'dashed', background: 'var(--panel-2)' }}>
      <div style={{
        display: 'inline-grid', placeItems: 'center', width: 52, height: 52, borderRadius: 999,
        background: 'color-mix(in oklab, var(--purple) 14%, transparent)',
        color: 'var(--purple)', marginBottom: 14,
      }}>
        <Icon name="sparkles" size={22} />
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 6px', color: 'var(--ink)' }}>No stories yet</h3>
      <p style={{ fontSize: 13.5, color: 'var(--mute)', margin: '0 0 18px', maxWidth: 480, marginInline: 'auto' }}>
        Capture business cases, user stories, requirements, flows, wireframes, RTM and RAID in one place.
      </p>
      <button className="tz-btn tz-btn-gradient" onClick={onCreate}>
        <Plus size={14} /> Create your first story
      </button>
    </div>
  )
}

/* ─── Main ────────────────────────────────────────── */

function StoriesPage() {
  const { stories, loading } = useStories()
  const { projects } = useProjects()
  const [activeProjectId, setActiveProjectId] = useActiveProjectId()
  const [tab, setTab] = useState<Tab>('active')
  const [showCreate, setShowCreate] = useState(false)
  const [deletingStory, setDeletingStory] = useState<Story | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleProjectSwitch = (id: number | null) => {
    setActiveProjectId(id)
    reloadStoriesForProject(id)
  }

  const projectLookup = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects])

  const activeStories = stories.filter((s) => !s.completed)
  const completedStories = stories.filter((s) => s.completed)
  const list = tab === 'active' ? activeStories : completedStories

  const [selectedId, setSelectedId] = useState<string | null>(null)
  useEffect(() => {
    if (list.length === 0) { setSelectedId(null); return }
    if (!selectedId || !list.find((s) => s.id === selectedId)) {
      setSelectedId(list[0].id)
    }
  }, [list, selectedId])

  const selected = list.find((s) => s.id === selectedId) || list[0]

  const handleCreate = async (data: { title: string; summary: string; projectId: number | null; status: StoryStatus }) => {
    const s = createStory()
    s.title = data.title
    s.summary = data.summary
    s.status = data.status
    s.projectId = data.projectId
    await addStory(s)
    setShowCreate(false)
    navigate({ to: '/stories/$id', params: { id: s.id } })
  }

  const handleDelete = async () => {
    if (!deletingStory) return
    const title = deletingStory.title || 'Untitled Story'
    await deleteStory(deletingStory.id)
    setDeletingStory(null)
    setToast(`Deleted "${title}"`)
  }

  if (loading) return <LoadingCurtain visible message="Loading Stories" />

  const selectedProjectName = selected?.projectId ? projectLookup.get(selected.projectId) ?? null : null

  return (
    <PageShell>
      <div style={{ paddingTop: 56, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <EyebrowChip icon="sparkles" tone="blue">Business Analyst Workspace</EyebrowChip>
          <h1 className="display">Stories</h1>
          <p className="subhead">Turn ideas into structured requirements, flows, and traceability.</p>
        </div>
        <button className="tz-btn tz-btn-gradient" style={{ marginTop: 30 }} onClick={() => setShowCreate(true)}>
          <Plus size={13} /> New Story
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 28, flexWrap: 'wrap' }}>
        <ProjectPicker projects={projects} activeProjectId={activeProjectId} onSelect={handleProjectSwitch} />
      </div>

      <div style={{ marginTop: 18 }}>
        <Segmented
          variant="gradient"
          options={[
            { value: 'active', label: 'Active', icon: 'clock', count: activeStories.length },
            { value: 'completed', label: 'Completed', icon: 'check-circle', count: completedStories.length },
          ]}
          value={tab}
          onChange={(v) => setTab(v as Tab)}
        />
      </div>

      <div style={{ marginTop: 20 }}>
        {stories.length === 0 ? (
          <EmptyState onCreate={() => setShowCreate(true)} />
        ) : list.length === 0 ? (
          <div className="panel" style={{ padding: 28, textAlign: 'center', color: 'var(--mute)' }}>
            No {tab} stories.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 14, minHeight: 560 }}>
            <div className="panel" style={{ padding: 0, overflow: 'hidden', alignSelf: 'start' }}>
              {list.map((s, i) => (
                <div key={s.id} style={i === 0 ? { borderTop: 0 } : undefined}>
                  <StoryListItem
                    story={s}
                    active={s.id === (selected?.id ?? null)}
                    onClick={() => setSelectedId(s.id)}
                  />
                </div>
              ))}
            </div>
            {selected ? (
              <SplitDetailPanel
                story={selected}
                projectName={selectedProjectName}
                tab={tab}
                onDelete={(id) => {
                  const s = list.find((x) => x.id === id) || null
                  setDeletingStory(s)
                }}
                onComplete={(id) => completeStory(id, true)}
                onReactivate={(id) => completeStory(id, false)}
                onOpen={(id) => navigate({ to: '/stories/$id', params: { id } })}
              />
            ) : null}
          </div>
        )}
      </div>

      <SectionHeadRow />

      {showCreate && (
        <CreateStoryModal
          projects={projects}
          defaultProjectId={activeProjectId}
          onCreate={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}
      {deletingStory && (
        <DeleteStoryModal
          story={deletingStory}
          onConfirm={handleDelete}
          onClose={() => setDeletingStory(null)}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </PageShell>
  )
}

function SectionHeadRow() {
  return (
    <div style={{ marginTop: 40, display: 'flex', justifyContent: 'flex-end' }}>
      <Link to="/homepage" className="tz-btn tz-btn-ghost" style={{ textDecoration: 'none' }}>
        Back to Dashboard <ArrowRight size={12} />
      </Link>
    </div>
  )
}

/* ─── helpers ─────────────────────────────────────── */

function computeProgress(s: Story) {
  const total = s.userStories.length + s.requirements.length + s.rtm.length
  const done =
    s.userStories.filter((u) => u.status === 'done').length +
    s.requirements.filter((r) => r.priority === 'must').length * 0 + // leave neutral
    s.rtm.filter((r) => r.status === 'verified').length
  return { done, total }
}

function formatShort(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}
