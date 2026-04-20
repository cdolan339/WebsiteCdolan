import { createFileRoute, Link } from '@tanstack/react-router'
import { useProjects, useActiveProjectId, type Project } from '@/lib/projects'
import { useStories, type Story } from '@/lib/stories'
import { useCustomTestCases, type CustomTestCase } from '@/lib/customTestCases'
import { useAllTestStatuses, type TestStatus } from '@/lib/useTestStatus'
import { LoadingCurtain } from '@/components/LoadingCurtain'
import {
  PageShell, SectionHead, Pill, CaseBar, EyebrowChip,
} from '@/components/design/primitives'
import { TrendingUp, ArrowRight, Plus, MoreHorizontal, Folder, FileText, Clipboard } from 'lucide-react'

export const Route = createFileRoute('/homepage')({
  component: Dashboard,
})

const STORY_STATUS_META: Record<Story['status'], { tone: 'blue' | 'purple' | 'amber' | 'green' | 'neutral'; label: string }> = {
  discovery: { tone: 'blue', label: 'Discovery' },
  analysis: { tone: 'purple', label: 'Analysis' },
  development: { tone: 'amber', label: 'Development' },
  uat: { tone: 'amber', label: 'UAT' },
  done: { tone: 'green', label: 'Done' },
}

const TEST_STATUS_META: Record<TestStatus, { tone: 'green' | 'red' | 'amber' | 'neutral'; label: string }> = {
  pass: { tone: 'green', label: 'Passing' },
  fail: { tone: 'red', label: 'Failing' },
  pending: { tone: 'amber', label: 'Pending' },
  blocked: { tone: 'neutral', label: 'Blocked' },
}

const MAX_PROJECTS = 6
const MAX_STORIES = 4
const MAX_SUITES = 4

/* ─── Metric hero card ───────────────────────────────── */

function MetricCard({
  icon, label, value, gradient, accent, trend, to,
}: {
  icon: React.ReactNode; label: string; value: number
  gradient: string; accent: string; trend: string; to: string
}) {
  return (
    <Link
      to={to}
      className="panel"
      style={{
        padding: '18px 20px', position: 'relative', overflow: 'hidden',
        display: 'block', textDecoration: 'none', color: 'var(--ink)',
        transition: 'transform .15s, border-color .15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{
        position: 'absolute', top: -30, right: -30, width: 180, height: 180,
        background: `radial-gradient(circle, ${accent}22, transparent 65%)`,
        pointerEvents: 'none',
      }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative' }}>
        <div className={'section-icon ' + gradient} style={{ width: 36, height: 36, borderRadius: 10, display: 'grid', placeItems: 'center', color: 'white', flexShrink: 0 }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="tz-mono" style={{ fontSize: 10.5, color: 'var(--mute)', letterSpacing: '0.08em' }}>{label}</div>
          <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, marginTop: 2 }}>{value}</div>
          <div style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <TrendingUp size={11} style={{ color: accent }} />
            {trend}
          </div>
        </div>
      </div>
    </Link>
  )
}

/* ─── Project card ───────────────────────────────────── */

