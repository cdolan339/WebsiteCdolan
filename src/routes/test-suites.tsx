import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useTestOrder } from '@/lib/useTestOrder'
import { CheckCircle2, XCircle, Clock, Ban, Plus, CheckCheck, ChevronDown, FolderOpen, Trash2, RotateCcw, ChevronRight, ArrowRight } from 'lucide-react'
import { useAllTestStatuses, useAllTestPriorities, useAllExpectedCounts, type TestStatus } from '@/lib/useTestStatus'
import { useCustomTestCases, completeTestCase, deleteCustomTestCase, reloadForProject, type CustomTestCase } from '@/lib/customTestCases'
import { useProjects, useActiveProjectId, type Project } from '@/lib/projects'
import { LoadingCurtain } from '@/components/LoadingCurtain'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { restrictToWindowEdges } from '@dnd-kit/modifiers'
import {
  PageShell, Pill, PriorityPill, CaseBar, Segmented, EyebrowChip, type PriorityLevel,
} from '@/components/design/primitives'

export const Route = createFileRoute('/test-suites')({
  component: TestSuitesPage,
})

type Tab = 'active' | 'completed'

const GRID_COLS = '28px minmax(240px, 2fr) 110px 120px 160px 110px 80px 36px'

const STATUS_META: Record<TestStatus, { color: string; Icon: React.ComponentType<{ size?: number }> }> = {
  pass: { color: 'var(--green)', Icon: CheckCircle2 },
  fail: { color: 'var(--red)', Icon: XCircle },
  pending: { color: 'var(--amber)', Icon: Clock },
  blocked: { color: 'var(--mute-2)', Icon: Ban },
}

/* ─── Project picker ─────────────────────────────── */

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
              padding: '10px 12px', border: 0,
              background: activeProjectId === null ? 'var(--chip)' : 'transparent',
              color: 'var(--ink)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
              textAlign: 'left', borderBottom: '1px solid var(--border)',
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
                  color: 'var(--ink)', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 13, textAlign: 'left',
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

/* ─── Status metric card ─────────────────────────── */

function StatusMetric({ label, value, color, dotColor }: { label: string; value: number; color: string; dotColor: string }) {
  return (
    <div className="panel" style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--mute)', fontSize: 11.5 }}>
        <span style={{ width: 6, height: 6, borderRadius: 999, background: dotColor, display: 'inline-block' }} />
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em', color, marginTop: 4, lineHeight: 1 }}>
        {value}
      </div>
    </div>
  )
}

/* ─── Dense table row ─────────────────────────────── */

type RowProps = {
  tc: CustomTestCase
  projectName: string | null
  status: TestStatus
  priority: PriorityLevel
  passedCount: number
  tab: Tab
  onComplete: (id: string) => void
  onReactivate: (id: string) => void
  onDelete: (id: string) => void
}

function DenseRow({ tc, projectName, status, priority, passedCount, tab, onComplete, onReactivate, onDelete }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: `custom:${tc.id}` })
  const navigate = useNavigate()
  const meta = STATUS_META[status]
  const StatusIcon = meta.Icon
  const total = tc.testCases?.length ?? 0
  const cases = {
    pass: passedCount,
    fail: status === 'fail' ? 1 : 0,
    pending: Math.max(total - passedCount - (status === 'fail' ? 1 : 0), 0),
    blocked: status === 'blocked' ? 1 : 0,
  }

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ? 'transform 200ms ease' : undefined,
    opacity: isDragging ? 0.55 : 1,
    background: 'transparent',
    display: 'grid',
    gridTemplateColumns: GRID_COLS,
    gap: 10,
    padding: '12px 14px',
    cursor: 'pointer',
    borderTop: '1px solid var(--border)',
    alignItems: 'center',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--panel-2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      onClick={() => navigate({ to: '/test-cases/custom/$id', params: { id: tc.id } })}
    >
      <span {...attributes} {...listeners} style={{ color: meta.color, display: 'inline-flex', cursor: 'grab' }} title={status}>
        <StatusIcon size={16} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="tz-truncate" style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 2, color: 'var(--ink)' }}>
          {tc.title || 'Untitled Test Plan'}
        </div>
        <div className="tz-truncate" style={{ fontSize: 11.5, color: 'var(--mute)' }}>
          {tc.summary || (projectName ? `In ${projectName}` : 'No summary')}
        </div>
      </div>
      <PriorityPill level={priority} />
      {projectName ? <Pill tone="purple" icon="folder">{projectName}</Pill> : <span className="tz-mono" style={{ fontSize: 11, color: 'var(--mute-2)' }}>—</span>}
      <div>
        <CaseBar cases={cases} total={Math.max(total, 1)} height={4} />
        <div className="tz-mono" style={{ fontSize: 10.5, color: 'var(--mute)', marginTop: 3 }}>
          {passedCount}/{total} pass{cases.fail ? ` · ${cases.fail}F` : ''}
        </div>
      </div>
      <span className="tz-mono" style={{ fontSize: 11.5, color: 'var(--mute)' }}>
        {formatShort(tc.updatedAt)}
      </span>
      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
        {tab === 'active' ? (
          <button className="tz-btn tz-btn-ghost" style={{ padding: 6 }} title="Complete" onClick={() => onComplete(tc.id)}>
            <CheckCheck size={13} />
          </button>
        ) : (
          <button className="tz-btn tz-btn-ghost" style={{ padding: 6 }} title="Reactivate" onClick={() => onReactivate(tc.id)}>
            <RotateCcw size={13} />
          </button>
        )}
        <button
          className="tz-btn tz-btn-ghost" style={{ padding: 6, color: 'var(--red)' }}
          title="Delete"
          onClick={() => { if (confirm('Delete this test plan?')) onDelete(tc.id) }}
        >
          <Trash2 size={13} />
        </button>
      </div>
      <ChevronRight size={14} style={{ color: 'var(--mute-2)' }} />
    </div>
  )
}

