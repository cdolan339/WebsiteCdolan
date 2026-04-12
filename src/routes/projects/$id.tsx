import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useProjects, type Project } from '@/lib/projects'
import { api } from '@/lib/api'
import { useAllTestStatuses, useAllTestPriorities, useAllExpectedCounts, type TestStatus } from '@/lib/useTestStatus'
import { Badge } from '@/components/ui/badge'
import { LoadingCurtain } from '@/components/LoadingCurtain'
import { useState, useEffect } from 'react'
import {
  CheckCircle2, XCircle, Clock, Ban, Calendar, ArrowLeft, FolderOpen,
} from 'lucide-react'
import type { CustomTestCase } from '@/lib/customTestCases'

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

// ── Test case row ─────────────────────────────────────────────────────────────

function TestCaseRow({ tc, resolvedStatus, resolvedPriority, passedCount }: {
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
            <span className="font-medium text-foreground">{tc.title || 'Untitled Test Case'}</span>
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

  const project = projects.find((p) => p.id === Number(id))

  useEffect(() => {
    setLoadingCases(true)
    api<CustomTestCase[]>(`/custom-test-cases?projectId=${id}`)
      .then((data) => setTestCases(data))
      .catch(() => setTestCases([]))
      .finally(() => setLoadingCases(false))
  }, [id])

  const loading = projectsLoading || loadingCases

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
              {testCases.length} test case{testCases.length !== 1 ? 's' : ''} in this project
            </p>
          </div>
        </div>

        {/* Project info */}
        {(project.description || project.tags.length > 0 || project.timelineStart || project.deadline) && (
          <ProjectHeader project={project} />
        )}

        {/* Status summary */}
        <StatusSummary statuses={statuses} total={testCases.length} slugs={slugs} />

        {/* Test case list */}
        <div
          className="rounded-lg overflow-hidden"
          style={{ background: 'var(--app-glass)', border: '1px solid var(--app-glass-border)', backdropFilter: 'blur(10px)' }}
        >
          <div
            className="px-4 py-3"
            style={{ borderBottom: '1px solid var(--app-glass-border)', background: 'var(--app-section-header-bg)', backdropFilter: 'blur(12px)' }}
          >
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              All Test Cases ({testCases.length})
            </h2>
          </div>

          {testCases.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-muted-foreground text-sm">
                No test cases in this project yet.
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
                  <TestCaseRow
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