function ProjectCard({ project }: { project: Project }) {
  const deadline = project.deadline ? new Date(project.deadline) : null
  const daysLeft = deadline ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
  const overdue = daysLeft !== null && daysLeft < 0
  const soon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7

  const dueLabel = deadline ? deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null

  return (
    <Link
      to="/projects/$id"
      params={{ id: String(project.id) }}
      className="panel"
      style={{
        padding: 18, textDecoration: 'none', color: 'var(--ink)',
        display: 'block', transition: 'all .15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ color: 'var(--purple)', display: 'inline-flex' }}><Folder size={16} /></span>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }} className="tz-truncate">{project.name}</span>
        <span style={{ flex: 1 }} />
        <MoreHorizontal size={14} style={{ color: 'var(--mute)' }} />
      </div>
      {project.description && (
        <p style={{ fontSize: 13, color: 'var(--mute)', margin: '0 0 14px', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {project.description}
        </p>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {deadline && (overdue ? (
          <Pill tone="red" icon="alert">{Math.abs(daysLeft!)}d overdue</Pill>
        ) : soon ? (
          <Pill tone="amber" icon="clock">{daysLeft}d left</Pill>
        ) : (
          <Pill tone="neutral" icon="calendar">{dueLabel}</Pill>
        ))}
        {project.tags.slice(0, 2).map((tag) => (
          <Pill key={tag} tone="purple" icon="tag">{tag}</Pill>
        ))}
      </div>
    </Link>
  )
}

/* ─── Story preview row ──────────────────────────────── */

function StoryPreviewRow({ story, projectName }: { story: Story; projectName: string | null }) {
  const meta = STORY_STATUS_META[story.status]
  return (
    <Link
      to="/stories/$id"
      params={{ id: story.id }}
      style={{
        padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16,
        transition: 'background .15s', textDecoration: 'none', color: 'var(--ink)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--panel-2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ color: 'var(--pink)', display: 'inline-flex' }}><FileText size={15} /></span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em' }} className="tz-truncate">{story.title || 'Untitled Story'}</div>
        {story.summary && (
          <div className="tz-truncate" style={{ fontSize: 12.5, color: 'var(--mute)', marginTop: 2 }}>{story.summary}</div>
        )}
      </div>
      {projectName && <Pill tone="blue" icon="folder">{projectName}</Pill>}
      <Pill tone={meta.tone}>{meta.label}</Pill>
      <ArrowRight size={14} style={{ color: 'var(--mute-2)' }} />
    </Link>
  )
}

/* ─── Suite preview row ──────────────────────────────── */

function SuitePreviewRow({
  suite, projectName, statuses,
}: { suite: CustomTestCase; projectName: string | null; statuses: Record<string, TestStatus> }) {
  const slug = `custom:${suite.id}`
  const status: TestStatus = statuses[slug] ?? 'pending'
  const meta = TEST_STATUS_META[status]
  const total = suite.testCases?.length ?? 0
  const cases = { pass: status === 'pass' ? total : 0, fail: status === 'fail' ? total : 0, pending: status === 'pending' ? total : 0, blocked: status === 'blocked' ? total : 0 }

  return (
    <Link
      to="/test-cases/custom/$id"
      params={{ id: suite.id }}
      style={{
        padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16,
        transition: 'background .15s', textDecoration: 'none', color: 'var(--ink)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--panel-2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ color: 'var(--orange)', display: 'inline-flex' }}><Clipboard size={15} /></span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.005em' }} className="tz-truncate">{suite.title || 'Untitled Suite'}</div>
        {suite.summary && (
          <div className="tz-truncate" style={{ fontSize: 12.5, color: 'var(--mute)', marginTop: 2 }}>{suite.summary}</div>
        )}
      </div>
      {projectName && <Pill tone="blue" icon="folder">{projectName}</Pill>}
      <div style={{ width: 140, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1 }}>
          <CaseBar cases={cases} total={Math.max(total, 1)} />
        </div>
        <span className="tz-mono" style={{ fontSize: 11, color: 'var(--mute)' }}>{total}</span>
      </div>
      <Pill tone={meta.tone}>{meta.label}</Pill>
      <ArrowRight size={14} style={{ color: 'var(--mute-2)' }} />
    </Link>
  )
}

/* ─── Empty state ────────────────────────────────────── */

function EmptyState({ message, cta, ctaTo }: { message: string; cta?: string; ctaTo?: string }) {
  return (
    <div
      className="panel"
      style={{
        padding: '28px 20px', textAlign: 'center',
        background: 'var(--panel-2)', borderStyle: 'dashed',
      }}
    >
      <p style={{ fontSize: 13.5, color: 'var(--mute)', margin: '0 0 12px' }}>{message}</p>
      {cta && ctaTo && (
        <Link to={ctaTo} className="tz-btn tz-btn-gradient" style={{ textDecoration: 'none' }}>
          <Plus size={13} /> {cta}
        </Link>
      )}
    </div>
  )
}

/* ─── Dashboard ──────────────────────────────────────── */

function Dashboard() {
  const { projects, loading: projectsLoading } = useProjects()
  const { stories, loading: storiesLoading } = useStories()
  const { cases: suites, loading: suitesLoading } = useCustomTestCases()
  const [activeProjectId] = useActiveProjectId()
  const statuses = useAllTestStatuses()

  const loading = projectsLoading || storiesLoading || suitesLoading
  if (loading) return <LoadingCurtain visible message="Loading Dashboard" />

  const projectNameById = new Map<number, string>(projects.map((p) => [p.id, p.name]))
  const activeProject = activeProjectId ? projects.find((p) => p.id === activeProjectId) : null

  const recentStories = [...stories]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, MAX_STORIES)

  const recentSuites = [...suites]
    .filter((s) => !s.completed)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, MAX_SUITES)

  const topProjects = [...projects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, MAX_PROJECTS)

  const activeStories = stories.filter(s => s.status !== 'done').length
  const activeSuites = suites.filter(s => !s.completed).length

  return (
    <PageShell>
      <div style={{ paddingTop: 56 }}>
        <EyebrowChip icon="home" tone="purple">Dashboard</EyebrowChip>
        <h1 className="display">{activeProject ? activeProject.name : 'All Projects'}</h1>
        <p className="subhead">
          {activeProject
            ? activeProject.description || 'Your project at a glance.'
            : 'An overview of your projects, stories, and test suites.'}
        </p>
      </div>

      {/* Metric hero cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 32 }}>
        <MetricCard
          icon={<Folder size={24} strokeWidth={2} />} label="PROJECTS" value={projects.length}
          gradient="grad-purple" accent="var(--purple)"
          trend={`${projects.length > 0 ? '+' : ''}${projects.length} total`}
          to="/projects"
        />
        <MetricCard
          icon={<FileText size={24} strokeWidth={2} />} label="STORIES" value={stories.length}
          gradient="grad-pink" accent="var(--pink)"
          trend={`${activeStories} active`}
          to="/stories"
        />
        <MetricCard
          icon={<Clipboard size={24} strokeWidth={2} />} label="TEST SUITES" value={suites.length}
          gradient="grad-orange" accent="var(--orange)"
          trend={`${activeSuites} active`}
          to="/test-suites"
        />
      </div>

      {/* Projects */}
      <SectionHead
        icon="folder" gradient="grad-aurora-projects" label="Projects" meta={projects.length}
        action={<>
          <Link to="/projects" className="tz-btn tz-btn-gradient" style={{ textDecoration: 'none' }}><Plus size={13} /> New Project</Link>
          <Link to="/projects" className="tz-btn tz-btn-ghost" style={{ textDecoration: 'none' }}>View all <ArrowRight size={13} /></Link>
        </>}
      />
      {topProjects.length === 0 ? (
        <EmptyState message="No projects yet. Create one to organize your stories and test suites." cta="Create Project" ctaTo="/projects" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
          {topProjects.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}

      {/* Stories */}
      <SectionHead
        icon="file-text" gradient="grad-aurora-stories" label="Stories" meta={stories.length}
        action={<>
          <Link to="/stories" className="tz-btn tz-btn-gradient" style={{ textDecoration: 'none' }}><Plus size={13} /> New Story</Link>
          <Link to="/stories" className="tz-btn tz-btn-ghost" style={{ textDecoration: 'none' }}>View all <ArrowRight size={13} /></Link>
        </>}
      />
      {recentStories.length === 0 ? (
        <EmptyState
          message={activeProject ? `No stories in ${activeProject.name} yet.` : 'No stories yet. Capture requirements with the BA tools.'}
          cta="Create Story" ctaTo="/stories"
        />
      ) : (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          {recentStories.map((s, i) => (
            <div key={s.id}>
              {i > 0 && <div className="hairline" />}
              <StoryPreviewRow story={s} projectName={s.projectId ? projectNameById.get(s.projectId) ?? null : null} />
            </div>
          ))}
        </div>
      )}

      {/* Test Suites */}
      <SectionHead
        icon="clipboard" gradient="grad-aurora-suites" label="Test Suites" meta={suites.length}
        action={<>
          <Link to="/test-cases/custom/new" className="tz-btn tz-btn-gradient" style={{ textDecoration: 'none' }}><Plus size={13} /> New Suite</Link>
          <Link to="/test-suites" className="tz-btn tz-btn-ghost" style={{ textDecoration: 'none' }}>View all <ArrowRight size={13} /></Link>
        </>}
      />
      {recentSuites.length === 0 ? (
        <EmptyState
          message={activeProject ? `No active test suites in ${activeProject.name} yet.` : 'No active test suites yet. Build your first suite to start tracking QA coverage.'}
          cta="Create Test Suite" ctaTo="/test-cases/custom/new"
        />
      ) : (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          {recentSuites.map((t, i) => (
            <div key={t.id}>
              {i > 0 && <div className="hairline" />}
              <SuitePreviewRow suite={t} projectName={t.projectId ? projectNameById.get(t.projectId) ?? null : null} statuses={statuses} />
            </div>
          ))}
        </div>
      )}
    </PageShell>
  )
}
