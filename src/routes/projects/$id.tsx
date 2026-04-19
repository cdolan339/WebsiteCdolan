import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  useProjects, type Project, type ProjectMember, type AppUser,
  getProjectMembers, addProjectMember, removeProjectMember, fetchUsers,
} from '@/lib/projects'
import { api } from '@/lib/api'
import { useAllTestStatuses, useAllTestPriorities, useAllExpectedCounts, type TestStatus } from '@/lib/useTestStatus'
import { useHasPermission } from '@/lib/permissions'
import { getSession } from '@/lib/auth'
import { Badge } from '@/components/ui/badge'
import { LoadingCurtain } from '@/components/LoadingCurtain'
import { useState, useEffect } from 'react'
import {
  CheckCircle2, XCircle, Clock, Ban, Calendar, ArrowLeft, FolderOpen,
  Users, UserPlus, X, Crown, BookOpen, CalendarClock,
} from 'lucide-react'
import type { CustomTestCase } from '@/lib/customTestCases'
import type { Story, StoryStatus } from '@/lib/stories'

export const Route = createFileRoute('/projects/$id')({
  component: ProjectDetailPage,
})

type StatusConfig = {
  label: string
  icon: React.ReactNode
  dotClass: string
}

const STATUS_CONFIG: { [K in TestStatus]: StatusConfig } = {
  pass: {
    label: 'Pass',
    icon: <CheckCircle2 size={16} className="text-green-500" />,
    dotClass: 'bg-green-500',
  },
  fail: {
    label: 'Fail',
    icon: <XCircle size={16} className="text-red-500" />,
    dotClass: 'bg-red-500',
  },
  pending: {
    label: 'Pending',
    icon: <Clock size={16} className="text-yellow-500" />,
    dotClass: 'bg-yellow-500',
  },
  blocked: {
    label: 'Blocked',
    icon: <Ban size={16} className="text-orange-500" />,
    dotClass: 'bg-orange-500',
  },
}

const PRIORITY_BADGE: { [key: string]: React.CSSProperties } = {
  low:      { background: 'rgba(22,163,74,0.15)',   color: '#16a34a', border: '1px solid rgba(22,163,74,0.3)'   },
  medium:   { background: 'rgba(202,138,4,0.15)',   color: '#ca8a04', border: '1px solid rgba(202,138,4,0.3)'   },
  high:     { background: 'rgba(234,88,12,0.15)',   color: '#ea580c', border: '1px solid rgba(234,88,12,0.3)'   },
  critical: { background: 'rgba(220,38,38,0.15)',   color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)'   },
}

