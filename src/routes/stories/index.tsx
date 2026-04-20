import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useRef, useEffect, useMemo } from 'react'
import { Plus, ChevronDown, FolderOpen, ArrowRight, Trash2, RotateCcw, CheckCheck } from 'lucide-react'
import {
  useStories, createStory, addStory, deleteStory, completeStory,
  reloadStoriesForProject, type Story, type StoryStatus,
} from '@/lib/stories'
import { useProjects, useActiveProjectId, type Project } from '@/lib/projects'
import { LoadingCurtain } from '@/components/LoadingCurtain'
import {
  PageShell, Pill, CaseBar, Segmented, EyebrowChip, Icon,
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
    { icon: 'users', label: 'Stakeholders', value: story.stakeholders.length },
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
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

  const handleCreate = () => {
    const s = createStory()
    s.title = 'New Story'
    if (activeProjectId) s.projectId = activeProjectId
    addStory(s)
    navigate({ to: '/stories/$id', params: { id: s.id } })
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
        <button className="tz-btn tz-btn-gradient" style={{ marginTop: 30 }} onClick={handleCreate}>
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
          <EmptyState onCreate={handleCreate} />
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
                onDelete={(id) => { if (confirm('Delete this story?')) deleteStory(id) }}
                onComplete={(id) => completeStory(id, true)}
                onReactivate={(id) => completeStory(id, false)}
                onOpen={(id) => navigate({ to: '/stories/$id', params: { id } })}
              />
            ) : null}
          </div>
        )}
      </div>

      <SectionHeadRow />
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
