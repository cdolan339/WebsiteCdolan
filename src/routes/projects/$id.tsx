import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  useProjects, setActiveProjectId, type Project, type ProjectMember, type AppUser,
  getProjectMembers, addProjectMember, removeProjectMember, fetchUsers,
} from '@/lib/projects'
import { api } from '@/lib/api'
import { useAllTestStatuses, useAllExpectedCounts, useAllFailedCounts, useAllBlockedCounts, type TestStatus } from '@/lib/useTestStatus'
import { useHasPermission } from '@/lib/permissions'
import { getSession } from '@/lib/auth'
import { useState, useEffect, useMemo } from 'react'
import {
  ChevronLeft, FolderOpen, Edit3, BookOpen, Clipboard,
  MessageSquare, Settings, Plus, Filter, Tag, ChevronRight,
  ArrowRight, FileText, AlertTriangle, Link as LinkIcon, GitBranch,
  Target, Check, X, Users, Crown, UserPlus,
} from 'lucide-react'
import { Pill, PriorityPill, CaseBar, Ring, colorForName } from '@/components/design/primitives'
import type { CustomTestCase } from '@/lib/customTestCases'
import type { Story, StoryStatus } from '@/lib/stories'

export const Route = createFileRoute('/projects/$id')({
  component: ProjectDetailPage,
})

type Tab = 'overview' | 'stories' | 'tests' | 'activity' | 'settings'

// ── Constants ─────────────────────────────────────────────────────────────────

const HEALTH_META: Record<string, { label: string; tone: 'green' | 'amber' | 'red'; color: string }> = {
  'on-track': { label: 'On track', tone: 'green', color: 'var(--green)' },
  'at-risk':  { label: 'At risk',  tone: 'amber', color: 'var(--amber)' },
  'blocked':  { label: 'Blocked',  tone: 'red',   color: 'var(--red)'   },
}

const STORY_STATUS_TONE: Record<StoryStatus, 'green' | 'blue' | 'purple' | 'amber' | 'neutral'> = {
  discovery:   'blue',
  analysis:    'purple',
  development: 'amber',
  uat:         'amber',
  done:        'green',
}

const STORY_STATUS_LABEL: Record<StoryStatus, string> = {
  discovery:   'Discovery',
  analysis:    'Analysis',
  development: 'Development',
  uat:         'UAT',
  done:        'Done',
}

// Generates a trend shaped by the actual health of the project.
// - No data yet → flat zero line
// - Has failures → peak-then-decline (regression narrative)
// - All passing  → smooth upward progress curve
function generateTrend(currentPct: number, failCount: number, totalCases: number): number[] {
  const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)))

  if (totalCases === 0 || (currentPct === 0 && failCount === 0)) {
    return Array(10).fill(0)
  }

  if (failCount > 0) {
    // Regression: project was healthier before, failures drove it down
    const peak = clamp(currentPct + 20 + Math.min(failCount, 4) * 6)
    const d = peak - currentPct
    return [
      clamp(currentPct - 8),
      clamp(currentPct + d * 0.20),
      clamp(currentPct + d * 0.45),
      clamp(currentPct + d * 0.70),
      clamp(currentPct + d * 0.88),
      peak,
      clamp(peak - d * 0.28),
      clamp(peak - d * 0.55),
      clamp(peak - d * 0.80),
      currentPct,
    ]
  }

  // Steady improvement: start at ~50% of current, end exactly at current
  const start = Math.max(0, currentPct * 0.5)
  return [0, 0.28, 0.20, 0.42, 0.36, 0.54, 0.68, 0.79, 0.91, 1.0]
    .map(t => clamp(start + (currentPct - start) * t))
}

type ActivityEntry = {
  id: number
  userId: number | null
  username: string
  action: string
  meta: Record<string, unknown>
  createdAt: string
}