const STORY_STATUS_META: Record<StoryStatus, { label: string; style: React.CSSProperties }> = {
  discovery:   { label: 'Discovery',   style: { background: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)' } },
  analysis:    { label: 'Analysis',    style: { background: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)' } },
  development: { label: 'Development', style: { background: 'rgba(234,88,12,0.15)',  color: '#ea580c', border: '1px solid rgba(234,88,12,0.3)'  } },
  uat:         { label: 'UAT',         style: { background: 'rgba(202,138,4,0.15)',  color: '#ca8a04', border: '1px solid rgba(202,138,4,0.3)'  } },
  done:        { label: 'Done',        style: { background: 'rgba(22,163,74,0.15)',  color: '#16a34a', border: '1px solid rgba(22,163,74,0.3)'  } },
}

// ── Status summary (same as homepage) ─────────────────────────────────────────

function StatusSummary({ statuses, total, slugs }: {
  statuses: { [key: string]: TestStatus }
  total: number
  slugs: string[]
}) {
  const relevantStatuses = Object.entries(statuses).filter(([key]) => slugs.includes(key))
  const counts = relevantStatuses.reduce(
    (acc, [, status]) => { acc[status] = (acc[status] ?? 0) + 1; return acc },
    {} as Partial<Record<TestStatus, number>>,
  )
  const display: Record<TestStatus, number> = {
    pass:    counts['pass']    ?? 0,
    fail:    counts['fail']    ?? 0,
    blocked: counts['blocked'] ?? 0,
    pending: (counts['pending'] ?? 0) + (total - relevantStatuses.length),
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
      {(['pass', 'fail', 'pending', 'blocked'] as const).map((status) => {
        const cfg = STATUS_CONFIG[status]
        return (
          <div key={status} className="flex items-center gap-3 rounded-lg p-4" style={{ background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)', backdropFilter: 'blur(10px)' }}>
            <span className={`w-3 h-3 rounded-full flex-shrink-0 ${cfg.dotClass}`} />
            <div>
              <p className="text-2xl font-bold">{display[status] ?? 0}</p>
              <p className="text-xs text-muted-foreground capitalize">{cfg.label}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Test plan row ─────────────────────────────────────────────────────────────

function TestPlanRow({ tc, resolvedStatus, resolvedPriority, passedCount }: {
  tc: CustomTestCase
  resolvedStatus: TestStatus
  resolvedPriority: string
  passedCount: number
}) {
  const cfg = STATUS_CONFIG[resolvedStatus]

  return (
    <li>
      <Link
        to="/test-cases/custom/$id"
        params={{ id: tc.id }}
        className="flex items-start gap-3 px-4 py-4 transition-colors hover:bg-foreground/5"
      >
        <span className="flex-shrink-0 mt-0.5">{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-medium text-foreground">{tc.title || 'Untitled Test Plan'}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={PRIORITY_BADGE[resolvedPriority] ?? PRIORITY_BADGE['medium']}>
              {resolvedPriority}
            </span>
            {tc.completed && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--app-success-light)', color: 'var(--app-success)', border: '1px solid var(--app-success-border)' }}>
                Completed
              </span>
            )}
            {passedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--app-success-light)', color: 'var(--app-success)', border: '1px solid var(--app-success-border)' }}>
                ✓ {passedCount} passed
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{tc.summary}</p>
          <div className="flex flex-wrap items-center gap-2">
            {tc.tags.slice(0, 4).map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
            {tc.tags.length > 4 && (
              <span className="text-xs text-muted-foreground">+{tc.tags.length - 4} more</span>
            )}
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar size={12} />
            {new Date(tc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </Link>
    </li>
  )
}

// ── Story row ────────────────────────────────────────────────────────────────

function StoryRow({ story }: { story: Story }) {
  const meta = STORY_STATUS_META[story.status]
  const counts = story.userStories.length + story.requirements.length + story.processFlows.length

  return (
    <li>
      <Link
        to="/stories/$id"
        params={{ id: story.id }}
        className="flex items-start gap-3 px-4 py-4 transition-colors hover:bg-foreground/5"
      >
        <span className="flex-shrink-0 mt-0.5">
          <BookOpen size={16} style={{ color: 'var(--app-accent-color)' }} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-medium text-foreground">{story.title || 'Untitled Story'}</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={meta.style}>
              {meta.label}
            </span>
          </div>
          {story.summary && (
            <p className="text-sm text-muted-foreground line-clamp-1 mb-2">{story.summary}</p>
          )}
          <div className="flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--app-text-secondary)' }}>
            <span>{story.userStories.length} user stor{story.userStories.length === 1 ? 'y' : 'ies'}</span>
            <span>{story.requirements.length} requirement{story.requirements.length === 1 ? '' : 's'}</span>
            <span>{story.processFlows.length} flow{story.processFlows.length === 1 ? '' : 's'}</span>
            {counts === 0 && <span className="italic">Empty — click to fill in</span>}
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarClock size={12} />
            {new Date(story.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
      </Link>
    </li>
  )
}

// ── Project detail header ─────────────────────────────────────────────────────

function ProjectHeader({ project }: { project: Project }) {
  const isOverdue = project.deadline && new Date(project.deadline) < new Date()
  const daysLeft = project.deadline
    ? Math.ceil((new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div
      className="rounded-xl p-5 mb-8"
      style={{ background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)', backdropFilter: 'blur(10px)' }}
    >
      {project.description && (
        <p className="text-sm text-muted-foreground mb-3">{project.description}</p>
      )}

      {project.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {project.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs" style={{ color: 'var(--app-text-secondary)' }}>
        {(project.timelineStart || project.timelineEnd) && (
          <span className="inline-flex items-center gap-1">
            <Clock size={12} />
            {project.timelineStart && new Date(project.timelineStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {project.timelineStart && project.timelineEnd && ' – '}
            {project.timelineEnd && new Date(project.timelineEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        )}

        {project.deadline && (
          <span
            className="inline-flex items-center gap-1"
            style={isOverdue ? { color: '#f87171' } : daysLeft !== null && daysLeft <= 7 ? { color: '#fbbf24' } : {}}
          >
            <Calendar size={12} />
            Deadline: {new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {isOverdue && <span className="font-medium">(overdue)</span>}
            {!isOverdue && daysLeft !== null && daysLeft <= 7 && (
              <span className="font-medium">({daysLeft}d left)</span>
            )}
          </span>
        )}

        {project.createdBy && (
          <span>Created by {project.createdBy}</span>
        )}
      </div>
    </div>
  )
}

// ── Members section ──────────────────────────────────────────────────────────

function MembersSection({ projectId, ownerId }: { projectId: number; ownerId: number }) {
  const canManage = useHasPermission('STAFF_CREATE_PROJECT')
  const session = getSession()

  const [members, setMembers] = useState<ProjectMember[]>([])
  const [ownerName, setOwnerName] = useState<string>('')
  const [users, setUsers] = useState<AppUser[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getProjectMembers(projectId).then((data) => {
      setMembers(data.members)
      if (data.owner) setOwnerName(data.owner.username)
    })
  }, [projectId])

  useEffect(() => {
    if (showAdd && users.length === 0) {
      fetchUsers().then(setUsers)
    }
  }, [showAdd])

  // Filter out owner and existing members from the picker
  const existingIds = new Set([ownerId, ...members.map((m) => m.userId)])
  const availableUsers = users.filter((u) => !existingIds.has(u.id))

  const handleAdd = async () => {
    if (!selectedUserId) return
    setBusy(true)
    setError('')
    try {
      const member = await addProjectMember(projectId, selectedUserId)
      setMembers((prev) => [...prev, member])
      setSelectedUserId(null)
      setShowAdd(false)
    } catch {
      setError('Failed to add member')
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async (userId: number) => {
    setBusy(true)
    setError('')
    try {
      await removeProjectMember(projectId, userId)
      setMembers((prev) => prev.filter((m) => m.userId !== userId))
    } catch {
      setError('Failed to remove member')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="rounded-xl p-5 mb-8"
      style={{ background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)', backdropFilter: 'blur(10px)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-muted-foreground" />
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Members ({members.length + 1})
          </h3>
        </div>
        {canManage && session?.id === ownerId && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-foreground/10"
            style={{ border: '1px solid var(--app-glass-border)' }}
          >
            {showAdd ? <X size={14} /> : <UserPlus size={14} />}
            {showAdd ? 'Cancel' : 'Add Member'}
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400 mb-3">{error}</p>
      )}

      {/* Add member form */}
      {showAdd && (
        <div className="flex items-center gap-2 mb-4 p-3 rounded-lg" style={{ background: 'var(--app-section-header-bg)', border: '1px solid var(--app-glass-border)' }}>
          <select
            value={selectedUserId ?? ''}
            onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
            className="flex-1 text-sm px-3 py-2 rounded-lg bg-background border"
            style={{ borderColor: 'var(--app-glass-border)' }}
          >
            <option value="">Select a user...</option>
            {availableUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!selectedUserId || busy}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--app-btn-primary)', color: 'var(--app-btn-text)' }}
          >
            Add
          </button>
        </div>
      )}

      {/* Member list */}
      <div className="space-y-2">
        {/* Owner */}
        <div className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'var(--app-section-header-bg)' }}>
          <div className="flex items-center gap-2">
            <Crown size={14} className="text-yellow-500" />
            <span className="text-sm font-medium">{ownerName}</span>
            <span className="text-xs text-muted-foreground">(Owner)</span>
          </div>
        </div>

        {/* Members */}
        {members.map((m) => (
          <div key={m.membershipId} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: 'var(--app-section-header-bg)' }}>
            <div className="flex items-center gap-2">
              <Users size={14} className="text-muted-foreground" />
              <span className="text-sm">{m.username}</span>
              <span className="text-xs text-muted-foreground">
                added {new Date(m.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
            {canManage && session?.id === ownerId && (
              <button
                onClick={() => handleRemove(m.userId)}
                disabled={busy}
                className="p-1 rounded transition-colors hover:bg-red-500/20 text-muted-foreground hover:text-red-400 disabled:opacity-50"
                title="Remove member"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}

        {members.length === 0 && (
          <p className="text-xs text-muted-foreground px-3 py-2">No additional members yet.</p>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

function ProjectDetailPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const { projects, loading: projectsLoading } = useProjects()
  const statuses = useAllTestStatuses()
  const priorities = useAllTestPriorities()
  const expectedCounts = useAllExpectedCounts()

  const [testCases, setTestCases] = useState<CustomTestCase[]>([])
  const [loadingCases, setLoadingCases] = useState(true)
  const [stories, setStories] = useState<Story[]>([])
  const [loadingStories, setLoadingStories] = useState(true)

  const project = projects.find((p) => p.id === Number(id))

  useEffect(() => {
    setLoadingCases(true)
    api<CustomTestCase[]>(`/custom-test-cases?projectId=${id}`)
      .then((data) => setTestCases(data))
      .catch(() => setTestCases([]))
      .finally(() => setLoadingCases(false))
  }, [id])

  useEffect(() => {
    setLoadingStories(true)
    api<Story[]>(`/stories?projectId=${id}`)
      .then((data) => setStories(data))
      .catch(() => setStories([]))
      .finally(() => setLoadingStories(false))
  }, [id])

  const loading = projectsLoading || loadingCases || loadingStories

  if (loading) {
    return <LoadingCurtain visible={true} message="Loading Project" />
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--app-bg)' }}>
        <div className="text-center">
          <FolderOpen size={48} className="mx-auto mb-4" style={{ color: 'var(--app-text-secondary)' }} />
          <h2 className="text-xl font-bold mb-2">Project Not Found</h2>
          <p className="text-muted-foreground mb-4">This project doesn't exist or has been deleted.</p>
          <button
            onClick={() => navigate({ to: '/projects' })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: 'var(--app-btn-primary)', color: 'var(--app-btn-text)' }}
          >
            <ArrowLeft size={16} />
            Back to Projects
          </button>
        </div>
      </div>
    )
  }

  const slugs = testCases.map((tc) => `custom:${tc.id}`)

  return (
    <div
      className="min-h-screen text-foreground overflow-hidden relative"
      style={{ background: 'var(--app-bg)', fontFamily: "'Segoe UI', system-ui, sans-serif" }}
    >
      <style>{`
        @keyframes movepd {
          from { transform: translate(-10%, -10%); }
          to   { transform: translate(20%, 20%); }
        }
        .blob-pd {
          position: absolute;
          border-radius: 50%;
          background: var(--app-accent-gradient);
          filter: blur(80px);
          opacity: 0.3;
          animation: movepd 20s infinite alternate;
          pointer-events: none;
        }
      `}</style>
      <div className="blob-pd" style={{ width: 400, height: 400, top: -100, left: -100 }} />
      <div className="blob-pd" style={{ width: 300, height: 300, bottom: -50, right: -50, animationDelay: '-5s' }} />

      <div className="max-w-4xl mx-auto px-4 py-12 relative z-10">
        {/* Back + title */}
        <div className="flex items-start gap-4 mb-6">
          <button
            onClick={() => navigate({ to: '/projects' })}
            className="mt-1 p-2 rounded-lg transition-colors hover:bg-foreground/10"
            style={{ border: '1px solid var(--app-glass-border)' }}
          >
            <ArrowLeft size={18} className="text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-3xl font-bold mb-1">{project.name}</h1>
            <p className="text-muted-foreground text-sm">
              {testCases.length} test plan{testCases.length !== 1 ? 's' : ''}
              {' · '}
              {stories.length} stor{stories.length === 1 ? 'y' : 'ies'} in this project
            </p>
          </div>
        </div>

        {/* Project info */}
        {(project.description || project.tags.length > 0 || project.timelineStart || project.deadline) && (
          <ProjectHeader project={project} />
        )}

        {/* Members */}
        <MembersSection projectId={project.id} ownerId={project.userId} />

        {/* Status summary */}
        <StatusSummary statuses={statuses} total={testCases.length} slugs={slugs} />

        {/* Stories list */}
        <div
          className="rounded-lg overflow-hidden mb-6"
          style={{ background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)', backdropFilter: 'blur(10px)' }}
        >
          <div
            className="px-4 py-3 flex items-center gap-2"
            style={{ borderBottom: '1px solid var(--app-glass-border)', background: 'var(--app-section-header-bg)', backdropFilter: 'blur(12px)' }}
          >
            <BookOpen size={14} className="text-muted-foreground" />
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Stories ({stories.length})
            </h2>
          </div>

          {stories.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-muted-foreground text-sm">
                No stories linked to this project yet.
              </p>
            </div>
          ) : (
            <ul className="divide-y" style={{ borderColor: 'var(--app-glass-border)' }}>
              {stories.map((story) => (
                <StoryRow key={story.id} story={story} />
              ))}
            </ul>
          )}
        </div>

        {/* Test plan list */}
        <div
          className="rounded-lg overflow-hidden"
          style={{ background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)', backdropFilter: 'blur(10px)' }}
        >
          <div
            className="px-4 py-3"
            style={{ borderBottom: '1px solid var(--app-glass-border)', background: 'var(--app-section-header-bg)', backdropFilter: 'blur(12px)' }}
          >
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              All Test Plans ({testCases.length})
            </h2>
          </div>

          {testCases.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-muted-foreground text-sm">
                No test plans in this project yet.
              </p>
            </div>
          ) : (
            <ul className="divide-y" style={{ borderColor: 'var(--app-glass-border)' }}>
              {testCases.map((tc) => {
                const slug = `custom:${tc.id}`
                const resolvedStatus: TestStatus = statuses[slug] ?? 'pending'
                const resolvedPriority = priorities[slug] ?? tc.priority
                const passedCount = expectedCounts[slug] ?? 0
                return (
                  <TestPlanRow
                    key={tc.id}
                    tc={tc}
                    resolvedStatus={resolvedStatus}
                    resolvedPriority={resolvedPriority}
                    passedCount={passedCount}
                  />
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