/* ─── Main ────────────────────────────────────────── */

function TestSuitesPage() {
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

  const activeCases = customCases.filter((tc) => !tc.completed)
  const completedCases = customCases.filter((tc) => tc.completed)
  const visibleCases = tab === 'active' ? activeCases : completedCases

  const getDefaultSlugs = useCallback(() => {
    return [...visibleCases]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((tc) => `custom:${tc.id}`)
  }, [visibleCases])

  const { order, setOrder } = useTestOrder(getDefaultSlugs())

  const projectLookup = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects])
  const caseMap = useMemo(
    () => new Map<string, CustomTestCase>(visibleCases.map((tc) => [`custom:${tc.id}`, tc])),
    [visibleCases],
  )
  const sortedCases = order.map((s) => caseMap.get(s)).filter((v): v is CustomTestCase => !!v)

  // Aggregate totals across visible cases
  const totals = sortedCases.reduce(
    (acc, tc) => {
      const slug = `custom:${tc.id}`
      const status = statuses[slug] ?? 'pending'
      const total = tc.testCases?.length ?? 0
      const passed = expectedCounts[slug] ?? 0
      acc.pass += passed
      if (status === 'fail') acc.fail += Math.max(total - passed, 1)
      else if (status === 'blocked') acc.blocked += Math.max(total - passed, 1)
      else acc.pending += Math.max(total - passed, 0)
      return acc
    },
    { pass: 0, fail: 0, pending: 0, blocked: 0 },
  )

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = order.indexOf(active.id as string)
    const newIndex = order.indexOf(over.id as string)
    setOrder(arrayMove(order, oldIndex, newIndex))
  }, [order, setOrder])

  if (loading) return <LoadingCurtain visible message="Loading Test Suites" />

  const headerLabels = ['', 'TEST PLAN', 'PRIORITY', 'PROJECT', 'CASES', 'UPDATED', 'ACTIONS', '']

  return (
    <PageShell>
      <div style={{ paddingTop: 56, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <EyebrowChip icon="target" tone="orange">Quality Assurance Workspace</EyebrowChip>
          <h1 className="display">Test Suites</h1>
          <p className="subhead">Track, manage, write, and review your test plans in one place.</p>
        </div>
        <button
          className="tz-btn tz-btn-gradient" style={{ marginTop: 30 }}
          onClick={() => navigate({ to: '/test-cases/custom/new' })}
        >
          <Plus size={13} /> New Test Plan
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 28, flexWrap: 'wrap' }}>
        <ProjectPicker projects={projects} activeProjectId={activeProjectId} onSelect={handleProjectSwitch} />
      </div>

      <div style={{ marginTop: 18 }}>
        <Segmented
          variant="gradient"
          options={[
            { value: 'active', label: 'Active', icon: 'clock', count: activeCases.length },
            { value: 'completed', label: 'Completed', icon: 'check-circle', count: completedCases.length },
          ]}
          value={tab}
          onChange={(v) => setTab(v as Tab)}
        />
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginTop: 20 }}>
        <StatusMetric label="Passing" value={totals.pass} color="var(--green)" dotColor="var(--green)" />
        <StatusMetric label="Failing" value={totals.fail} color="var(--red)" dotColor="var(--red)" />
        <StatusMetric label="Pending" value={totals.pending} color="var(--amber)" dotColor="var(--amber)" />
        <StatusMetric label="Blocked" value={totals.blocked} color="var(--mute)" dotColor="var(--mute-2)" />
      </div>

      {/* Dense table */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden', marginTop: 20 }}>
        <div
          style={{
            display: 'grid', gridTemplateColumns: GRID_COLS, gap: 10,
            padding: '10px 14px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--panel-2)',
            fontSize: 10.5, letterSpacing: '0.08em', color: 'var(--mute)', fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {headerLabels.map((h, i) => <span key={i}>{h}</span>)}
        </div>

        {sortedCases.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--mute)' }}>
            {tab === 'active' ? 'No active test plans. Create one to get started.' : 'No completed test plans yet.'}
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToWindowEdges]}>
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              {sortedCases.map((tc) => {
                const slug = `custom:${tc.id}`
                const status: TestStatus = statuses[slug] ?? 'pending'
                const priority = (priorities[slug] ?? tc.priority) as PriorityLevel
                const passedCount = expectedCounts[slug] ?? 0
                const projectName = tc.projectId ? projectLookup.get(tc.projectId) ?? null : null
                return (
                  <DenseRow
                    key={tc.id}
                    tc={tc}
                    projectName={projectName}
                    status={status}
                    priority={priority}
                    passedCount={passedCount}
                    tab={tab}
                    onComplete={(id) => completeTestCase(id, true)}
                    onReactivate={(id) => completeTestCase(id, false)}
                    onDelete={(id) => deleteCustomTestCase(id)}
                  />
                )
              })}
            </SortableContext>
          </DndContext>
        )}
      </div>

      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
        <Link to="/homepage" className="tz-btn tz-btn-ghost" style={{ textDecoration: 'none' }}>
          Back to Dashboard <ArrowRight size={12} />
        </Link>
      </div>
    </PageShell>
  )
}

function formatShort(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch { return '' }
}