function describeAction(action: string, meta: Record<string, unknown>): string {
  switch (action) {
    case 'project:created':   return 'created this project'
    case 'project:updated':   return 'updated project settings'
    case 'project:completed': return 'marked this project as complete'
    case 'project:reopened':  return 'reopened this project'
    case 'health:changed':    return `changed health to "${meta.health}"`
    case 'member:added':      return `added ${meta.username} to the project`
    case 'member:removed':    return `removed ${meta.username} from the project`
    case 'story:linked':      return `linked story "${meta.title}" to this project`
    case 'test:linked':       return `linked test plan "${meta.title}" to this project`
    default:                  return action
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── Local atoms ───────────────────────────────────────────────────────────────

function Sparkline({ data, height = 56, color = 'var(--green)' }: {
  data: number[]
  height?: number
  color?: string
}) {
  const w = 100
  const min = Math.min(...data) - 4
  const max = Math.max(...data) + 4
  const range = Math.max(max - min, 1)
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * w,
    height - ((v - min) / range) * height,
  ] as [number, number])
  const path = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')
  const area = path + ` L${w},${height} L0,${height} Z`
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      <path d={area} fill={color} fillOpacity={0.12} />
      <path d={path} stroke={color} strokeWidth={1.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={2.5} fill={color} />
    </svg>
  )
}

function PanelSectionHead({ icon, gradient, label, count, action }: {
  icon: React.ReactNode
  gradient: string
  label: string
  count?: number
  action?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <div
        className={gradient}
        style={{ width: 26, height: 26, borderRadius: 7, display: 'grid', placeItems: 'center', color: 'white', flexShrink: 0 }}
      >
        {icon}
      </div>
      <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, letterSpacing: '-0.005em', color: 'var(--ink)' }}>
        {label}
      </h2>
      {count != null && (
        <span className="tz-mono" style={{ fontSize: 11, color: 'var(--mute)' }}>{count}</span>
      )}
      <span style={{ flex: 1 }} />
      {action}
    </div>
  )
}

// ── Row components ────────────────────────────────────────────────────────────

function ProjectStoryRow({ story, onClick }: { story: Story; onClick: () => void }) {
  const pct = story.manualProgress ?? (story.status === 'done' ? 100 : 0)

  return (
    <div
      onClick={onClick}
      style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'background .15s' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel-2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <FileText size={15} style={{ color: 'var(--pink)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="tz-truncate" style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.005em' }}>
          {story.title}
        </div>
        {story.summary && (
          <div className="tz-truncate" style={{ fontSize: 12, color: 'var(--mute)', marginTop: 2 }}>
            {story.summary}
          </div>
        )}
      </div>
      <Pill tone={STORY_STATUS_TONE[story.status]}>{STORY_STATUS_LABEL[story.status]}</Pill>
      <div style={{ width: 90, flexShrink: 0 }}>
        <div className="tz-mono" style={{ fontSize: 10.5, color: 'var(--mute)', marginBottom: 3, textAlign: 'right' }}>
          {pct}%
        </div>
        <CaseBar cases={{ pass: pct, pending: 100 - pct }} total={100} height={3} />
      </div>
      {story.collaborators.length > 0 && (
        <div className="tz-avatar-stack" style={{ flexShrink: 0 }}>
          {story.collaborators.slice(0, 3).map((c, i) => (
            <span
              key={i}
              className="tz-avatar"
              style={{ background: c.color || colorForName(c.name), width: 20, height: 20, fontSize: 8 }}
              title={c.name}
            >
              {c.name[0]}
            </span>
          ))}
        </div>
      )}
      <ChevronRight size={13} style={{ color: 'var(--mute)', flexShrink: 0 }} />
    </div>
  )
}

