import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useTestOrder } from '@/lib/useTestOrder'
import { Badge } from '@/components/ui/badge'
import { HoverCard, HoverCardTrigger, HoverCardContent } from '@/components/ui/hover-card'
import { Calendar, CheckCircle2, XCircle, Clock, Ban, Plus, CheckCheck, ChevronDown, FolderOpen } from 'lucide-react'
import { useAllTestStatuses, useAllTestPriorities, useAllExpectedCounts, type TestStatus } from '@/lib/useTestStatus'
import { useCustomTestCases, completeTestCase, reloadForProject } from '@/lib/customTestCases'
import { useProjects, useActiveProjectId, type Project } from '@/lib/projects'
import { LoadingCurtain } from '@/components/LoadingCurtain'
import { useState, useCallback, useRef, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'

export const Route = createFileRoute('/homepage')({
  component: TestCaseIndex,
})

type StatusConfig = {
  label: string
  icon: React.ReactNode
  rowClass: string
  dotClass: string
}

const STATUS_CONFIG: { [K in TestStatus]: StatusConfig } = {
  pass: {
    label: 'Pass',
    icon: <CheckCircle2 size={16} className="text-green-500" />,
    rowClass: 'hover:bg-white/5',
    dotClass: 'bg-green-500',
  },
  fail: {
    label: 'Fail',
    icon: <XCircle size={16} className="text-red-500" />,
    rowClass: 'hover:bg-white/5',
    dotClass: 'bg-red-500',
  },
  pending: {
    label: 'Pending',
    icon: <Clock size={16} className="text-yellow-500" />,
    rowClass: 'hover:bg-white/5',
    dotClass: 'bg-yellow-500',
  },
  blocked: {
    label: 'Blocked',
    icon: <Ban size={16} className="text-orange-500" />,
    rowClass: 'hover:bg-white/5',
    dotClass: 'bg-orange-500',
  },
}

const PRIORITY_BADGE: { [key: string]: React.CSSProperties } = {
  low:      { background: 'rgba(148,163,184,0.15)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.3)' },
  medium:   { background: 'rgba(0,210,255,0.15)',   color: '#00d2ff', border: '1px solid rgba(0,210,255,0.3)'   },
  high:     { background: 'rgba(168,85,247,0.15)',  color: '#a855f7', border: '1px solid rgba(168,85,247,0.3)'  },
  critical: { background: 'rgba(244,63,142,0.15)',  color: '#f43f8e', border: '1px solid rgba(244,63,142,0.3)'  },
}

// ── Project selector dropdown (switch only — create/edit on /projects page) ──

function ProjectSelector({
  projects,
  activeProjectId,
  onSelect,
}: {
  projects: Project[]
  activeProjectId: number | null
  onSelect: (id: number | null) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const activeProject = projects.find((p) => p.id === activeProjectId)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.15)',
          color: activeProject ? '#fff' : 'rgba(255,255,255,0.5)',
        }}
      >
        <FolderOpen size={15} className="opacity-60" />
        <span className="truncate max-w-[200px]">{activeProject?.name ?? 'All Projects'}</span>
        <ChevronDown size={14} className={`opacity-50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-2 z-50 w-72 rounded-xl overflow-hidden"
          style={{
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            background: 'rgba(15,12,41,0.97)',
            border: '1px solid rgba(255,255,255,0.15)',
            backdropFilter: 'blur(16px)',
          }}
        >
          {/* All Projects option */}
          <button
            onMouseDown={() => { onSelect(null); setOpen(false) }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors"
            style={{
              background: activeProjectId === null ? 'rgba(106,17,203,0.2)' : 'transparent',
              color: activeProjectId === null ? '#fff' : 'rgba(255,255,255,0.7)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
            onMouseEnter={(e) => { if (activeProjectId !== null) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
            onMouseLeave={(e) => { if (activeProjectId !== null) e.currentTarget.style.background = 'transparent' }}
          >
            <FolderOpen size={15} className="opacity-50" />
            All Projects
          </button>

          {/* Project list */}
          <div className="max-h-60 overflow-y-auto">
            {projects.map((project) => (
              <button
                key={project.id}
                onMouseDown={() => { onSelect(project.id); setOpen(false) }}
                className="w-full flex items-center px-4 py-2.5 text-sm transition-colors text-left"
                style={{
                  background: activeProjectId === project.id ? 'rgba(106,17,203,0.2)' : 'transparent',
                  color: activeProjectId === project.id ? '#fff' : 'rgba(255,255,255,0.7)',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
                onMouseEnter={(e) => { if (activeProjectId !== project.id) e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                onMouseLeave={(e) => { if (activeProjectId !== project.id) e.currentTarget.style.background = activeProjectId === project.id ? 'rgba(106,17,203,0.2)' : 'transparent' }}
              >
                <span className="truncate">{project.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

type Tab = 'active' | 'completed'

// Unified display type for both content-collection and custom test cases
type DisplayTC = {
  slug: string
  title: string
  summary: string
  priority: string
  tags: string[]
  createdAt: string
  isCustom: boolean
  customId?: string
  completed?: boolean
  completedAt?: string | null
}

type StatusSummaryProps = {
  statuses: { [key: string]: TestStatus }
  total: number
  slugs: string[]
}

function StatusSummary({ statuses, total, slugs }: StatusSummaryProps) {
  // Only count statuses for slugs in the current filtered view
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
          <div key={status} className="flex items-center gap-3 rounded-lg p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
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

// ── Complete button with popover confirm ──────────────────────────────────

function CompleteButton({ tc, onComplete }: { tc: DisplayTC; onComplete: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="relative">
      {!confirming ? (
        <button
          onClick={(e) => { e.stopPropagation(); setConfirming(true) }}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-all hover:scale-105"
          style={{
            background: 'rgba(0,210,255,0.1)',
            color: '#00d2ff',
            border: '1px solid rgba(0,210,255,0.25)',
          }}
        >
          <CheckCheck size={13} />
          Complete
        </button>
      ) : (
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-xs text-white/60">Complete this?</span>
          <button
            onClick={() => { onComplete(tc.customId!); setConfirming(false) }}
            className="text-xs px-3 py-1 rounded-md font-semibold transition-all hover:scale-105"
            style={{ background: 'linear-gradient(45deg, #6a11cb, #00d2ff)', color: '#fff' }}
          >
            Yes
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-xs px-3 py-1 rounded-md font-medium transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            No
          </button>
        </div>
      )}
    </div>
  )
}

// ── Reactivate button for completed tab ───────────────────────────────────

function ReactivateButton({ tc, onReactivate }: { tc: DisplayTC; onReactivate: (id: string) => void }) {
  const [confirming, setConfirming] = useState(false)

  return (
    <div className="relative">
      {!confirming ? (
        <button
          onClick={(e) => { e.stopPropagation(); setConfirming(true) }}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-all hover:scale-105"
          style={{
            background: 'rgba(168,85,247,0.1)',
            color: '#a855f7',
            border: '1px solid rgba(168,85,247,0.25)',
          }}
        >
          Reactivate
        </button>
      ) : (
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-xs text-white/60">Move to Active?</span>
          <button
            onClick={() => { onReactivate(tc.customId!); setConfirming(false) }}
            className="text-xs px-3 py-1 rounded-md font-semibold transition-all hover:scale-105"
            style={{ background: 'linear-gradient(45deg, #6a11cb, #00d2ff)', color: '#fff' }}
          >
            Yes
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="text-xs px-3 py-1 rounded-md font-medium transition-colors"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            No
          </button>
        </div>
      )}
    </div>
  )
}

// ── Test case row ──────────────────────────────────────────────────────────

type TestCaseRowProps = {
  tc: DisplayTC
  resolvedStatus: TestStatus
  resolvedPriority: string
  passedCount: number
  tab: Tab
  onComplete: (id: string) => void
  onReactivate: (id: string) => void
}

function SortableTestCaseRow({ tc, resolvedStatus, resolvedPriority, passedCount, tab, onComplete, onReactivate }: TestCaseRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tc.slug,
  })

  const cfg = STATUS_CONFIG[resolvedStatus]

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 10 : undefined,
  }

  const titleLinkClass = "font-medium text-foreground hover:underline py-3 block"
  const titleLink = <Link to="/test-cases/custom/$id" params={{ id: tc.customId! }} className={titleLinkClass} onClick={(e) => e.stopPropagation()}>{tc.title || "Untitled Test Case"}</Link>

  return (
    <li ref={setNodeRef} style={style}>
      <div
        {...attributes}
        {...listeners}
        className={`flex items-start gap-3 px-4 py-4 transition-colors cursor-grab active:cursor-grabbing ${cfg.rowClass}`}
      >
        <span className="flex-shrink-0 mt-3.5">{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {titleLink}
            <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={PRIORITY_BADGE[resolvedPriority] ?? PRIORITY_BADGE['medium']}>
              {resolvedPriority}
            </span>
            {passedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(22,163,74,0.2)', color: '#4ade80', border: '1px solid rgba(22,163,74,0.3)' }}>
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
              <HoverCard>
                <HoverCardTrigger asChild>
                  <span className="text-xs text-muted-foreground cursor-default">
                    +{tc.tags.length - 4} more
                  </span>
                </HoverCardTrigger>
                <HoverCardContent className="w-auto p-3">
                  <div className="flex flex-wrap gap-1.5">
                    {tc.tags.slice(4).map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}
          </div>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar size={12} />
            {new Date(tc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          {tab === 'active' && (
            <CompleteButton tc={tc} onComplete={onComplete} />
          )}
          {tab === 'completed' && (
            <ReactivateButton tc={tc} onReactivate={onReactivate} />
          )}
        </div>
      </div>
    </li>
  )
}

function TestCaseIndex() {
  const navigate = useNavigate()
  const statuses = useAllTestStatuses()
  const priorities = useAllTestPriorities()
  const expectedCounts = useAllExpectedCounts()
  const { cases: customCases, loading } = useCustomTestCases()
  const { projects } = useProjects()
  const [activeProjectId, setActiveProjectId] = useActiveProjectId()
  const [tab, setTab] = useState<Tab>('active')

  const handleProjectSwitch = useCallback((id: number | null) => {
    setActiveProjectId(id)
    reloadForProject(id)
  }, [setActiveProjectId])

  // Split cases into active vs completed
  const activeCases = customCases.filter((tc) => !tc.completed)
  const completedCases = customCases.filter((tc) => tc.completed)
  const visibleCases = tab === 'active' ? activeCases : completedCases

  // Build the canonical default slug list from visible cases only
  const getDefaultSlugs = useCallback(() => {
    return visibleCases
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((tc) => `custom:${tc.id}`)
  }, [visibleCases])

  const { order, setOrder } = useTestOrder(getDefaultSlugs())

  // Build a lookup map from visible cases
  const tcMap = new Map<string, DisplayTC>(
    visibleCases.map((tc): [string, DisplayTC] => [
      `custom:${tc.id}`,
      { slug: `custom:${tc.id}`, title: tc.title, summary: tc.summary, priority: tc.priority, tags: tc.tags, createdAt: tc.createdAt, isCustom: true, customId: tc.id, completed: tc.completed, completedAt: tc.completedAt },
    ])
  )

  const sorted = order.map((s) => tcMap.get(s)).filter(Boolean) as DisplayTC[]
  const visibleSlugs = sorted.map((tc) => tc.slug)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = order.indexOf(active.id as string)
    const newIndex = order.indexOf(over.id as string)
    setOrder(arrayMove(order, oldIndex, newIndex))
  }, [order, setOrder])

  const handleCreate = () => {
    navigate({ to: '/test-cases/custom/new' })
  }

  const handleComplete = useCallback((id: string) => {
    completeTestCase(id, true)
  }, [])

  const handleReactivate = useCallback((id: string) => {
    completeTestCase(id, false)
  }, [])

  if (loading) {
    return <LoadingCurtain visible={true} message="Loading Test Cases" />
  }

  return (
    <div className="min-h-screen text-foreground overflow-hidden relative" style={{ background: '#0f0c29', fontFamily: "'Poppins', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap');
        @keyframes movehp {
          from { transform: translate(-10%, -10%); }
          to   { transform: translate(20%, 20%); }
        }
        .blob-hp {
          position: absolute;
          border-radius: 50%;
          background: linear-gradient(45deg, #6a11cb, #00d2ff);
          filter: blur(80px);
          opacity: 0.3;
          animation: movehp 20s infinite alternate;
          pointer-events: none;
        }
      `}</style>
      <div className="blob-hp" style={{ width: 400, height: 400, top: -100, left: -100 }} />
      <div className="blob-hp" style={{ width: 300, height: 300, bottom: -50, right: -50, animationDelay: '-5s' }} />
      <div className="max-w-4xl mx-auto px-4 py-12 relative z-10">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">QA & BA Assistant Tool</h1>
            <p className="text-muted-foreground text-lg">
              Track, manage, write, and review your test cases in one place.
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium flex-shrink-0 mt-1 transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(45deg, #6a11cb, #00d2ff)' }}
          >
            <Plus size={16} />
            New Test Case
          </button>
        </div>

        {/* ── Project selector ────────────────────────────────── */}
        <div className="mb-6">
          <ProjectSelector
            projects={projects}
            activeProjectId={activeProjectId}
            onSelect={handleProjectSwitch}
          />
        </div>

        {/* ── Tabs ─────────────────────────────────────────────── */}
        <div className="flex gap-1 mb-6 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={() => setTab('active')}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-semibold transition-all"
            style={tab === 'active' ? {
              background: 'linear-gradient(45deg, rgba(106,17,203,0.4), rgba(0,210,255,0.4))',
              color: '#fff',
              boxShadow: '0 2px 12px rgba(106,17,203,0.3)',
            } : {
              background: 'transparent',
              color: 'rgba(255,255,255,0.45)',
            }}
          >
            <Clock size={15} />
            Active
            <span
              className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={tab === 'active'
                ? { background: 'rgba(255,255,255,0.15)', color: '#fff' }
                : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }
              }
            >
              {activeCases.length}
            </span>
          </button>
          <button
            onClick={() => setTab('completed')}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-semibold transition-all"
            style={tab === 'completed' ? {
              background: 'linear-gradient(45deg, rgba(106,17,203,0.4), rgba(0,210,255,0.4))',
              color: '#fff',
              boxShadow: '0 2px 12px rgba(106,17,203,0.3)',
            } : {
              background: 'transparent',
              color: 'rgba(255,255,255,0.45)',
            }}
          >
            <CheckCheck size={15} />
            Completed
            <span
              className="text-xs px-2 py-0.5 rounded-full font-bold"
              style={tab === 'completed'
                ? { background: 'rgba(255,255,255,0.15)', color: '#fff' }
                : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }
              }
            >
              {completedCases.length}
            </span>
          </button>
        </div>

        <StatusSummary statuses={statuses} total={visibleCases.length} slugs={visibleSlugs} />

        <div className="rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(10px)' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(106,17,203,0.25)', backdropFilter: 'blur(12px)' }}>
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              {tab === 'active' ? 'Test Cases' : 'Completed Test Cases'} ({sorted.length})
            </h2>
          </div>

          {sorted.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-muted-foreground text-sm">
                {tab === 'active'
                  ? 'No active test cases. Create one to get started!'
                  : 'No completed test cases yet.'}
              </p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToWindowEdges]}>
              <SortableContext items={order} strategy={verticalListSortingStrategy}>
                <ul className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
                  {sorted.map((tc) => {
                    const resolvedStatus: TestStatus = statuses[tc.slug] ?? 'pending'
                    const resolvedPriority = tc.isCustom
                      ? tc.priority
                      : (priorities[tc.slug] ?? tc.priority)
                    const passedCount = expectedCounts[tc.slug] ?? 0
                    return (
                      <SortableTestCaseRow
                        key={tc.slug}
                        tc={tc}
                        resolvedStatus={resolvedStatus}
                        resolvedPriority={resolvedPriority}
                        passedCount={passedCount}
                        tab={tab}
                        onComplete={handleComplete}
                        onReactivate={handleReactivate}
                      />
                    )
                  })}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </div>
  )
}
