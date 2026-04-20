import { createFileRoute, Link } from '@tanstack/react-router'
import { useProjects, useActiveProjectId, type Project } from '@/lib/projects'
import { useStories, type Story } from '@/lib/stories'
import { useCustomTestCases, type CustomTestCase } from '@/lib/customTestCases'
import { useAllTestStatuses, type TestStatus } from '@/lib/useTestStatus'
import { LoadingCurtain } from '@/components/LoadingCurtain'
import {
  FolderOpen, FileText, ClipboardList, Plus, ArrowRight, Calendar,
  CheckCircle2, XCircle, Clock, Ban, Sparkles,
} from 'lucide-react'

export const Route = createFileRoute('/homepage')({
  component: Dashboard,
})

// ── Shared styles / constants ─────────────────────────────────────────────

const STORY_STATUS_COLORS: Record<Story['status'], { bg: string; color: string; border: string; label: string }> = {
  discovery:   { bg: 'rgba(59,130,246,0.15)',  color: '#3b82f6', border: 'rgba(59,130,246,0.3)',  label: 'Discovery' },
  analysis:    { bg: 'rgba(168,85,247,0.15)',  color: '#a855f7', border: 'rgba(168,85,247,0.3)',  label: 'Analysis' },
  development: { bg: 'rgba(234,179,8,0.15)',   color: '#eab308', border: 'rgba(234,179,8,0.3)',   label: 'Development' },
  uat:         { bg: 'rgba(249,115,22,0.15)',  color: '#f97316', border: 'rgba(249,115,22,0.3)',  label: 'UAT' },
  done:        { bg: 'rgba(22,163,74,0.15)',   color: '#16a34a', border: 'rgba(22,163,74,0.3)',   label: 'Done' },
}

const TEST_STATUS_ICON: Record<TestStatus, { icon: React.ReactNode; color: string }> = {
  pass:    { icon: <CheckCircle2 size={13} />, color: '#16a34a' },
  fail:    { icon: <XCircle size={13} />,      color: '#dc2626' },
  pending: { icon: <Clock size={13} />,        color: '#ca8a04' },
  blocked: { icon: <Ban size={13} />,          color: '#ea580c' },
}

const MAX_STORIES = 6
const MAX_SUITES = 6
const MAX_PROJECTS = 8