function ProjectTestRow({ tc, status, passedCount, failedCount, blockedCount, onClick }: { tc: CustomTestCase; status: TestStatus; passedCount: number; failedCount: number; blockedCount: number; onClick: () => void }) {
  const stColor = status === 'pass' ? 'var(--green)' : status === 'fail' ? 'var(--red)' : status === 'blocked' ? 'var(--mute-2)' : 'var(--amber)'
  const total = tc.testCases.length
  const lastUpdated = new Date(tc.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const cases = {
    pass:    passedCount,
    fail:    failedCount,
    blocked: blockedCount,
    pending: Math.max(total - passedCount - failedCount - blockedCount, 0),
  }

  return (
    <div
      onClick={onClick}
      style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', transition: 'background .15s' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--panel-2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: stColor, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="tz-truncate" style={{ fontSize: 13.5, fontWeight: 600 }}>{tc.title}</div>
        {tc.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            {tc.tags.slice(0, 2).map(tag => (
              <span key={tag} className="tz-pill neutral">{tag}</span>
            ))}
          </div>
        )}
      </div>
      <div style={{ width: 120, flexShrink: 0 }}>
        <CaseBar cases={cases} height={4} />
        <div className="tz-mono" style={{ fontSize: 10.5, color: 'var(--mute)', marginTop: 3 }}>
          {passedCount}/{total} pass{failedCount > 0 ? ` · ${failedCount}F` : ''}{blockedCount > 0 ? ` · ${blockedCount}B` : ''}
        </div>
      </div>
      <span className="tz-mono" style={{ fontSize: 11, color: 'var(--mute)', width: 80, textAlign: 'right', flexShrink: 0 }}>
        {lastUpdated}
      </span>
      <ChevronRight size={13} style={{ color: 'var(--mute)', flexShrink: 0 }} />
    </div>
  )
}

// ── Tab components ────────────────────────────────────────────────────────────

function OverviewTab({ project, testCases, stories, cases, statuses, navigate, onNewStory, onNewPlan }: {
  project: Project
  testCases: CustomTestCase[]
  stories: Story[]
  cases: { pass: number; fail: number; pending: number; blocked: number }
  statuses: Record<string, TestStatus>
  navigate: ReturnType<typeof useNavigate>
  onNewStory: () => void
  onNewPlan: () => void
}) {
  const rawTotal = cases.pass + cases.fail + cases.pending + cases.blocked
  const total = rawTotal || 1
  const pct = Math.round((cases.pass / total) * 100)

  // Combined trend: average of test pass rate and story completion avg
  const storyAvgPct = stories.length > 0
    ? Math.round(stories.reduce((sum, s) => sum + (s.manualProgress ?? (s.status === 'done' ? 100 : 0)), 0) / stories.length)
    : null
  const trendPct = storyAvgPct != null && rawTotal > 0
    ? Math.round((storyAvgPct + pct) / 2)
    : storyAvgPct ?? (rawTotal > 0 ? pct : 0)
  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null
  const start = fmt(project.timelineStart)
  const end = fmt(project.timelineEnd)

  return (
    <div>
      {/* Description card */}
      <div className="panel" style={{ padding: 18, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
          <PriorityPill level={project.priority} />
          {project.tags.map(tag => (
            <span key={tag} className="tz-pill purple">
              <Tag size={11} /> {tag}
            </span>
          ))}
          <span style={{ flex: 1 }} />
          {(start || end) && (
            <span className="tz-mono" style={{ fontSize: 11, color: 'var(--mute)' }}>
              {[start, end].filter(Boolean).join(' → ')}
            </span>
          )}
        </div>
        <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55, margin: 0 }}>
          {project.description || 'No description provided.'}
        </p>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14, marginBottom: 14 }}>
        {/* Health card */}
        <div className="panel" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
            <div className="tz-mono" style={{ fontSize: 10.5, color: 'var(--mute)', letterSpacing: '0.08em', fontWeight: 600 }}>
              TEST PASS RATE
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--mute)' }}>
              — % of test plans where all cases passed
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Ring
              value={pct}
              size={56}
              stroke={6}
              color={pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)'}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1 }}>{pct}%</div>
              <div style={{ fontSize: 11.5, color: 'var(--mute)', marginTop: 4, marginBottom: 8 }}>
                {cases.pass} of {rawTotal} test plan{rawTotal !== 1 ? 's' : ''} passing
              </div>
              <CaseBar cases={cases} height={5} />
              <div style={{ display: 'flex', gap: 10, marginTop: 6, fontSize: 10.5, color: 'var(--mute)', flexWrap: 'wrap' }}>
                {([
                  { key: 'pass',    bg: 'var(--green)',   label: 'pass'    },
                  { key: 'fail',    bg: 'var(--red)',     label: 'fail'    },
                  { key: 'pending', bg: 'var(--amber)',   label: 'pending' },
                  { key: 'blocked', bg: 'var(--mute-2)',  label: 'blocked' },
                ] as const).map(({ key, bg, label }) => (
                  <span key={key}>
                    <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 999, background: bg, marginRight: 4, verticalAlign: 'middle' }} />
                    {cases[key]} {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Trend card */}
        <div className="panel" style={{ padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <div className="tz-mono" style={{ fontSize: 10.5, color: 'var(--mute)', letterSpacing: '0.08em', fontWeight: 600 }}>
              OVERALL PROGRESS
            </div>
            <div className="tz-mono" style={{ fontSize: 11, color: trendPct >= 80 ? 'var(--green)' : trendPct >= 50 ? 'var(--amber)' : 'var(--red)', fontWeight: 600 }}>
              {trendPct}% now
            </div>
          </div>
          <Sparkline
            data={generateTrend(trendPct, cases.fail, rawTotal)}
            height={56}
            color={trendPct >= 80 ? 'var(--green)' : trendPct >= 50 ? 'var(--amber)' : 'var(--red)'}
          />
          <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 10.5, color: 'var(--mute)' }}>
            <span>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 999, background: 'var(--purple)', marginRight: 4, verticalAlign: 'middle' }} />
              {pct}% tests passing
            </span>
            {storyAvgPct != null && (
              <span>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: 999, background: 'var(--pink)', marginRight: 4, verticalAlign: 'middle' }} />
                {storyAvgPct}% stories avg
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stories panel */}
      <div style={{ marginBottom: 14 }}>
        <PanelSectionHead
          icon={<BookOpen size={14} />}
          gradient="grad-pink"
          label="Stories"
          count={stories.length}
          action={
            <>
              <button className="tz-btn tz-btn-ghost" style={{ fontSize: 12 }} onClick={() => navigate({ to: '/stories' })}>
                View all <ArrowRight size={11} />
              </button>
              <button className="tz-btn tz-btn-gradient" style={{ padding: '6px 12px', fontSize: 12 }} onClick={onNewStory}>
                <Plus size={12} /> New Story
              </button>
            </>
          }
        />
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          {stories.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>
              No stories linked to this project yet.
            </div>
          ) : (
            stories.slice(0, 3).map((s, i) => (
              <div key={s.id}>
                {i > 0 && <div className="hairline" />}
                <ProjectStoryRow story={s} onClick={() => navigate({ to: '/stories/$id', params: { id: s.id } })} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Test Plans panel */}
      <div>
        <PanelSectionHead
          icon={<Clipboard size={14} />}
          gradient="grad-orange"
          label="Test Plans"
          count={testCases.length}
          action={
            <>
              <button className="tz-btn tz-btn-ghost" style={{ fontSize: 12 }} onClick={() => navigate({ to: '/test-cases/custom/new' })}>
                View all <ArrowRight size={11} />
              </button>
              <button className="tz-btn tz-btn-gradient" style={{ padding: '6px 12px', fontSize: 12 }} onClick={onNewPlan}>
                <Plus size={12} /> New Plan
              </button>
            </>
          }
        />
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          {testCases.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>
              No test plans yet. Create one to get started.
            </div>
          ) : (
            testCases.slice(0, 4).map((tc, i) => (
              <div key={tc.id}>
                {i > 0 && <div className="hairline" />}
                <ProjectTestRow
                  tc={tc}
                  status={statuses[`custom:${tc.id}`] ?? 'pending'}
                  passedCount={expectedCounts[`custom:${tc.id}`] ?? 0}
                  failedCount={failedCounts[`custom:${tc.id}`] ?? 0}
                  blockedCount={blockedCounts[`custom:${tc.id}`] ?? 0}
                  onClick={() => navigate({ to: '/test-cases/custom/$id', params: { id: tc.id } })}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function StoriesTab({ stories, navigate, onNewStory }: { stories: Story[]; navigate: ReturnType<typeof useNavigate>; onNewStory: () => void }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <span className="tz-mono" style={{ fontSize: 11, color: 'var(--mute)', letterSpacing: '0.08em' }}>
          STORIES · {stories.length}
        </span>
        <span style={{ flex: 1 }} />
        <button className="tz-btn" style={{ marginRight: 6 }}><Filter size={12} /> Filter</button>
        <button className="tz-btn tz-btn-gradient" onClick={onNewStory}><Plus size={12} /> New Story</button>
      </div>
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        {stories.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>
            No stories linked to this project yet.
          </div>
        ) : (
          stories.map((s, i) => (
            <div key={s.id}>
              {i > 0 && <div className="hairline" />}
              <ProjectStoryRow story={s} onClick={() => navigate({ to: '/stories/$id', params: { id: s.id } })} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function TestPlansTab({ testCases, statuses, navigate, onNewPlan }: {
  testCases: CustomTestCase[]
  statuses: Record<string, TestStatus>
  navigate: ReturnType<typeof useNavigate>
  onNewPlan: () => void
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <span className="tz-mono" style={{ fontSize: 11, color: 'var(--mute)', letterSpacing: '0.08em' }}>
          TEST PLANS · {testCases.length}
        </span>
        <span style={{ flex: 1 }} />
        <button className="tz-btn tz-btn-gradient" onClick={onNewPlan}><Plus size={12} /> New Plan</button>
      </div>
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        {testCases.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>
            No test plans in this project yet.
          </div>
        ) : (
          testCases.map((tc, i) => (
            <div key={tc.id}>
              {i > 0 && <div className="hairline" />}
              <ProjectTestRow
                tc={tc}
                status={statuses[`custom:${tc.id}`] ?? 'pending'}
                passedCount={expectedCounts[`custom:${tc.id}`] ?? 0}
                failedCount={failedCounts[`custom:${tc.id}`] ?? 0}
                onClick={() => navigate({ to: '/test-cases/custom/$id', params: { id: tc.id } })}
              />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function ActivityTab({ projectId }: { projectId: number }) {
  const [entries, setEntries] = useState<ActivityEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api<ActivityEntry[]>(`/projects/${projectId}/activity`)
      .then(setEntries)
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [projectId])

  return (
    <div className="panel" style={{ padding: 18 }}>
      <PanelSectionHead icon={<MessageSquare size={14} />} gradient="grad-purple" label="Activity" />
      {loading ? (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>
          Loading activity…
        </div>
      ) : entries.length === 0 ? (
        <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--mute)', fontSize: 13 }}>
          No activity yet. Changes to health, members, stories, and test plans will appear here.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {entries.map(entry => (
            <div key={entry.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span
                className="tz-avatar"
                style={{ background: colorForName(entry.username), width: 26, height: 26, fontSize: 10, flexShrink: 0 }}
              >
                {entry.username[0]?.toUpperCase()}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.45 }}>
                  <b style={{ color: 'var(--ink)' }}>{entry.username}</b>{' '}
                  {describeAction(entry.action, entry.meta)}
                </div>
                <div className="tz-mono" style={{ fontSize: 10.5, color: 'var(--mute)', marginTop: 2 }}>
                  {timeAgo(entry.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SettingsTab({ project }: { project: Project }) {
  const canManage = useHasPermission('STAFF_CREATE_PROJECT')
  const session = getSession()
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [ownerName, setOwnerName] = useState('')
  const [users, setUsers] = useState<AppUser[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getProjectMembers(project.id).then(data => {
      setMembers(data.members)
      if (data.owner) setOwnerName(data.owner.username)
    })
  }, [project.id])

  useEffect(() => {
    if (showAdd && users.length === 0) fetchUsers().then(setUsers)
  }, [showAdd])

  const existingIds = new Set([project.userId, ...members.map(m => m.userId)])
  const availableUsers = users.filter(u => !existingIds.has(u.id))

  const handleAdd = async () => {
    if (!selectedUserId) return
    setBusy(true); setError('')
    try {
      const member = await addProjectMember(project.id, selectedUserId)
      setMembers(prev => [...prev, member])
      setSelectedUserId(null); setShowAdd(false)
    } catch { setError('Failed to add member') }
    finally { setBusy(false) }
  }

  const handleRemove = async (userId: number) => {
    setBusy(true); setError('')
    try {
      await removeProjectMember(project.id, userId)
      setMembers(prev => prev.filter(m => m.userId !== userId))
    } catch { setError('Failed to remove member') }
    finally { setBusy(false) }
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 12px',
    background: 'var(--panel-2)',
    border: '1px solid var(--border)',
    borderRadius: 9,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* General */}
      <div className="panel" style={{ padding: 18 }}>
        <PanelSectionHead icon={<Settings size={14} />} gradient="grad-purple" label="General" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Project name', value: project.name },
            { label: 'Description',  value: project.description || '—' },
            { label: 'Visibility',   value: project.visibility },
            { label: 'Priority',     value: project.priority },
          ].map(({ label, value }) => (
            <div key={label} style={rowStyle}>
              <span style={{ fontSize: 12, color: 'var(--mute)', width: 120, flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: 13, flex: 1, color: 'var(--ink-2)' }} className="tz-truncate">{value}</span>
              <button className="tz-btn tz-btn-ghost" style={{ padding: 4 }}><Edit3 size={12} /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Members */}
      <div className="panel" style={{ padding: 18 }}>
        <PanelSectionHead
          icon={<Users size={14} />}
          gradient="grad-blue"
          label="Members"
          count={members.length + 1}
          action={
            canManage && session?.id === project.userId ? (
              <button className="tz-btn tz-btn-ghost" style={{ fontSize: 12 }} onClick={() => setShowAdd(v => !v)}>
                {showAdd ? <><X size={12} /> Cancel</> : <><UserPlus size={12} /> Add member</>}
              </button>
            ) : undefined
          }
        />
        {error && <p style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>{error}</p>}
        {showAdd && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <select
              value={selectedUserId ?? ''}
              onChange={e => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
              className="tz-input"
              style={{ flex: 1 }}
            >
              <option value="">Select a user…</option>
              {availableUsers.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
            </select>
            <button className="tz-btn tz-btn-gradient" onClick={handleAdd} disabled={!selectedUserId || busy}>
              Add
            </button>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={rowStyle}>
            <Crown size={13} style={{ color: 'var(--amber)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{ownerName || '—'}</span>
            <span className="tz-pill neutral">Owner</span>
          </div>
          {members.map(m => (
            <div key={m.membershipId} style={rowStyle}>
              <Users size={13} style={{ color: 'var(--mute)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, flex: 1 }}>{m.username}</span>
              <span className="tz-mono" style={{ fontSize: 10.5, color: 'var(--mute)' }}>
                added {new Date(m.addedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              {canManage && session?.id === project.userId && (
                <button
                  className="tz-btn tz-btn-ghost"
                  style={{ padding: 4, color: 'var(--red)' }}
                  onClick={() => handleRemove(m.userId)}
                  disabled={busy}
                  title="Remove"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
          {members.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--mute)', padding: '4px 0' }}>No additional members yet.</p>
          )}
        </div>
      </div>

      {/* Integrations */}
      <div className="panel" style={{ padding: 18 }}>
        <PanelSectionHead icon={<LinkIcon size={14} />} gradient="grad-blue" label="Integrations" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { icon: <GitBranch size={13} />, name: 'GitHub',  desc: 'Sync linked PRs to test results',    connected: false },
            { icon: <MessageSquare size={13} />, name: 'Slack', desc: 'Notify channel on failures',        connected: false },
            { icon: <Target size={13} />,    name: 'Jira',    desc: 'Link tickets to stories',           connected: false },
          ].map(({ icon, name, desc, connected }) => (
            <div key={name} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
              background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 9,
            }}>
              <span style={{
                width: 26, height: 26, borderRadius: 7, display: 'grid', placeItems: 'center',
                background: 'color-mix(in oklab, var(--purple) 12%, var(--panel))', color: 'var(--purple)',
                flexShrink: 0,
              }}>
                {icon}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--mute)' }}>{desc}</div>
              </div>
              {connected
                ? <span className="tz-pill green"><Check size={11} /> Connected</span>
                : <button className="tz-btn" style={{ fontSize: 12 }}>Connect</button>}
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone */}
      <div className="panel" style={{ padding: 18, borderColor: 'color-mix(in oklab, var(--red) 30%, var(--border))' }}>
        <PanelSectionHead icon={<AlertTriangle size={14} />} gradient="grad-orange" label="Danger zone" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>Archive project</div>
            <div style={{ fontSize: 12, color: 'var(--mute)', marginTop: 2 }}>
              Hide from the active project list. Reversible.
            </div>
          </div>
          <button className="tz-btn">Archive</button>
        </div>
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
  const expectedCounts = useAllExpectedCounts()
  const failedCounts = useAllFailedCounts()
  const blockedCounts = useAllBlockedCounts()

  const [tab, setTab] = useState<Tab>('overview')
  const [testCases, setTestCases] = useState<CustomTestCase[]>([])
  const [loadingCases, setLoadingCases] = useState(true)
  const [stories, setStories] = useState<Story[]>([])
  const [loadingStories, setLoadingStories] = useState(true)

  const project = projects.find(p => p.id === Number(id))

  useEffect(() => {
    setLoadingCases(true)
    api<CustomTestCase[]>(`/custom-test-cases?projectId=${id}`)
      .then(data => setTestCases(data))
      .catch(() => setTestCases([]))
      .finally(() => setLoadingCases(false))
  }, [id])

  useEffect(() => {
    setLoadingStories(true)
    api<Story[]>(`/stories?projectId=${id}`)
      .then(data => setStories(data))
      .catch(() => setStories([]))
      .finally(() => setLoadingStories(false))
  }, [id])

  const cases = useMemo(() => {
    const counts = { pass: 0, fail: 0, pending: 0, blocked: 0 }
    testCases.forEach(tc => {
      const status = statuses[`custom:${tc.id}`] ?? 'pending'
      counts[status as keyof typeof counts]++
    })
    return counts
  }, [testCases, statuses])

  const loading = projectsLoading || loadingCases || loadingStories

  if (loading) {
    return (
      <div className="page-enter" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', color: 'var(--mute)' }}>
          <div style={{ fontSize: 13 }}>Loading project…</div>
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="page-enter" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <FolderOpen size={40} style={{ color: 'var(--mute)', margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: 17, fontWeight: 600, margin: '0 0 8px', color: 'var(--ink)' }}>Project not found</h2>
          <p style={{ fontSize: 13, color: 'var(--mute)', margin: '0 0 16px' }}>This project doesn't exist or was deleted.</p>
          <button className="tz-btn" onClick={() => navigate({ to: '/projects' })}>
            <ChevronLeft size={14} /> Back to Projects
          </button>
        </div>
      </div>
    )
  }

  const health = HEALTH_META[project.health ?? 'on-track'] ?? HEALTH_META['on-track']
  const total = cases.pass + cases.fail + cases.pending + cases.blocked
  const pct = total > 0 ? Math.round((cases.pass / total) * 100) : 0

  const handleNewStory = () => {
    navigate({ to: '/stories', search: { openCreate: true, projectId: project.id } })
  }
  const handleNewPlan = () => {
    setActiveProjectId(project.id)
    navigate({ to: '/test-cases/custom/new' })
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview',  label: 'Overview',   icon: <Settings size={12} /> },
    { id: 'stories',   label: 'Stories',    icon: <BookOpen size={12} />,   count: stories.length },
    { id: 'tests',     label: 'Test Plans', icon: <Clipboard size={12} />,  count: testCases.length },
    { id: 'activity',  label: 'Activity',   icon: <MessageSquare size={12} /> },
    { id: 'settings',  label: 'Settings',   icon: <Settings size={12} /> },
  ]

  return (
    <div className="page-enter" style={{ position: 'relative' }}>
      {/* ── Sticky project header ─────────────────────────────────── */}
      <div style={{
        position: 'sticky',
        top: 53,
        zIndex: 10,
        background: 'color-mix(in oklab, var(--bg) 90%, transparent)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <div className="shell" style={{ padding: '12px 0' }}>
          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="tz-btn tz-btn-ghost"
              style={{ padding: '4px 8px', gap: 5 }}
              onClick={() => navigate({ to: '/projects' })}
            >
              <ChevronLeft size={12} /> Projects
            </button>
            <span style={{ color: 'var(--mute-2)', fontSize: 13 }}>/</span>
            <div
              className="grad-purple"
              style={{ width: 26, height: 26, borderRadius: 7, display: 'grid', placeItems: 'center', color: 'white', flexShrink: 0 }}
            >
              <FolderOpen size={13} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
              {project.name}
            </span>
            <Pill tone={health.tone}>
              <span style={{ width: 5, height: 5, borderRadius: 999, background: health.color, display: 'inline-block' }} />
              {health.label}
            </Pill>
            <span style={{ flex: 1 }} />
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
            {TABS.map(t => {
              const active = tab === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    border: 0,
                    background: 'transparent',
                    padding: '8px 14px 12px',
                    fontFamily: 'inherit',
                    fontSize: 13,
                    cursor: 'pointer',
                    color: active ? 'var(--ink)' : 'var(--mute)',
                    fontWeight: active ? 600 : 500,
                    borderBottom: active ? '2px solid var(--purple)' : '2px solid transparent',
                    marginBottom: -1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all .15s',
                    letterSpacing: '-0.005em',
                  }}
                >
                  {t.icon}
                  {t.label}
                  {t.count != null && (
                    <span className="tz-mono" style={{ fontSize: 10.5, color: active ? 'var(--purple)' : 'var(--mute)' }}>
                      {t.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Tab content ───────────────────────────────────────────── */}
      <div className="shell" style={{ paddingTop: 22 }}>
        {tab === 'overview' && (
          <OverviewTab
            project={project}
            testCases={testCases}
            stories={stories}
            cases={cases}
            statuses={statuses}
            navigate={navigate}
            onNewStory={handleNewStory}
            onNewPlan={handleNewPlan}
          />
        )}
        {tab === 'stories' && (
          <StoriesTab stories={stories} navigate={navigate} onNewStory={handleNewStory} />
        )}
        {tab === 'tests' && (
          <TestPlansTab testCases={testCases} statuses={statuses} navigate={navigate} onNewPlan={handleNewPlan} />
        )}
        {tab === 'activity' && <ActivityTab projectId={project.id} />}
        {tab === 'settings' && <SettingsTab project={project} />}
      </div>
    </div>
  )
}