// ── Stat card ─────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  gradient,
  to,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  gradient: string
  to: string
}) {
  return (
    <Link
      to={to}
      className="group stat-card rounded-2xl p-6 relative overflow-hidden block transition-all duration-300 hover:-translate-y-1"
      style={{
        background: 'var(--app-glass)',
        border: '1px solid var(--app-glass-border)',
        backdropFilter: 'blur(14px)',
      }}
    >
      {/* Ambient glow (intensifies on hover) */}
      <div
        className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-25 group-hover:opacity-60 transition-opacity duration-500"
        style={{ background: gradient, filter: 'blur(36px)' }}
      />
      {/* Subtle inner ring on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 0 1px var(--app-accent-color)',
        }}
      />

      <div className="relative z-10 flex items-center gap-4">
        {/* Icon disc with gradient */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
          style={{
            background: gradient,
            color: '#fff',
            boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
          }}
        >
          {icon}
        </div>

        {/* Label + value */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
            <span className="text-xs uppercase tracking-wider font-semibold">{label}</span>
          </div>
          <p className="text-3xl font-bold leading-none">{value}</p>
        </div>

        {/* Arrow indicator */}
        <ArrowRight
          size={18}
          className="flex-shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300"
        />
      </div>
    </Link>
  )
}

// ── Project card ──────────────────────────────────────────────────────────

function ProjectCard({ project }: { project: Project }) {
  const deadline = project.deadline ? new Date(project.deadline) : null
  const daysLeft = deadline
    ? Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const urgency: 'past' | 'soon' | 'normal' | null =
    daysLeft === null ? null : daysLeft < 0 ? 'past' : daysLeft <= 7 ? 'soon' : 'normal'

  const urgencyStyle =
    urgency === 'past'
      ? { color: '#dc2626', bg: 'rgba(220,38,38,0.12)', border: 'rgba(220,38,38,0.3)' }
      : urgency === 'soon'
      ? { color: '#ea580c', bg: 'rgba(234,88,12,0.12)', border: 'rgba(234,88,12,0.3)' }
      : { color: 'var(--app-text-secondary)', bg: 'var(--app-glass)', border: 'var(--app-glass-border)' }

  return (
    <Link
      to="/projects/$id"
      params={{ id: String(project.id) }}
      className="group rounded-xl p-5 block transition-all hover:-translate-y-0.5"
      style={{
        background: 'var(--app-glass)',
        border: '1px solid var(--app-glass-border)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="p-2 rounded-lg flex-shrink-0"
            style={{ background: 'var(--app-accent-bg)', color: 'var(--app-accent-color)' }}
          >
            <FolderOpen size={16} />
          </div>
          <h3 className="font-semibold text-base truncate">{project.name}</h3>
        </div>
        <ArrowRight
          size={16}
          className="text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-2"
        />
      </div>

      {project.description && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {project.description}
        </p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {deadline && (
          <span
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              background: urgencyStyle.bg,
              color: urgencyStyle.color,
              border: `1px solid ${urgencyStyle.border}`,
            }}
          >
            <Calendar size={10} />
            {urgency === 'past'
              ? `${Math.abs(daysLeft!)}d overdue`
              : urgency === 'soon'
              ? `${daysLeft}d left`
              : deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
        {project.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'var(--app-glass)', color: 'var(--app-text-secondary)', border: '1px solid var(--app-glass-border)' }}
          >
            {tag}
          </span>
        ))}
      </div>
    </Link>
  )
}

// ── Story row ─────────────────────────────────────────────────────────────

function StoryRow({ story, projectName }: { story: Story; projectName: string | null }) {
  const statusCfg = STORY_STATUS_COLORS[story.status]

  return (
    <Link
      to="/stories/$id"
      params={{ id: story.id }}
      className="group flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-white/5 dashboard-row"
    >
      <div
        className="p-2 rounded-lg flex-shrink-0"
        style={{ background: 'var(--app-accent-bg)', color: 'var(--app-accent-color)' }}
      >
        <FileText size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{story.title || 'Untitled Story'}</p>
        {story.summary && (
          <p className="text-xs text-muted-foreground truncate">{story.summary}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {projectName && (
          <span
            className="hidden md:inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'var(--app-accent-bg)', color: 'var(--app-accent-color)', border: '1px solid var(--app-glass-border)' }}
          >
            <FolderOpen size={10} />
            {projectName}
          </span>
        )}
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}` }}
        >
          {statusCfg.label}
        </span>
        <ArrowRight
          size={14}
          className="text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
        />
      </div>
    </Link>
  )
}

// ── Test suite row ────────────────────────────────────────────────────────

function SuiteRow({
  suite,
  projectName,
  statuses,
}: {
  suite: CustomTestCase
  projectName: string | null
  statuses: Record<string, TestStatus>
}) {
  const slug = `custom:${suite.id}`
  const status: TestStatus = statuses[slug] ?? 'pending'
  const statusCfg = TEST_STATUS_ICON[status]
  const caseCount = suite.testCases?.length ?? 0

  return (
    <Link
      to="/test-cases/custom/$id"
      params={{ id: suite.id }}
      className="group flex items-center gap-3 px-4 py-3 rounded-lg transition-all hover:bg-white/5 dashboard-row"
    >
      <div
        className="p-2 rounded-lg flex-shrink-0"
        style={{ background: 'var(--app-accent-bg)', color: 'var(--app-accent-color)' }}
      >
        <ClipboardList size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{suite.title || 'Untitled Suite'}</p>
        {suite.summary && (
          <p className="text-xs text-muted-foreground truncate">{suite.summary}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {projectName && (
          <span
            className="hidden md:inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: 'var(--app-accent-bg)', color: 'var(--app-accent-color)', border: '1px solid var(--app-glass-border)' }}
          >
            <FolderOpen size={10} />
            {projectName}
          </span>
        )}
        <span
          className="hidden sm:inline text-xs text-muted-foreground"
        >
          {caseCount} {caseCount === 1 ? 'case' : 'cases'}
        </span>
        <span
          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium capitalize"
          style={{ color: statusCfg.color, background: `${statusCfg.color}15`, border: `1px solid ${statusCfg.color}40` }}
        >
          {statusCfg.icon}
          {status}
        </span>
        <ArrowRight
          size={14}
          className="text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
        />
      </div>
    </Link>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────

function Section({
  title,
  icon,
  iconGradient,
  viewAllTo,
  viewAllLabel,
  createTo,
  createLabel,
  children,
}: {
  title: string
  icon: React.ReactNode
  iconGradient?: string
  viewAllTo?: string
  viewAllLabel?: string
  createTo?: string
  createLabel?: string
  children: React.ReactNode
}) {
  const heading = (
    <div className="flex items-center gap-2 group">
      <div
        className="p-2 rounded-lg"
        style={
          iconGradient
            ? { background: iconGradient, color: '#fff' }
            : { background: 'var(--app-accent-bg)', color: 'var(--app-accent-color)' }
        }
      >
        {icon}
      </div>
      <h2 className="text-xl font-bold">{title}</h2>
    </div>
  )

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        {viewAllTo ? (
          <Link
            to={viewAllTo}
            className="transition-opacity hover:opacity-80"
            style={{ color: 'var(--app-text)', textDecoration: 'none' }}
          >
            {heading}
          </Link>
        ) : (
          heading
        )}
        <div className="flex items-center gap-2">
          {createTo && (
            <Link
              to={createTo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-90"
              style={{ background: 'var(--app-btn-primary)', color: 'var(--app-btn-text)' }}
            >
              <Plus size={13} />
              {createLabel ?? 'New'}
            </Link>
          )}
          {viewAllTo && (
            <Link
              to={viewAllTo}
              className="inline-flex items-center gap-1 text-xs font-medium transition-colors"
              style={{ color: 'var(--app-accent-color)' }}
            >
              {viewAllLabel ?? 'View all'}
              <ArrowRight size={12} />
            </Link>
          )}
        </div>
      </div>
      {children}
    </section>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────

function EmptyState({
  message,
  cta,
  ctaTo,
}: {
  message: string
  cta?: string
  ctaTo?: string
}) {
  return (
    <div
      className="rounded-xl px-6 py-10 text-center"
      style={{
        background: 'var(--app-glass)',
        border: '1px dashed var(--app-glass-border)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <p className="text-sm text-muted-foreground mb-3">{message}</p>
      {cta && ctaTo && (
        <Link
          to={ctaTo}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
          style={{ background: 'var(--app-btn-primary)', color: 'var(--app-btn-text)' }}
        >
          <Plus size={14} />
          {cta}
        </Link>
      )}
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────

function Dashboard() {
  const { projects, loading: projectsLoading } = useProjects()
  const { stories, loading: storiesLoading } = useStories()
  const { cases: suites, loading: suitesLoading } = useCustomTestCases()
  const [activeProjectId] = useActiveProjectId()
  const statuses = useAllTestStatuses()

  const loading = projectsLoading || storiesLoading || suitesLoading

  if (loading) {
    return <LoadingCurtain visible={true} message="Loading Dashboard" />
  }

  // Project name lookup for badges
  const projectNameById = new Map<number, string>(projects.map((p) => [p.id, p.name]))

  const activeProject = activeProjectId ? projects.find((p) => p.id === activeProjectId) : null

  // Recent items (cache is already project-scoped by hooks)
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

  return (
    <div
      className="min-h-screen text-foreground overflow-hidden relative"
      style={{ background: 'var(--app-bg)', fontFamily: "'Segoe UI', system-ui, sans-serif" }}
    >
      <style>{`
        @keyframes movedash {
          from { transform: translate(-10%, -10%); }
          to   { transform: translate(20%, 20%); }
        }
        .blob-dash {
          position: absolute;
          border-radius: 50%;
          background: var(--app-accent-gradient);
          filter: blur(80px);
          opacity: 0.18;
          animation: movedash 20s infinite alternate;
          pointer-events: none;
        }
        .dark .dashboard-row {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
        }
        :root:not(.dark) .dashboard-row {
          background: rgba(0,0,0,0.015);
          border: 1px solid rgba(0,0,0,0.08);
        }
      `}</style>
      <div className="blob-dash" style={{ width: 400, height: 400, top: -100, left: -100 }} />
      <div className="blob-dash" style={{ width: 300, height: 300, bottom: -50, right: -50, animationDelay: '-5s' }} />

      <div className="max-w-6xl mx-auto px-4 py-12 relative z-10">
        {/* ── Hero ─────────────────────────────────────────── */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2 text-muted-foreground text-sm">
            <Sparkles size={14} />
            <span>Dashboard</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            {activeProject ? activeProject.name : 'All Projects'}
          </h1>
          <p className="text-muted-foreground text-lg">
            {activeProject
              ? activeProject.description || 'Your project at a glance.'
              : 'An overview of your projects, stories, and test suites.'}
          </p>
        </div>

        {/* ── Stats strip ──────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <StatCard
            icon={<FolderOpen size={20} />}
            label="Projects"
            value={projects.length}
            gradient="linear-gradient(135deg, #3b82f6, #8b5cf6)"
            to="/projects"
          />
          <StatCard
            icon={<FileText size={20} />}
            label="Stories"
            value={stories.length}
            gradient="linear-gradient(135deg, #a855f7, #ec4899)"
            to="/stories"
          />
          <StatCard
            icon={<ClipboardList size={20} />}
            label="Test Suites"
            value={suites.length}
            gradient="linear-gradient(135deg, #f59e0b, #ef4444)"
            to="/test-suites"
          />
        </div>

        {/* ── Projects ─────────────────────────────────────── */}
        <Section
          title="Projects"
          icon={<FolderOpen size={16} />}
          iconGradient="linear-gradient(135deg, #3b82f6, #8b5cf6)"
          viewAllTo="/projects"
          createTo="/projects"
          createLabel="New Project"
        >
          {topProjects.length === 0 ? (
            <EmptyState
              message="No projects yet. Create one to organize your stories and test suites."
              cta="Create Project"
              ctaTo="/projects"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {topProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </Section>

        {/* ── Stories ──────────────────────────────────────── */}
        <Section
          title="Stories"
          icon={<FileText size={16} />}
          iconGradient="linear-gradient(135deg, #a855f7, #ec4899)"
          viewAllTo="/stories"
          createTo="/stories"
          createLabel="New Story"
        >
          {recentStories.length === 0 ? (
            <EmptyState
              message={
                activeProject
                  ? `No stories in ${activeProject.name} yet.`
                  : 'No stories yet. Capture requirements with the BA tools.'
              }
              cta="Create Story"
              ctaTo="/stories"
            />
          ) : (
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: 'var(--app-glass)',
                border: '1px solid var(--app-glass-border)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div className="flex flex-col gap-1 p-2">
                {recentStories.map((story) => (
                  <StoryRow
                    key={story.id}
                    story={story}
                    projectName={story.projectId ? projectNameById.get(story.projectId) ?? null : null}
                  />
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* ── Test Suites ──────────────────────────────────── */}
        <Section
          title="Test Suites"
          icon={<ClipboardList size={16} />}
          iconGradient="linear-gradient(135deg, #f59e0b, #ef4444)"
          viewAllTo="/test-suites"
          createTo="/test-cases/custom/new"
          createLabel="New Suite"
        >
          {recentSuites.length === 0 ? (
            <EmptyState
              message={
                activeProject
                  ? `No active test suites in ${activeProject.name} yet.`
                  : 'No active test suites yet. Build your first suite to start tracking QA coverage.'
              }
              cta="Create Test Suite"
              ctaTo="/test-cases/custom/new"
            />
          ) : (
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: 'var(--app-glass)',
                border: '1px solid var(--app-glass-border)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <div className="flex flex-col gap-1 p-2">
                {recentSuites.map((suite) => (
                  <SuiteRow
                    key={suite.id}
                    suite={suite}
                    projectName={suite.projectId ? projectNameById.get(suite.projectId) ?? null : null}
                    statuses={statuses}
                  />
                ))}
              </div>
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
